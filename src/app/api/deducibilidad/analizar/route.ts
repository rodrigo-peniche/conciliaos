import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analizarCfdi } from "@/lib/deducibilidad/deducibilidad.service";

/**
 * POST /api/deducibilidad/analizar — Analizar deducibilidad de un CFDI
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

    const { cfdiId, empresaId } = await request.json();

    if (!cfdiId || !empresaId) {
      return NextResponse.json(
        { error: "cfdiId y empresaId son requeridos" },
        { status: 400 }
      );
    }

    const resultado = await analizarCfdi(cfdiId, empresaId);

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Error en /api/deducibilidad/analizar:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
