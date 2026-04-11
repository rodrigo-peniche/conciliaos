import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const extractedTexts = formData.get("extractedTexts") as string | null;

    const apiKey = process.env.CONCILIAOS_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Mode 1: Single PDF extraction (called per file)
    if (files.length === 1 && !extractedTexts) {
      const file = files[0];
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64,
                },
              },
              {
                type: "text",
                text: `Este es un documento legal/notarial de una empresa mexicana (acta constitutiva, modificación, poder, etc.).

Extrae el contenido relevante sobre el OBJETO SOCIAL de la empresa. Si el documento modifica el objeto social, extrae la modificación. Si no contiene información sobre el objeto social, responde "SIN_OBJETO_SOCIAL" y un breve resumen de qué trata el documento.

Responde solo con el texto extraído, sin encabezados.`,
              },
            ],
          },
        ],
      });

      const texto =
        response.content[0].type === "text" ? response.content[0].text : "";
      return NextResponse.json({ texto, fileName: file.name });
    }

    // Mode 2: Combine all extracted texts into final objeto social
    if (extractedTexts) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `A continuación están los extractos de múltiples documentos legales de una empresa mexicana (actas constitutivas y sus modificaciones):

${extractedTexts}

Con base en todos estos documentos, genera el OBJETO SOCIAL VIGENTE de la empresa, considerando:
- Si hay múltiples versiones, el objeto social más reciente prevalece.
- Si un acta modifica parcialmente, integra los cambios.
- Devuelve el objeto social completo y vigente en un solo texto corrido.
- Si no hay un objeto social claro, describe las actividades económicas mencionadas.
- Responde SOLO con el texto del objeto social, sin encabezados ni explicaciones.`,
          },
        ],
      });

      const objetoSocial =
        response.content[0].type === "text" ? response.content[0].text : "";
      return NextResponse.json({ objetoSocial });
    }

    return NextResponse.json(
      { error: "No se enviaron archivos ni textos" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Error extrayendo objeto social:", error);
    const message =
      error instanceof Error ? error.message : "Error al procesar los documentos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
