/**
 * Generador de contratos con IA (Claude)
 */

import { PLANTILLA_SERVICIOS } from "./plantillas/servicios";
import { PLANTILLA_OBRA } from "./plantillas/obra";
import { PLANTILLA_SUMINISTRO } from "./plantillas/suministro";
import { PLANTILLA_ARRENDAMIENTO } from "./plantillas/arrendamiento";
import { PLANTILLA_NDA } from "./plantillas/nda";

export type TipoContrato =
  | "servicios"
  | "obra"
  | "suministro"
  | "arrendamiento"
  | "nda";

export interface DatosContrato {
  tipo: TipoContrato;
  // Contratante (empresa)
  contratanteNombre: string;
  contratanteRfc: string;
  contratanteDomicilio: string;
  contratanteRepresentante?: string;
  // Contratado (tercero)
  contratadoNombre: string;
  contratadoRfc: string;
  contratadoDomicilio?: string;
  // Condiciones
  monto?: number;
  moneda?: string;
  fechaInicio: string;
  fechaFin?: string;
  objetoContrato: string;
  condicionesPago?: string;
  // Datos adicionales por tipo
  datosAdicionales?: Record<string, string | number>;
}

const PLANTILLAS: Record<TipoContrato, string> = {
  servicios: PLANTILLA_SERVICIOS,
  obra: PLANTILLA_OBRA,
  suministro: PLANTILLA_SUMINISTRO,
  arrendamiento: PLANTILLA_ARRENDAMIENTO,
  nda: PLANTILLA_NDA,
};

const TIPO_LABELS: Record<TipoContrato, string> = {
  servicios: "Prestación de Servicios Profesionales",
  obra: "Obra a Precio Alzado",
  suministro: "Suministro de Bienes",
  arrendamiento: "Arrendamiento",
  nda: "Acuerdo de Confidencialidad (NDA)",
};

function buildPrompt(datos: DatosContrato): string {
  const plantilla = PLANTILLAS[datos.tipo];
  const tipoLabel = TIPO_LABELS[datos.tipo];

  let datosAdicionalesStr = "";
  if (datos.datosAdicionales) {
    datosAdicionalesStr = Object.entries(datos.datosAdicionales)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join("\n");
  }

  return `Eres un abogado especialista en derecho mercantil y fiscal mexicano.
Genera un contrato de ${tipoLabel} completo y válido conforme a la legislación mexicana vigente.

DATOS DEL CONTRATO:
Contratante: ${datos.contratanteNombre}, RFC: ${datos.contratanteRfc}, Domicilio: ${datos.contratanteDomicilio}
${datos.contratanteRepresentante ? `Representante legal: ${datos.contratanteRepresentante}` : ""}
Contratado: ${datos.contratadoNombre}, RFC: ${datos.contratadoRfc}${datos.contratadoDomicilio ? `, Domicilio: ${datos.contratadoDomicilio}` : ""}
Objeto: ${datos.objetoContrato}
${datos.monto ? `Monto: $${datos.monto.toLocaleString("es-MX")} ${datos.moneda || "MXN"} + IVA` : ""}
Vigencia: del ${datos.fechaInicio}${datos.fechaFin ? ` al ${datos.fechaFin}` : ""}
${datos.condicionesPago ? `Forma de pago: ${datos.condicionesPago}` : ""}
${datosAdicionalesStr ? `\nDatos adicionales:\n${datosAdicionalesStr}` : ""}

${plantilla}

FORMATO: Genera el contrato en HTML semántico con estilos inline para PDF.
- Usa <h1> para el título del contrato
- Usa <h2> para cada cláusula
- Usa <p> para el contenido
- Usa negritas para datos clave (nombres, montos, fechas)
- Incluye [LUGAR] y [FECHA] como placeholders donde corresponda
- Agrega al final sección de firmas con líneas y nombres
- Usa lenguaje formal pero claro
- NO incluyas tags <html>, <head>, <body> — solo el contenido del contrato`;
}

/**
 * Genera un contrato usando Claude
 */
export async function generarContrato(
  datos: DatosContrato
): Promise<string> {
  const apiKey = process.env.CONCILIAOS_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return generarContratoFallback(datos);
  }

  try {
    const prompt = buildPrompt(datos);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        temperature: 0.3,
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
    const html = data.content?.[0]?.text || "";

    // Limpiar si viene envuelto en markdown code blocks
    return html
      .replace(/^```html\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
  } catch (error) {
    console.error("Error generando contrato con IA:", error);
    return generarContratoFallback(datos);
  }
}

/**
 * Fallback: genera un contrato básico sin IA
 */
function generarContratoFallback(datos: DatosContrato): string {
  const tipoLabel = TIPO_LABELS[datos.tipo];

  return `
<h1 style="text-align: center; font-size: 18px; margin-bottom: 24px;">
  CONTRATO DE ${tipoLabel.toUpperCase()}
</h1>

<p style="text-align: right; margin-bottom: 20px;">
  <em>[LUGAR], a [FECHA]</em>
</p>

<h2 style="font-size: 14px; margin-top: 20px;">DECLARACIONES</h2>

<p><strong>I.</strong> Declara <strong>"EL CONTRATANTE"</strong>, <strong>${datos.contratanteNombre}</strong>,
con RFC <strong>${datos.contratanteRfc}</strong>, con domicilio fiscal en ${datos.contratanteDomicilio},
que cuenta con la capacidad legal necesaria para celebrar el presente contrato.</p>

<p><strong>II.</strong> Declara <strong>"EL CONTRATADO"</strong>, <strong>${datos.contratadoNombre}</strong>,
con RFC <strong>${datos.contratadoRfc}</strong>${datos.contratadoDomicilio ? `, con domicilio en ${datos.contratadoDomicilio}` : ""},
que cuenta con la capacidad legal y técnica necesaria para cumplir con las obligaciones del presente contrato.</p>

<h2 style="font-size: 14px; margin-top: 20px;">CLÁUSULA PRIMERA — OBJETO</h2>
<p>${datos.objetoContrato}</p>

<h2 style="font-size: 14px; margin-top: 20px;">CLÁUSULA SEGUNDA — VIGENCIA</h2>
<p>El presente contrato tendrá vigencia del <strong>${datos.fechaInicio}</strong>${datos.fechaFin ? ` al <strong>${datos.fechaFin}</strong>` : ", por tiempo indefinido"}.</p>

${datos.monto ? `
<h2 style="font-size: 14px; margin-top: 20px;">CLÁUSULA TERCERA — CONTRAPRESTACIÓN</h2>
<p>El monto total del presente contrato será de <strong>$${datos.monto.toLocaleString("es-MX")} ${datos.moneda || "MXN"}</strong> más IVA.</p>
${datos.condicionesPago ? `<p>Forma de pago: ${datos.condicionesPago}</p>` : ""}
` : ""}

<h2 style="font-size: 14px; margin-top: 20px;">CLÁUSULA DE IMPUESTOS</h2>
<p>Cada una de las partes será responsable del cumplimiento de sus obligaciones fiscales.
EL CONTRATADO deberá emitir el Comprobante Fiscal Digital por Internet (CFDI) correspondiente a cada pago recibido,
conforme a las disposiciones aplicables de la LISR y LIVA.</p>

<h2 style="font-size: 14px; margin-top: 20px;">JURISDICCIÓN</h2>
<p>Para la interpretación y cumplimiento del presente contrato, las partes se someten a la jurisdicción
de los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiere corresponderles.</p>

<div style="margin-top: 60px; display: flex; justify-content: space-between;">
  <div style="text-align: center; width: 45%;">
    <div style="border-top: 1px solid #000; padding-top: 8px;">
      <strong>${datos.contratanteNombre}</strong><br/>
      <small>EL CONTRATANTE</small><br/>
      <small>RFC: ${datos.contratanteRfc}</small>
    </div>
  </div>
  <div style="text-align: center; width: 45%;">
    <div style="border-top: 1px solid #000; padding-top: 8px;">
      <strong>${datos.contratadoNombre}</strong><br/>
      <small>EL CONTRATADO</small><br/>
      <small>RFC: ${datos.contratadoRfc}</small>
    </div>
  </div>
</div>
`.trim();
}
