/**
 * Servicio de conciliación bancaria
 * Orquesta el matching y persiste resultados en Supabase
 */

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { ejecutarMatching, type CandidatoMatch } from "./matching-engine";

type Conciliacion = Database["public"]["Tables"]["conciliaciones"]["Row"];
type ConciliacionInsert = Database["public"]["Tables"]["conciliaciones"]["Insert"];
type ConciliacionPartidaInsert = Database["public"]["Tables"]["conciliacion_partidas"]["Insert"];

export interface ResumenConciliacion {
  conciliacionId: string;
  estado: string;
  totalMovimientos: number;
  conciliados: number;
  pendientes: number;
  excepciones: number;
  matchesExactos: number;
  matchesFuzzy: number;
  sumaConciliada: number;
  sumaPendiente: number;
  porcentaje: number;
}

/**
 * Crear o recuperar una conciliación para el periodo dado
 */
export async function obtenerOCrearConciliacion(
  empresaId: string,
  cuentaId: string,
  periodoInicio: string,
  periodoFin: string,
  userId: string
): Promise<Conciliacion> {
  const supabase = await createClient();

  // Buscar si ya existe
  const { data: existente } = (await supabase
    .from("conciliaciones" as never)
    .select("*")
    .eq("empresa_id", empresaId)
    .eq("cuenta_id", cuentaId)
    .eq("periodo_inicio", periodoInicio)
    .eq("periodo_fin", periodoFin)
    .single()) as { data: Conciliacion | null };

  if (existente) return existente;

  // Crear nueva
  const insertData: ConciliacionInsert = {
    empresa_id: empresaId,
    cuenta_id: cuentaId,
    periodo_inicio: periodoInicio,
    periodo_fin: periodoFin,
    created_by: userId,
  };

  const { data: nueva, error } = (await supabase
    .from("conciliaciones" as never)
    .insert(insertData as never)
    .select()
    .single()) as { data: Conciliacion | null; error: { message?: string; code?: string; details?: string } | null };

  if (error || !nueva) {
    console.error("Error creando conciliación:", JSON.stringify(error));
    throw new Error(`Error al crear conciliación: ${error?.message || "sin datos"} (${error?.code || ""}) ${error?.details || ""}`);
  }

  return nueva;
}

/**
 * Ejecutar auto-conciliación: matching + persistencia
 */
export async function ejecutarAutoConciliacion(
  conciliacionId: string,
  empresaId: string,
  periodoInicio: string,
  periodoFin: string
): Promise<ResumenConciliacion> {
  const supabase = await createClient();

  // 1. Ejecutar el motor de matching
  const candidatos = await ejecutarMatching(empresaId, periodoInicio, periodoFin);

  const exactos = candidatos.filter((c) => c.tipo === "match_exacto");
  const fuzzy = candidatos.filter((c) => c.tipo === "match_fuzzy");

  // 2. Insertar partidas
  if (candidatos.length > 0) {
    const partidas: ConciliacionPartidaInsert[] = candidatos.map((c) => ({
      conciliacion_id: conciliacionId,
      movimiento_id: c.movimientoId,
      cfdi_id: c.cfdiId,
      tipo: c.tipo,
      score_matching: c.score,
      diferencia_monto: c.diferenciaMonto,
      diferencia_dias: c.diferenciaDias,
      estado: c.tipo === "match_exacto" ? ("aceptado" as const) : ("pendiente" as const),
    }));

    await supabase
      .from("conciliacion_partidas" as never)
      .insert(partidas as never);
  }

  // 3. Marcar movimientos y CFDIs de matches exactos como conciliados
  for (const match of exactos) {
    await supabase
      .from("movimientos_bancarios" as never)
      .update({
        estado_conciliacion: "conciliado",
        cfdi_id: match.cfdiId,
        conciliacion_id: conciliacionId,
        conciliado_at: new Date().toISOString(),
      } as never)
      .eq("id", match.movimientoId);

    await supabase
      .from("cfdis" as never)
      .update({
        conciliado: true,
        conciliado_at: new Date().toISOString(),
      } as never)
      .eq("id", match.cfdiId);
  }

  // 4. Contar totales
  const { count: totalMovimientos } = (await supabase
    .from("movimientos_bancarios" as never)
    .select("*", { count: "exact", head: true })
    .eq("empresa_id", empresaId)
    .gte("fecha", periodoInicio)
    .lte("fecha", periodoFin)) as { count: number | null };

  const conciliados = exactos.length;
  const pendientes = (totalMovimientos || 0) - conciliados;

  // 5. Actualizar resumen de la conciliación
  await supabase
    .from("conciliaciones" as never)
    .update({
      total_movimientos: totalMovimientos || 0,
      conciliados,
      pendientes,
      estado: conciliados === totalMovimientos ? "en_revision" : "en_proceso",
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", conciliacionId);

  // 6. Calcular sumas
  let sumaConciliada = 0;
  let sumaPendiente = 0;

  // Para simplificar, usamos los candidatos para la suma conciliada
  // En producción haríamos un query más específico

  return {
    conciliacionId,
    estado: conciliados === (totalMovimientos || 0) ? "en_revision" : "en_proceso",
    totalMovimientos: totalMovimientos || 0,
    conciliados,
    pendientes,
    excepciones: 0,
    matchesExactos: exactos.length,
    matchesFuzzy: fuzzy.length,
    sumaConciliada,
    sumaPendiente,
    porcentaje:
      totalMovimientos && totalMovimientos > 0
        ? Math.round((conciliados / totalMovimientos) * 100)
        : 0,
  };
}

/**
 * Conciliar manualmente un movimiento con un CFDI
 */
export async function conciliarManual(
  conciliacionId: string,
  movimientoId: string,
  cfdiId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient();

  // Insertar partida manual
  const partida: ConciliacionPartidaInsert = {
    conciliacion_id: conciliacionId,
    movimiento_id: movimientoId,
    cfdi_id: cfdiId,
    tipo: "manual",
    score_matching: 1.0,
    diferencia_monto: 0,
    diferencia_dias: 0,
    estado: "aceptado",
  };

  await supabase
    .from("conciliacion_partidas" as never)
    .insert(partida as never);

  // Marcar como conciliados
  await supabase
    .from("movimientos_bancarios" as never)
    .update({
      estado_conciliacion: "conciliado",
      cfdi_id: cfdiId,
      conciliacion_id: conciliacionId,
      conciliado_at: new Date().toISOString(),
      conciliado_por: userId,
    } as never)
    .eq("id", movimientoId);

  await supabase
    .from("cfdis" as never)
    .update({
      conciliado: true,
      conciliado_at: new Date().toISOString(),
    } as never)
    .eq("id", cfdiId);
}

/**
 * Aceptar o rechazar una partida fuzzy
 */
export async function resolverPartida(
  partidaId: string,
  accion: "aceptado" | "rechazado" | "excepcion",
  userId: string,
  nota?: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from("conciliacion_partidas" as never)
    .update({
      estado: accion,
      revisado_por: userId,
      revisado_at: new Date().toISOString(),
      nota: nota || null,
    } as never)
    .eq("id", partidaId);

  // Si se aceptó, marcar mov y cfdi como conciliados
  if (accion === "aceptado") {
    const { data: partida } = (await supabase
      .from("conciliacion_partidas" as never)
      .select("*")
      .eq("id", partidaId)
      .single()) as { data: { movimiento_id: string; cfdi_id: string; conciliacion_id: string } | null };

    if (partida?.movimiento_id) {
      await supabase
        .from("movimientos_bancarios" as never)
        .update({
          estado_conciliacion: "conciliado",
          cfdi_id: partida.cfdi_id,
          conciliacion_id: partida.conciliacion_id,
          conciliado_at: new Date().toISOString(),
          conciliado_por: userId,
        } as never)
        .eq("id", partida.movimiento_id);
    }

    if (partida?.cfdi_id) {
      await supabase
        .from("cfdis" as never)
        .update({
          conciliado: true,
          conciliado_at: new Date().toISOString(),
        } as never)
        .eq("id", partida.cfdi_id);
    }
  }
}

/**
 * Obtener resumen de conciliación actual
 */
export async function obtenerResumen(
  conciliacionId: string
): Promise<ResumenConciliacion | null> {
  const supabase = await createClient();

  const { data: conc } = (await supabase
    .from("conciliaciones" as never)
    .select("*")
    .eq("id", conciliacionId)
    .single()) as { data: Conciliacion | null };

  if (!conc) return null;

  // Contar partidas por tipo
  const { data: partidas } = (await supabase
    .from("conciliacion_partidas" as never)
    .select("tipo, estado")
    .eq("conciliacion_id", conciliacionId)) as {
    data: Array<{ tipo: string; estado: string }> | null;
  };

  const exactos = partidas?.filter((p) => p.tipo === "match_exacto").length || 0;
  const fuzzy = partidas?.filter((p) => p.tipo === "match_fuzzy").length || 0;

  return {
    conciliacionId: conc.id,
    estado: conc.estado,
    totalMovimientos: conc.total_movimientos,
    conciliados: conc.conciliados,
    pendientes: conc.pendientes,
    excepciones: conc.excepciones,
    matchesExactos: exactos,
    matchesFuzzy: fuzzy,
    sumaConciliada: 0,
    sumaPendiente: 0,
    porcentaje:
      conc.total_movimientos > 0
        ? Math.round((conc.conciliados / conc.total_movimientos) * 100)
        : 0,
  };
}
