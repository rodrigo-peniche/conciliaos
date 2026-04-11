import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCfdiXml } from "@/lib/sat/cfdi-parser";

/**
 * POST /api/cfdis/upload — Upload XML files and parse/insert CFDIs
 * Accepts multipart form data with XML files and empresaId
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

    const formData = await request.formData();
    const empresaId = formData.get("empresaId") as string;

    if (!empresaId) {
      return NextResponse.json(
        { error: "empresaId es requerido" },
        { status: 400 }
      );
    }

    // Get all files from form data
    const files: File[] = [];
    for (const [, value] of formData.entries()) {
      if (value instanceof File && value.name.toLowerCase().endsWith(".xml")) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No se encontraron archivos XML" },
        { status: 400 }
      );
    }

    const results = {
      total: files.length,
      insertados: 0,
      actualizados: 0,
      errores: [] as string[],
    };

    for (const file of files) {
      try {
        const xmlText = await file.text();
        const parsed = await parseCfdiXml(xmlText);

        const cfdiData = {
          empresa_id: empresaId,
          ...parsed.cfdi,
          xml_raw: xmlText.length < 50000 ? xmlText : null,
        };

        const { error } = await supabase
          .from("cfdis" as never)
          .upsert(cfdiData as never, { onConflict: "uuid" });

        if (error) {
          results.errores.push(`${file.name}: ${error.message}`);
        } else {
          results.insertados++;
        }
      } catch (err) {
        results.errores.push(
          `${file.name}: ${err instanceof Error ? err.message : "Error desconocido"}`
        );
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error en /api/cfdis/upload:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
