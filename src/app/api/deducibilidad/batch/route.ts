import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analizarBatch } from "@/lib/deducibilidad/deducibilidad.service";

/**
 * POST /api/deducibilidad/batch — Analizar deducibilidad de múltiples CFDIs
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

    const { cfdiIds, empresaId } = await request.json();

    if (!cfdiIds || !Array.isArray(cfdiIds) || !empresaId) {
      return NextResponse.json(
        { error: "cfdiIds (array) y empresaId son requeridos" },
        { status: 400 }
      );
    }

    if (cfdiIds.length > 50) {
      return NextResponse.json(
        { error: "Máximo 50 CFDIs por batch" },
        { status: 400 }
      );
    }

    const resultados = await analizarBatch(cfdiIds, empresaId);

    // Convertir Map a objeto plano para JSON
    const resultadosObj: Record<string, unknown> = {};
    resultados.forEach((v, k) => {
      resultadosObj[k] = v;
    });

    return NextResponse.json({
      total: cfdiIds.length,
      analizados: resultados.size,
      resultados: resultadosObj,
    });
  } catch (error) {
    console.error("Error en /api/deducibilidad/batch:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
