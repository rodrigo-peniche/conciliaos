import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const cuentaId = formData.get("cuentaId") as string | null;
    const empresaId = formData.get("empresaId") as string | null;
    const tipoCuenta = formData.get("tipoCuenta") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió archivo" }, { status: 400 });
    }
    if (!cuentaId || !empresaId) {
      return NextResponse.json({ error: "cuentaId y empresaId son requeridos" }, { status: 400 });
    }

    const apiKey = process.env.CONCILIAOS_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY no configurada" }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16000,
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
              text: `Analiza este estado de cuenta bancario mexicano y extrae TODOS los movimientos/transacciones.

Para cada movimiento extrae:
- fecha: en formato YYYY-MM-DD
- referencia: número de referencia o folio
- descripcion: descripción del movimiento
- cargo: monto del cargo (débito/retiro) como número positivo, o 0 si no aplica
- abono: monto del abono (crédito/depósito) como número positivo, o 0 si no aplica
- saldo: saldo resultante después del movimiento (si está disponible, sino null)

Responde SOLO con un JSON válido con esta estructura exacta, sin texto adicional:
{
  "banco": "nombre del banco detectado",
  "periodo": "periodo del estado de cuenta",
  "saldo_inicial": 0,
  "saldo_final": 0,
  "movimientos": [
    {
      "fecha": "2026-01-15",
      "referencia": "123456",
      "descripcion": "TRANSFERENCIA SPEI",
      "cargo": 0,
      "abono": 5000.00,
      "saldo": 15000.00
    }
  ]
}

IMPORTANTE:
- Los montos deben ser números (no strings)
- Las fechas en formato YYYY-MM-DD
- Incluir TODOS los movimientos sin excepción
- Si no puedes determinar el saldo de un movimiento, usa null
- Cargo es dinero que SALE, abono es dinero que ENTRA
${tipoCuenta ? `- El PDF puede contener varias cuentas. SOLO extrae los movimientos de la cuenta tipo "${tipoCuenta}". Ignora las demás cuentas.` : "- Si el PDF contiene varias cuentas, extrae SOLO los movimientos de la PRIMERA cuenta."}
- Responde SOLO con JSON válido, sin texto antes ni después`,
            },
          ],
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No se pudo procesar el PDF" }, { status: 500 });
    }

    // Extraer JSON de la respuesta
    let jsonStr = textContent.text.trim();
    // Remover markdown code block si existe
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Si el JSON está truncado, intentar repararlo
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Intentar cerrar el JSON truncado
      // Buscar el último objeto completo en el array de movimientos
      const lastCompleteObj = jsonStr.lastIndexOf("}");
      if (lastCompleteObj > 0) {
        let repaired = jsonStr.substring(0, lastCompleteObj + 1);
        // Cerrar el array y el objeto raíz
        if (!repaired.endsWith("]}")) {
          repaired += "]}";
        }
        try {
          parsed = JSON.parse(repaired);
        } catch {
          return NextResponse.json({ error: "El estado de cuenta es demasiado largo. Intenta con un periodo más corto." }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: "No se pudo procesar la respuesta del PDF." }, { status: 500 });
      }
    }

    return NextResponse.json({
      banco: parsed.banco,
      periodo: parsed.periodo,
      saldo_inicial: parsed.saldo_inicial,
      saldo_final: parsed.saldo_final,
      movimientos: parsed.movimientos || [],
      total: (parsed.movimientos || []).length,
    });
  } catch (error) {
    console.error("Error procesando estado de cuenta:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error procesando el PDF" },
      { status: 500 }
    );
  }
}
