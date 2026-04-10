/**
 * Servicio de deducibilidad — orquesta reglas + IA + persistencia
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { evaluarDeducibilidad, generarDocumentosFaltantes } from "./reglas";
import { analizarConIA, type AnalisisIA } from "./analizador-ia";
import type { ResultadoDeducibilidad } from "@/lib/types/conciliaos.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

/**
 * Analiza la deducibilidad de un CFDI individual
 */
export async function analizarCfdi(
  cfdiId: string,
  empresaId: string
): Promise<ResultadoDeducibilidad> {
  const supabase = await createClient();

  // Obtener CFDI
  const { data: cfdi } = (await supabase
    .from("cfdis" as never)
    .select("*")
    .eq("id", cfdiId)
    .single()) as { data: Cfdi | null };

  if (!cfdi) throw new Error("CFDI no encontrado");

  // Obtener empresa
  const { data: empresa } = (await supabase
    .from("empresas" as never)
    .select("*")
    .eq("id", empresaId)
    .single()) as { data: Empresa | null };

  if (!empresa) throw new Error("Empresa no encontrada");

  // 1. Evaluar con motor de reglas
  const { reglaAplicada, resultado: resultadoRegla } = evaluarDeducibilidad(
    cfdi,
    empresa
  );

  let analisisIA: AnalisisIA | null = null;

  // 2. Si la regla requiere IA, analizar con Claude
  if (resultadoRegla.requiereIA) {
    analisisIA = await analizarConIA(cfdi, empresa);
  }

  // 3. Determinar resultado final
  const esDeducible = resultadoRegla.requiereIA
    ? (analisisIA?.es_deducible ?? true)
    : resultadoRegla.deducible;

  const porcentaje = resultadoRegla.requiereIA
    ? (analisisIA?.porcentaje ?? 100)
    : resultadoRegla.pct;

  const montoDeducible = (cfdi.total * porcentaje) / 100;
  const montoNoDeducible = cfdi.total - montoDeducible;

  const fundamentoLegal = resultadoRegla.requiereIA
    ? (analisisIA?.fundamento ?? reglaAplicada?.articuloLey ?? "")
    : (reglaAplicada?.articuloLey ?? "");

  const razonamiento = resultadoRegla.requiereIA
    ? (analisisIA?.razonamiento ?? reglaAplicada?.descripcion ?? "")
    : (reglaAplicada?.descripcion ?? "");

  const documentosRecomendados = resultadoRegla.requiereIA
    ? (analisisIA?.documentos_recomendados ?? [])
    : resultadoRegla.requiereDocumento
    ? [resultadoRegla.requiereDocumento]
    : [];

  const alerta = resultadoRegla.requiereIA
    ? (analisisIA?.alerta ?? null)
    : null;

  // 4. Persistir resultado en el CFDI
  await supabase
    .from("cfdis" as never)
    .update({
      es_deducible: esDeducible,
      deducible_pct: porcentaje,
      deducible_monto: montoDeducible,
      no_deducible_monto: montoNoDeducible,
      deducibilidad_motivo: fundamentoLegal,
      deducibilidad_ia_analisis: analisisIA
        ? JSON.stringify(analisisIA)
        : null,
      deducibilidad_revisada_at: new Date().toISOString(),
    } as never)
    .eq("id", cfdiId);

  return {
    esDeducible,
    porcentaje,
    montoDeducible,
    montoNoDeducible,
    fundamentoLegal,
    razonamiento,
    documentosRecomendados,
    alerta,
    requiereRevision: resultadoRegla.requiereIA || porcentaje < 100,
  };
}

/**
 * Analiza un batch de CFDIs
 */
export async function analizarBatch(
  cfdiIds: string[],
  empresaId: string
): Promise<Map<string, ResultadoDeducibilidad>> {
  const resultados = new Map<string, ResultadoDeducibilidad>();

  // Procesar secuencialmente para evitar rate limits
  for (const cfdiId of cfdiIds) {
    try {
      const resultado = await analizarCfdi(cfdiId, empresaId);
      resultados.set(cfdiId, resultado);
    } catch (error) {
      console.error(`Error analizando CFDI ${cfdiId}:`, error);
    }
  }

  return resultados;
}
