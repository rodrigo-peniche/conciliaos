/**
 * Motor de matching automático para conciliación bancaria ↔ CFDIs
 * Implementa scoring basado en monto (50%), fecha (30%) y RFC (20%)
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Movimiento = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];
type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

export interface CandidatoMatch {
  movimientoId: string;
  cfdiId: string;
  score: number;
  scoreMonto: number;
  scoreFecha: number;
  scoreRfc: number;
  diferenciaMonto: number;
  diferenciaDias: number;
  tipo: "match_exacto" | "match_fuzzy";
}

export interface ResultadoMatching {
  conciliacionId: string;
  totalMovimientos: number;
  totalCfdis: number;
  matchesExactos: number;
  matchesFuzzy: number;
  sinMatch: number;
  partidas: CandidatoMatch[];
}

// Thresholds
const SCORE_AUTO = 0.85;
const SCORE_FUZZY = 0.60;

/**
 * Calcula score de matching entre un movimiento y un CFDI
 * Replica la lógica de calcular_score_matching() de PostgreSQL
 */
export function calcularScore(
  movimiento: { importe: number; fecha: string; rfcContraparte: string | null },
  cfdi: { total: number; fechaEmision: string; rfcEmisor: string }
): { score: number; scoreMonto: number; scoreFecha: number; scoreRfc: number; diffMonto: number; diffDias: number } {
  let scoreMonto = 0;
  let scoreFecha = 0;
  let scoreRfc = 0;

  // Score por monto (peso 50%)
  const montoMov = Math.abs(movimiento.importe);
  const montoCfdi = Math.abs(cfdi.total);
  const diffMonto = Math.abs(montoMov - montoCfdi);
  const diffPct = montoCfdi > 0 ? diffMonto / montoCfdi : diffMonto;

  if (diffPct === 0) scoreMonto = 0.50;
  else if (diffPct < 0.01) scoreMonto = 0.40;
  else if (diffPct < 0.05) scoreMonto = 0.25;

  // Score por fecha (peso 30%)
  const fechaMov = new Date(movimiento.fecha);
  const fechaCfdi = new Date(cfdi.fechaEmision);
  const diffDias = Math.abs(
    Math.round((fechaMov.getTime() - fechaCfdi.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (diffDias === 0) scoreFecha = 0.30;
  else if (diffDias <= 3) scoreFecha = 0.20;
  else if (diffDias <= 10) scoreFecha = 0.10;

  // Score por RFC (peso 20%)
  if (movimiento.rfcContraparte && cfdi.rfcEmisor) {
    const rfcMov = movimiento.rfcContraparte.toUpperCase().trim();
    const rfcCfdi = cfdi.rfcEmisor.toUpperCase().trim();
    if (rfcMov === rfcCfdi) {
      scoreRfc = 0.20;
    } else if (similaridadRFC(rfcMov, rfcCfdi) > 0.7) {
      scoreRfc = 0.10;
    }
  }

  const score = Math.round((scoreMonto + scoreFecha + scoreRfc) * 10000) / 10000;
  return { score, scoreMonto, scoreFecha, scoreRfc, diffMonto, diffDias };
}

/**
 * Similaridad simple entre dos RFCs (Jaccard sobre caracteres)
 */
function similaridadRFC(a: string, b: string): number {
  if (!a || !b) return 0;
  const setA = new Set(a.split(""));
  const setB = new Set(b.split(""));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Ejecuta el motor de matching para una empresa en un periodo dado.
 * Retorna las partidas generadas sin insertar en BD (eso lo hace el service).
 */
export async function ejecutarMatching(
  empresaId: string,
  periodoInicio: string,
  periodoFin: string
): Promise<CandidatoMatch[]> {
  const supabase = await createClient();

  // 1. Obtener movimientos sin conciliar del periodo
  const { data: movimientos } = (await supabase
    .from("movimientos_bancarios" as never)
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("estado_conciliacion", "pendiente")
    .gte("fecha", periodoInicio)
    .lte("fecha", periodoFin)
    .order("fecha", { ascending: true })) as { data: Movimiento[] | null };

  if (!movimientos || movimientos.length === 0) return [];

  // 2. Obtener CFDIs no conciliados del periodo ±30 días
  const inicio30 = new Date(periodoInicio);
  inicio30.setDate(inicio30.getDate() - 30);
  const fin30 = new Date(periodoFin);
  fin30.setDate(fin30.getDate() + 30);

  const { data: cfdis } = (await supabase
    .from("cfdis" as never)
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("conciliado", false)
    .eq("estado_sat", "vigente")
    .gte("fecha_emision", inicio30.toISOString().split("T")[0])
    .lte("fecha_emision", fin30.toISOString().split("T")[0])
    .order("fecha_emision", { ascending: true })) as { data: Cfdi[] | null };

  if (!cfdis || cfdis.length === 0) return [];

  // 3. Calcular scores para cada par movimiento-CFDI
  const candidatos: CandidatoMatch[] = [];
  const cfdisUsados = new Set<string>();
  const movsUsados = new Set<string>();

  // Para cada movimiento, buscar el mejor CFDI candidato
  const pares: { movId: string; cfdiId: string; score: number; data: CandidatoMatch }[] = [];

  for (const mov of movimientos) {
    for (const cfdi of cfdis) {
      // Filtrar: cargos contra egresos/pagos, abonos contra ingresos
      const esCargo = mov.tipo === "cargo" || mov.importe < 0;
      const esEgreso = cfdi.tipo === "egreso" || cfdi.tipo === "pago";
      const esIngreso = cfdi.tipo === "ingreso";
      const esAbono = mov.tipo === "abono" || mov.importe > 0;

      // Cargos bancarios → CFDIs de egreso/pago (facturas recibidas)
      // Abonos bancarios → CFDIs de ingreso (facturas emitidas)
      if ((esCargo && !esEgreso) && (esAbono && !esIngreso)) continue;

      const { score, scoreMonto, scoreFecha, scoreRfc, diffMonto, diffDias } =
        calcularScore(
          { importe: mov.importe, fecha: mov.fecha, rfcContraparte: mov.rfc_contraparte },
          { total: cfdi.total, fechaEmision: cfdi.fecha_emision, rfcEmisor: cfdi.emisor_rfc }
        );

      if (score >= SCORE_FUZZY) {
        pares.push({
          movId: mov.id,
          cfdiId: cfdi.id,
          score,
          data: {
            movimientoId: mov.id,
            cfdiId: cfdi.id,
            score,
            scoreMonto,
            scoreFecha,
            scoreRfc,
            diferenciaMonto: diffMonto,
            diferenciaDias: diffDias,
            tipo: score >= SCORE_AUTO ? "match_exacto" : "match_fuzzy",
          },
        });
      }
    }
  }

  // 4. Asignación greedy: ordenar por score descendente, asignar 1:1
  pares.sort((a, b) => b.score - a.score);

  for (const par of pares) {
    if (movsUsados.has(par.movId) || cfdisUsados.has(par.cfdiId)) continue;
    movsUsados.add(par.movId);
    cfdisUsados.add(par.cfdiId);
    candidatos.push(par.data);
  }

  return candidatos;
}
