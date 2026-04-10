import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type SatSyncJobInsert = Database["public"]["Tables"]["sat_sync_jobs"]["Insert"];
type SatSyncJob = Database["public"]["Tables"]["sat_sync_jobs"]["Row"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { empresaId, fechaInicio, fechaFin, tipo } = body;

    if (!empresaId || !fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: "empresaId, fechaInicio y fechaFin son requeridos" },
        { status: 400 }
      );
    }

    // Crear registro de sincronización
    const insertData: SatSyncJobInsert = {
      empresa_id: empresaId,
      tipo: tipo === "emitidos" ? "cfdi_emitidos" : "cfdi_recibidos",
      estado: "pendiente",
      fecha_inicio_descarga: fechaInicio,
      fecha_fin_descarga: fechaFin,
      iniciado_por: user.id,
    };

    const { data: job, error: jobError } = await supabase
      .from("sat_sync_jobs" as never)
      .insert(insertData as never)
      .select()
      .single() as { data: SatSyncJob | null; error: unknown };

    if (jobError || !job) {
      console.error("Error al crear job:", jobError);
      return NextResponse.json(
        { error: "Error al crear trabajo de sincronización" },
        { status: 500 }
      );
    }

    // TODO: En producción, encolar en BullMQ para procesamiento en background
    // await satSyncQueue.add('sat-sync', { jobId: job.id, empresaId, fechaInicio, fechaFin, tipo });

    return NextResponse.json({
      jobId: job.id,
      estado: "pendiente",
      mensaje:
        "Sincronización encolada. Usa /api/sat/status/{jobId} para seguimiento.",
    });
  } catch (error) {
    console.error("Error en /api/sat/sync:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
