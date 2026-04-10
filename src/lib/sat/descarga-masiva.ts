/**
 * Cliente para el servicio de Descarga Masiva de CFDIs del SAT
 * Endpoints SOAP: https://cfdidescargamasiva.clouda.sat.gob.mx
 */

import crypto from "crypto";

// Endpoints del servicio de descarga masiva del SAT
const SAT_ENDPOINTS = {
  autenticar:
    "https://cfdidescargamasiva.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc",
  solicitar:
    "https://cfdidescargamasiva.clouda.sat.gob.mx/SolicitaDescargaService.svc",
  verificar:
    "https://cfdidescargamasiva.clouda.sat.gob.mx/VerificaSolicitudDescargaService.svc",
  descargar:
    "https://cfdidescargamasiva.clouda.sat.gob.mx/DescargarSolicitudService.svc",
} as const;

export type TipoSolicitud = "CFDI" | "Metadata";
export type TipoComprobante = "I" | "E" | "T" | "P" | "N";

export interface SolicitudDescargaParams {
  rfcSolicitante: string;
  rfcEmisor?: string;
  rfcReceptor?: string;
  fechaInicio: Date;
  fechaFin: Date;
  tipoSolicitud: TipoSolicitud;
  tipoComprobante?: TipoComprobante;
}

export interface VerificacionResult {
  estadoSolicitud: string; // '1'=Aceptada, '2'=EnProceso, '3'=Terminada, '4'=Error, '5'=Rechazada
  codigoEstadoSolicitud: string;
  numeroCFDIs: number;
  mensaje: string;
  paquetes: string[];
}

export interface SATAuthToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export class SATDescargaMasiva {
  private cer: Buffer;
  private key: Buffer;
  private password: string;
  private token: SATAuthToken | null = null;

  constructor(cer: Buffer, key: Buffer, password: string) {
    this.cer = cer;
    this.key = key;
    this.password = password;
  }

  /**
   * Autentica con el SAT y obtiene un token de sesión
   * El token es válido por 5 minutos
   */
  async autenticar(): Promise<string> {
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60 * 1000); // 5 min

    const created = now.toISOString();
    const expiresStr = expires.toISOString();

    // Generar nonce para WS-Security
    const nonce = crypto.randomBytes(16).toString("base64");

    // Extraer certificado en base64 (sin headers PEM)
    const cerBase64 = this.cer
      .toString("utf-8")
      .replace(/-----BEGIN CERTIFICATE-----/g, "")
      .replace(/-----END CERTIFICATE-----/g, "")
      .replace(/\s/g, "");

    // Construir el timestamp para firmar
    const timestampXml = `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="_0"><u:Created>${created}</u:Created><u:Expires>${expiresStr}</u:Expires></u:Timestamp>`;

    // Firmar el timestamp con la llave privada
    const sign = crypto.createSign("SHA1");
    sign.update(timestampXml);
    const signature = sign.sign(
      { key: this.key, passphrase: this.password },
      "base64"
    );

    // Construir SOAP envelope de autenticación
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" s:mustUnderstand="1">
      ${timestampXml}
      <o:BinarySecurityToken u:Id="X509Token" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${cerBase64}</o:BinarySecurityToken>
      <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
          <CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          <Reference URI="#_0">
            <Transforms>
              <Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
            </Transforms>
            <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
            <DigestValue>${crypto.createHash("sha1").update(timestampXml).digest("base64")}</DigestValue>
          </Reference>
        </SignedInfo>
        <SignatureValue>${signature}</SignatureValue>
        <KeyInfo>
          <o:SecurityTokenReference>
            <o:Reference URI="#X509Token" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/>
          </o:SecurityTokenReference>
        </KeyInfo>
      </Signature>
    </o:Security>
  </s:Header>
  <s:Body>
    <Autentica xmlns="http://DescargaMasivaTerceros.gob.mx"/>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.autenticar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction:
          "http://DescargaMasivaTerceros.gob.mx/IAutenticacion/Autentica",
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      throw new SATError(
        `Error de autenticación SAT: HTTP ${response.status}`,
        "AUTH_HTTP_ERROR"
      );
    }

    const responseText = await response.text();

    // Extraer token de la respuesta SOAP
    const tokenMatch = responseText.match(
      /<AutenticaResult>(.*?)<\/AutenticaResult>/
    );
    if (!tokenMatch || !tokenMatch[1]) {
      throw new SATError(
        "No se pudo extraer el token de autenticación del SAT",
        "AUTH_TOKEN_MISSING"
      );
    }

    this.token = {
      token: tokenMatch[1],
      createdAt: now,
      expiresAt: expires,
    };

    return tokenMatch[1];
  }

  /**
   * Verifica si el token actual es válido
   */
  private isTokenValid(): boolean {
    if (!this.token) return false;
    return new Date() < this.token.expiresAt;
  }

  /**
   * Obtiene un token válido, re-autenticando si es necesario
   */
  private async getToken(): Promise<string> {
    if (!this.isTokenValid()) {
      await this.autenticar();
    }
    return this.token!.token;
  }

  /**
   * Solicita una descarga masiva de CFDIs al SAT
   * Retorna el ID de la solicitud para seguimiento
   */
  async solicitarDescarga(
    params: SolicitudDescargaParams
  ): Promise<string> {
    const token = await this.getToken();

    const fechaInicio = params.fechaInicio.toISOString().split("T")[0] + "T00:00:00";
    const fechaFin = params.fechaFin.toISOString().split("T")[0] + "T23:59:59";

    let tipoComprobanteAttr = "";
    if (params.tipoComprobante) {
      tipoComprobanteAttr = ` TipoComprobante="${params.tipoComprobante}"`;
    }

    let rfcEmisorAttr = "";
    if (params.rfcEmisor) {
      rfcEmisorAttr = ` RfcEmisor="${params.rfcEmisor}"`;
    }

    let rfcReceptorAttr = "";
    if (params.rfcReceptor) {
      rfcReceptorAttr = ` RfcReceptor="${params.rfcReceptor}"`;
    }

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx">
  <s:Header/>
  <s:Body>
    <des:SolicitaDescarga>
      <des:solicitud RfcSolicitante="${params.rfcSolicitante}" FechaInicial="${fechaInicio}" FechaFinal="${fechaFin}" TipoSolicitud="${params.tipoSolicitud}"${tipoComprobanteAttr}${rfcEmisorAttr}${rfcReceptorAttr}/>
    </des:SolicitaDescarga>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.solicitar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction:
          "http://DescargaMasivaTerceros.sat.gob.mx/ISolicitaDescargaService/SolicitaDescarga",
        Authorization: `WRAP access_token="${token}"`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      throw new SATError(
        `Error al solicitar descarga: HTTP ${response.status}`,
        "SOLICITUD_HTTP_ERROR"
      );
    }

    const responseText = await response.text();

    const idSolicitud = extractXmlValue(responseText, "IdSolicitud");
    const codEstatus = extractXmlValue(responseText, "CodEstatus");

    if (codEstatus !== "5000") {
      const mensaje = extractXmlValue(responseText, "Mensaje") || "Error desconocido";
      throw new SATError(
        `SAT rechazó la solicitud: ${mensaje} (código: ${codEstatus})`,
        "SOLICITUD_RECHAZADA"
      );
    }

    if (!idSolicitud) {
      throw new SATError(
        "No se recibió ID de solicitud del SAT",
        "SOLICITUD_SIN_ID"
      );
    }

    return idSolicitud;
  }

  /**
   * Verifica el estado de una solicitud de descarga
   */
  async verificarSolicitud(idSolicitud: string): Promise<VerificacionResult> {
    const token = await this.getToken();

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx">
  <s:Header/>
  <s:Body>
    <des:VerificaSolicitudDescarga>
      <des:solicitud IdSolicitud="${idSolicitud}" RfcSolicitante="${this.getRfcFromCer()}"/>
    </des:VerificaSolicitudDescarga>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.verificar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction:
          "http://DescargaMasivaTerceros.sat.gob.mx/IVerificaSolicitudDescargaService/VerificaSolicitudDescarga",
        Authorization: `WRAP access_token="${token}"`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      throw new SATError(
        `Error al verificar solicitud: HTTP ${response.status}`,
        "VERIFICACION_HTTP_ERROR"
      );
    }

    const responseText = await response.text();

    const estadoSolicitud = extractXmlValue(responseText, "EstadoSolicitud") || "0";
    const codigoEstado = extractXmlValue(responseText, "CodigoEstadoSolicitud") || "0";
    const numeroCFDIs = parseInt(extractXmlValue(responseText, "NumeroCFDIs") || "0", 10);
    const mensaje = extractXmlValue(responseText, "Mensaje") || "";

    // Extraer IDs de paquetes
    const paquetes: string[] = [];
    const paqueteRegex = /IdsPaquetes[^>]*>([^<]+)</g;
    let match;
    while ((match = paqueteRegex.exec(responseText)) !== null) {
      paquetes.push(match[1]);
    }

    return {
      estadoSolicitud,
      codigoEstadoSolicitud: codigoEstado,
      numeroCFDIs,
      mensaje,
      paquetes,
    };
  }

  /**
   * Descarga un paquete de CFDIs (ZIP con XMLs)
   */
  async descargarPaquete(idPaquete: string): Promise<Buffer> {
    const token = await this.getToken();

    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx">
  <s:Header/>
  <s:Body>
    <des:PeticionDescargaMasivaTercerosEntrada>
      <des:peticionDescarga IdPaquete="${idPaquete}" RfcSolicitante="${this.getRfcFromCer()}"/>
    </des:PeticionDescargaMasivaTercerosEntrada>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.descargar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction:
          "http://DescargaMasivaTerceros.sat.gob.mx/IDescargarSolicitudService/Descargar",
        Authorization: `WRAP access_token="${token}"`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      throw new SATError(
        `Error al descargar paquete: HTTP ${response.status}`,
        "DESCARGA_HTTP_ERROR"
      );
    }

    const responseText = await response.text();

    // Extraer el paquete en base64
    const paqueteBase64 = extractXmlValue(responseText, "Paquete");
    if (!paqueteBase64) {
      throw new SATError(
        "No se encontró el paquete en la respuesta del SAT",
        "DESCARGA_SIN_PAQUETE"
      );
    }

    return Buffer.from(paqueteBase64, "base64");
  }

  /**
   * Extrae el RFC del certificado
   */
  private getRfcFromCer(): string {
    // El RFC se encuentra en el subject del certificado X.509
    // Por ahora retornamos un placeholder - en producción se extrae del certificado
    return "";
  }
}

// --- Utilidades ---

function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<[^:]*:?${tagName}[^>]*>([^<]*)<`, "i");
  const match = xml.match(regex);
  return match ? match[1] : null;
}

// --- Errores tipados ---

export type SATErrorCode =
  | "AUTH_HTTP_ERROR"
  | "AUTH_TOKEN_MISSING"
  | "SOLICITUD_HTTP_ERROR"
  | "SOLICITUD_RECHAZADA"
  | "SOLICITUD_SIN_ID"
  | "VERIFICACION_HTTP_ERROR"
  | "DESCARGA_HTTP_ERROR"
  | "DESCARGA_SIN_PAQUETE";

export class SATError extends Error {
  code: SATErrorCode;

  constructor(message: string, code: SATErrorCode) {
    super(message);
    this.name = "SATError";
    this.code = code;
  }
}
