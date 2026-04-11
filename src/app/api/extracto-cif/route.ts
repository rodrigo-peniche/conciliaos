import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No se envió archivo" },
        { status: 400 }
      );
    }

    const apiKey = process.env.CONCILIAOS_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
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
              text: `Este es una Constancia de Situación Fiscal (CIF/CSF) del SAT de México.

Extrae los siguientes datos exactamente como aparecen en el documento:

1. RFC (incluye homoclave)
2. Razón Social o Nombre completo
3. Régimen Fiscal - el código numérico de 3 dígitos (ejemplo: 601, 603, 605, 606, 612, 621, 625, 626)
4. Código Postal del domicilio fiscal (5 dígitos)
5. Nombre Comercial (si aparece, sino dejar vacío)
6. Actividades Económicas (lista de actividades registradas ante el SAT)

Responde ÚNICAMENTE con un JSON válido, sin markdown, sin backticks, con esta estructura exacta:
{
  "rfc": "",
  "razon_social": "",
  "regimen_codigo": "",
  "codigo_postal": "",
  "nombre_comercial": "",
  "actividades": []
}`,
            },
          ],
        },
      ],
    });

    const textoRespuesta =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response
    try {
      // Clean up response - remove potential markdown backticks
      const cleaned = textoRespuesta
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const datos = JSON.parse(cleaned);
      return NextResponse.json({ datos });
    } catch {
      return NextResponse.json(
        { error: "No se pudo interpretar el documento. Verifica que sea un CIF/CSF válido.", raw: textoRespuesta },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("Error extrayendo datos del CIF:", error);
    return NextResponse.json(
      { error: "Error al procesar el documento" },
      { status: 500 }
    );
  }
}
