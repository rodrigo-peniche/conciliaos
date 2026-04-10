import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  obtenerOCrearConciliacion,
  ejecutarAutoConciliacion,
} from "@/lib/conciliacion/conciliacion.service";

/**
 * POST /api/conciliacion — Crear conciliación y ejecutar auto-matching
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { empresaId, cuentaId, periodoInicio, periodoFin } =
      await request.json();

    if (!empresaId || !cuentaId || !periodoInicio || !periodoFin) {
      return NextResponse.json(
        { error: "empresaId, cuentaId, periodoInicio y periodoFin son requeridos" },
        { status: 400 }
      );
    }

    // 1. Crear o recuperar conciliación
    const conciliacion = await obtenerOCrearConciliacion(
      empresaId,
      cuentaId,
      periodoInicio,
      periodoFin,
      user.id
    );

    // 2. Ejecutar auto-matching
    const resumen = await ejecutarAutoConciliacion(
      conciliacion.id,
      empresaId,
      periodoInicio,
      periodoFin
    );

    return NextResponse.json(resumen);
  } catch (error) {
    console.error("Error en /api/conciliacion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/conciliacion?empresaId=...&cuentaId=...&periodoInicio=...&periodoFin=...
 * Obtener datos de conciliación existente
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresaId");
    const cuentaId = searchParams.get("cuentaId");
    const periodoInicio = searchParams.get("periodoInicio");
    const periodoFin = searchParams.get("periodoFin");

    if (!empresaId) {
      return NextResponse.json(
        { error: "empresaId es requerido" },
        { status: 400 }
      );
    }

    // Obtener movimientos del periodo
    let movQuery = supabase
      .from("movimientos_bancarios" as never)
      .select("*")
      .eq("empresa_id", empresaId)
      .order("fecha", { ascending: true });

    if (cuentaId) movQuery = movQuery.eq("cuenta_id", cuentaId);
    if (periodoInicio) movQuery = movQuery.gte("fecha", periodoInicio);
    if (periodoFin) movQuery = movQuery.lte("fecha", periodoFin);

    const { data: movimientos } = await movQuery;

    // Obtener CFDIs del periodo
    let cfdiQuery = supabase
      .from("cfdis" as never)
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("estado_sat", "vigente")
      .order("fecha_emision", { ascending: true });

    if (periodoInicio) cfdiQuery = cfdiQuery.gte("fecha_emision", periodoInicio);
    if (periodoFin) cfdiQuery = cfdiQuery.lte("fecha_emision", periodoFin);

    const { data: cfdis } = await cfdiQuery;

    // Obtener partidas si hay conciliación
    let partidas = null;
    if (cuentaId && periodoInicio && periodoFin) {
      const { data: conc } = await supabase
        .from("conciliaciones" as never)
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("cuenta_id", cuentaId)
        .eq("periodo_inicio", periodoInicio)
        .eq("periodo_fin", periodoFin)
        .single();

      if (conc) {
        const { data: parts } = await supabase
          .from("conciliacion_partidas" as never)
          .select("*")
          .eq("conciliacion_id", (conc as { id: string }).id);

        partidas = parts;
      }
    }

    return NextResponse.json({
      movimientos: movimientos || [],
      cfdis: cfdis || [],
      partidas: partidas || [],
    });
  } catch (error) {
    console.error("Error en GET /api/conciliacion:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
