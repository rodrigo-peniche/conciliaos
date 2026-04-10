/**
 * Analizador de deducibilidad con IA (Claude)
 * Para casos que requieren interpretación fiscal compleja
 */

import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

export interface AnalisisIA {
  es_deducible: boolean;
  porcentaje: number;
  fundamento: string;
  razonamiento: string;
  documentos_recomendados: string[];
  alerta: string | null;
}

/**
 * Construye el prompt de análisis de deducibilidad para Claude
 */
function buildPromptDeducibilidad(cfdi: Cfdi, empresa: Empresa): string {
  return `Eres un experto en fiscalidad mexicana. Analiza si el siguiente CFDI es un gasto estrictamente indispensable para la empresa conforme al artículo 27 fracción I de la LISR.

DATOS DE LA EMPRESA:
- Razón social: ${empresa.razon_social}
- RFC: ${empresa.rfc}
- Régimen fiscal: ${empresa.regimen_fiscal} (${empresa.regimen_codigo})
- Objeto social / actividades económicas: ${empresa.objeto_social || "No especificado"}

DATOS DEL CFDI:
- UUID: ${cfdi.uuid}
- Emisor: ${cfdi.emisor_nombre || "N/A"} (${cfdi.emisor_rfc})
- Uso CFDI: ${cfdi.receptor_uso_cfdi || "N/A"}
- Monto: $${cfdi.total} ${cfdi.moneda}
- Fecha: ${cfdi.fecha_emision}
- Tipo: ${cfdi.tipo}

Responde SOLO con JSON válido en este formato exacto:
{
  "es_deducible": true/false,
  "porcentaje": 0-100,
  "fundamento": "cita exacta del artículo aplicable",
  "razonamiento": "explicación de 2-3 oraciones",
  "documentos_recomendados": ["lista de documentos de soporte"],
  "alerta": "advertencia si hay riesgo fiscal (o null)"
}`;
}

/**
 * Analiza la deducibilidad de un CFDI usando Claude
 */
export async function analizarConIA(
  cfdi: Cfdi,
  empresa: Empresa
): Promise<AnalisisIA> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback si no hay API key configurada
    return {
      es_deducible: true,
      porcentaje: 100,
      fundamento: "Art. 27 fr. I LISR — Análisis pendiente (API key no configurada)",
      razonamiento:
        "No se pudo realizar el análisis con IA. Se recomienda revisión manual por un contador.",
      documentos_recomendados: [
        "Contrato con proveedor",
        "Comprobante de pago",
        "Justificación de gasto",
      ],
      alerta: "Análisis de IA no disponible — revisar manualmente",
    };
  }

  try {
    const prompt = buildPromptDeducibilidad(cfdi, empresa);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Extraer JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No se encontró JSON en la respuesta");
    }

    const resultado: AnalisisIA = JSON.parse(jsonMatch[0]);
    return resultado;
  } catch (error) {
    console.error("Error en análisis IA:", error);
    return {
      es_deducible: true,
      porcentaje: 100,
      fundamento: "Art. 27 fr. I LISR",
      razonamiento:
        "Error en el análisis automático. Se asume deducible al 100% pendiente de revisión humana.",
      documentos_recomendados: ["Revisión manual requerida"],
      alerta: "Error en análisis de IA — requiere revisión manual",
    };
  }
}

/**
 * Análisis batch de múltiples CFDIs
 */
export async function analizarBatchConIA(
  cfdis: Cfdi[],
  empresa: Empresa
): Promise<Map<string, AnalisisIA>> {
  const resultados = new Map<string, AnalisisIA>();

  // Procesar en paralelo con límite de concurrencia
  const CONCURRENCIA = 3;
  for (let i = 0; i < cfdis.length; i += CONCURRENCIA) {
    const batch = cfdis.slice(i, i + CONCURRENCIA);
    const promesas = batch.map(async (cfdi) => {
      const resultado = await analizarConIA(cfdi, empresa);
      resultados.set(cfdi.id, resultado);
    });
    await Promise.all(promesas);
  }

  return resultados;
}
