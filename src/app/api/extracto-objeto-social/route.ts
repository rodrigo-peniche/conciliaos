import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Allow larger uploads and longer execution
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json(
        { error: "No se enviaron archivos" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada" },
        { status: 500 }
      );
    }

    // Check total size - limit to 20MB total
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Los archivos exceden 20MB en total. Intenta con menos archivos." },
        { status: 400 }
      );
    }

    // Convert PDFs to base64 for Claude
    const pdfContents: { name: string; base64: string }[] = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      pdfContents.push({ name: file.name, base64 });
    }

    const anthropic = new Anthropic({ apiKey });

    // Build content blocks: one PDF document per file
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    for (const pdf of pdfContents) {
      content.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: pdf.base64,
        },
      });
      content.push({
        type: "text",
        text: `[Archivo: ${pdf.name}]`,
      });
    }

    content.push({
      type: "text",
      text: `Analiza los documentos PDF anteriores. Son actas constitutivas y/o sus modificaciones de una empresa mexicana.

Extrae ÚNICAMENTE el objeto social vigente de la empresa, considerando todas las modificaciones.

Reglas:
- Si hay múltiples documentos, el objeto social más reciente prevalece sobre los anteriores.
- Si un acta modifica parcialmente el objeto social, integra los cambios.
- Devuelve el objeto social completo y vigente en un solo texto corrido.
- Si no encuentras un objeto social claro, indica qué actividades económicas se mencionan.
- Responde SOLO con el texto del objeto social, sin encabezados ni explicaciones adicionales.`,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    });

    const textoExtraido =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ objetoSocial: textoExtraido });
  } catch (error: unknown) {
    console.error("Error extrayendo objeto social:", error);
    const message =
      error instanceof Error ? error.message : "Error al procesar los documentos";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
