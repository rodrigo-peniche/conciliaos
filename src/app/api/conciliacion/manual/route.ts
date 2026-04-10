import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { conciliarManual, resolverPartida } from "@/lib/conciliacion/conciliacion.service";

/**
 * POST /api/conciliacion/manual — Conciliación manual o resolución de partida
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

    const body = await request.json();

    // Caso 1: Conciliación manual (drag & drop)
    if (body.conciliacionId && body.movimientoId && body.cfdiId) {
      await conciliarManual(
        body.conciliacionId,
        body.movimientoId,
        body.cfdiId,
        user.id
      );
      return NextResponse.json({ ok: true, tipo: "manual" });
    }

    // Caso 2: Resolver partida fuzzy
    if (body.partidaId && body.accion) {
      await resolverPartida(body.partidaId, body.accion, user.id, body.nota);
      return NextResponse.json({ ok: true, tipo: "resolucion" });
    }

    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error en /api/conciliacion/manual:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
