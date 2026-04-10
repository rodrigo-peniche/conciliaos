/**
 * Validador de CFDIs contra el SAT
 * Verifica estado de UUID (vigente/cancelado)
 */

export interface ValidacionCfdiResult {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: string;
  estado: "vigente" | "cancelado" | "no_encontrado";
  esCancelable: string | null;
  estatusCancelacion: string | null;
  fechaConsulta: Date;
}

/**
 * Verifica el estado de un CFDI en el portal del SAT
 * Consulta: https://verificacfdi.facturaelectronica.sat.gob.mx
 */
export async function verificarCfdiSAT(params: {
  uuid: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: string;
}): Promise<ValidacionCfdiResult> {
  const { uuid, rfcEmisor, rfcReceptor, total } = params;

  // Construir SOAP request para el validador público del SAT
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/">
  <soap:Body>
    <tem:Consulta>
      <tem:expresionImpresa>?re=${rfcEmisor}&amp;rr=${rfcReceptor}&amp;tt=${total}&amp;id=${uuid}</tem:expresionImpresa>
    </tem:Consulta>
  </soap:Body>
</soap:Envelope>`;

  try {
    const response = await fetch(
      "https://consultaqr.facturaelectronica.sat.gob.mx/ConsultaCFDIService.svc",
      {
        method: "POST",
        headers: {
          "Content-Type": "text/xml;charset=UTF-8",
          SOAPAction: "http://tempuri.org/IConsultaCFDIService/Consulta",
        },
        body: soapEnvelope,
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    if (!response.ok) {
      return {
        uuid,
        rfcEmisor,
        rfcReceptor,
        total,
        estado: "no_encontrado",
        esCancelable: null,
        estatusCancelacion: null,
        fechaConsulta: new Date(),
      };
    }

    const responseText = await response.text();

    // Extraer estado del CFDI
    const estadoMatch = responseText.match(/Estado[^>]*>([^<]+)</i);
    const estadoRaw = estadoMatch?.[1]?.toLowerCase() || "";

    let estado: ValidacionCfdiResult["estado"] = "no_encontrado";
    if (estadoRaw.includes("vigente")) estado = "vigente";
    else if (estadoRaw.includes("cancelado")) estado = "cancelado";

    // Extraer campos adicionales
    const cancelableMatch = responseText.match(/EsCancelable[^>]*>([^<]+)</i);
    const estatusCancelacionMatch = responseText.match(
      /EstatusCancelacion[^>]*>([^<]+)</i
    );

    return {
      uuid,
      rfcEmisor,
      rfcReceptor,
      total,
      estado,
      esCancelable: cancelableMatch?.[1] || null,
      estatusCancelacion: estatusCancelacionMatch?.[1] || null,
      fechaConsulta: new Date(),
    };
  } catch {
    return {
      uuid,
      rfcEmisor,
      rfcReceptor,
      total,
      estado: "no_encontrado",
      esCancelable: null,
      estatusCancelacion: null,
      fechaConsulta: new Date(),
    };
  }
}

/**
 * Verifica un batch de CFDIs con rate limiting para no saturar el SAT
 * Máximo 1 consulta por segundo
 */
export async function verificarCfdisBatch(
  cfdis: Array<{
    uuid: string;
    rfcEmisor: string;
    rfcReceptor: string;
    total: string;
  }>,
  onProgress?: (completed: number, total: number) => void
): Promise<ValidacionCfdiResult[]> {
  const results: ValidacionCfdiResult[] = [];

  for (let i = 0; i < cfdis.length; i++) {
    const result = await verificarCfdiSAT(cfdis[i]);
    results.push(result);

    onProgress?.(i + 1, cfdis.length);

    // Rate limit: esperar 1 segundo entre consultas
    if (i < cfdis.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
