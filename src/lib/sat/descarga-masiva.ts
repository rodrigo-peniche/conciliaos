/**
 * Cliente para el servicio de Descarga Masiva de CFDIs del SAT
 * Implementa los 4 pasos: Autenticación, Solicitud, Verificación, Descarga
 *
 * Docs: https://www.sat.gob.mx/consultas/42968/consulta-la-documentacion-tecnica-del-servicio-web-de-descarga-masiva
 */

import crypto from "crypto";

// --- Endpoints producción ---
const SAT_ENDPOINTS = {
  autenticar:
    "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc",
  solicitar:
    "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/SolicitaDescargaService.svc",
  verificar:
    "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/VerificaSolicitudDescargaService.svc",
  descargar:
    "https://cfdidescargamasaborrecepcion.clouda.sat.gob.mx/DescargarSolicitudService.svc",
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
  estadoSolicitud: string; // 1=Aceptada 2=EnProceso 3=Terminada 4=Error 5=Rechazada
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

/**
 * Extrae el RFC del subject de un certificado X.509 DER (.cer del SAT)
 * El SAT usa UniqueIdentifier o serialNumber en el subject para el RFC
 */
export function extractRfcFromCer(cerDer: Buffer): string {
  // Convertir DER a PEM para usar con crypto
  const pem = derToPem(cerDer, "CERTIFICATE");
  const cert = new crypto.X509Certificate(pem);

  // El subject contiene algo como:
  // OID.2.5.4.45=... / serialNumber=... (esto es el RFC en certs del SAT)
  // O puede estar en el campo UniqueIdentifier
  const subject = cert.subject;

  // Buscar serialNumber (RFC está aquí en certificados del SAT)
  const snMatch = subject.match(/serialNumber=([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  if (snMatch) return snMatch[1].toUpperCase();

  // Buscar en OID 2.5.4.45 (UniqueIdentifier)
  const oidMatch = subject.match(/OID\.2\.5\.4\.45=([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  if (oidMatch) return oidMatch[1].toUpperCase();

  // Buscar cualquier cosa que parezca RFC en el subject
  const rfcMatch = subject.match(/([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
  if (rfcMatch) return rfcMatch[1].toUpperCase();

  // Intentar en subjectAltName o extensiones
  const infoAccess = cert.infoAccess;
  if (infoAccess) {
    const rfcInInfo = infoAccess.match(/([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
    if (rfcInInfo) return rfcInInfo[1].toUpperCase();
  }

  throw new SATError("No se pudo extraer el RFC del certificado", "CERT_RFC_NOT_FOUND");
}

/**
 * Convierte DER a PEM
 */
function derToPem(der: Buffer, type: string): string {
  const b64 = der.toString("base64");
  const lines = b64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join("\n")}\n-----END ${type}-----\n`;
}

/**
 * Crea la llave privada a partir del .key del SAT (DER PKCS#8 cifrado)
 */
function createPrivateKey(keyDer: Buffer, password: string): crypto.KeyObject {
  // El .key del SAT es PKCS#8 cifrado en DER
  // Node.js crypto puede manejarlo directamente
  return crypto.createPrivateKey({
    key: keyDer,
    format: "der",
    type: "pkcs8",
    passphrase: password,
  });
}

export class SATDescargaMasiva {
  private cerDer: Buffer;
  private cerPem: string;
  private cerBase64: string;
  private privateKey: crypto.KeyObject;
  private rfc: string;
  private token: SATAuthToken | null = null;

  constructor(cerDer: Buffer, keyDer: Buffer, password: string) {
    this.cerDer = cerDer;
    this.cerPem = derToPem(cerDer, "CERTIFICATE");
    // Base64 del certificado sin headers PEM
    this.cerBase64 = cerDer.toString("base64");
    this.privateKey = createPrivateKey(keyDer, password);
    this.rfc = extractRfcFromCer(cerDer);
  }

  getRfc(): string {
    return this.rfc;
  }

  /**
   * Firma datos con SHA-1 usando la llave privada (requerido por SAT)
   */
  private signSha1(data: string): string {
    const sign = crypto.createSign("RSA-SHA1");
    sign.update(data);
    return sign.sign(this.privateKey, "base64");
  }

  /**
   * Calcula digest SHA-1 de datos
   */
  private digestSha1(data: string): string {
    return crypto.createHash("sha1").update(data).digest("base64");
  }

  /**
   * Paso 1: Autenticar con el SAT y obtener token de sesión (válido 5 min)
   */
  async autenticar(): Promise<string> {
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60 * 1000);
    const created = now.toISOString();
    const expiresStr = expires.toISOString();
    const uuid = crypto.randomUUID();

    // Timestamp que será firmado (XML canónico - sin whitespace extra)
    const timestampXml =
      `<u:Timestamp xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd" u:Id="_0">` +
      `<u:Created>${created}</u:Created>` +
      `<u:Expires>${expiresStr}</u:Expires>` +
      `</u:Timestamp>`;

    const digestValue = this.digestSha1(timestampXml);

    // SignedInfo canónico
    const signedInfoXml =
      `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></CanonicalizationMethod>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod>` +
      `<Reference URI="#_0">` +
      `<Transforms>` +
      `<Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"></Transform>` +
      `</Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>`;

    const signatureValue = this.signSha1(signedInfoXml);

    const soapEnvelope = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">` +
      `<s:Header>` +
      `<o:Security xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" s:mustUnderstand="1">` +
      `${timestampXml}` +
      `<o:BinarySecurityToken u:Id="uuid-${uuid}-1" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${this.cerBase64}</o:BinarySecurityToken>` +
      `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `${signedInfoXml}` +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
      `<o:SecurityTokenReference>` +
      `<o:Reference URI="#uuid-${uuid}-1" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"></o:Reference>` +
      `</o:SecurityTokenReference>` +
      `</KeyInfo>` +
      `</Signature>` +
      `</o:Security>` +
      `</s:Header>` +
      `<s:Body>` +
      `<Autentica xmlns="http://DescargaMasivaTerceros.gob.mx"></Autentica>` +
      `</s:Body>` +
      `</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.autenticar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "http://DescargaMasivaTerceros.gob.mx/IAutenticacion/Autentica",
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new SATError(
        `Error autenticación SAT: HTTP ${response.status} - ${text.substring(0, 200)}`,
        "AUTH_HTTP_ERROR"
      );
    }

    const responseText = await response.text();
    const tokenMatch = responseText.match(/<AutenticaResult>([\s\S]*?)<\/AutenticaResult>/);
    if (!tokenMatch || !tokenMatch[1]) {
      throw new SATError(
        `No se pudo extraer token. Respuesta: ${responseText.substring(0, 300)}`,
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

  private isTokenValid(): boolean {
    if (!this.token) return false;
    return new Date() < this.token.expiresAt;
  }

  private async getToken(): Promise<string> {
    if (!this.isTokenValid()) {
      await this.autenticar();
    }
    return this.token!.token;
  }

  /**
   * Paso 2: Solicitar descarga masiva de CFDIs
   * Retorna el IdSolicitud para seguimiento
   */
  async solicitarDescarga(params: SolicitudDescargaParams): Promise<string> {
    const token = await this.getToken();

    const fechaInicio = params.fechaInicio.toISOString().replace(/\.\d{3}Z$/, "");
    const fechaFin = params.fechaFin.toISOString().replace(/\.\d{3}Z$/, "");

    // Construir atributos de la solicitud
    let solicitudAttrs = `FechaFinal="${fechaFin}" FechaInicial="${fechaInicio}" RfcSolicitante="${params.rfcSolicitante}" TipoSolicitud="${params.tipoSolicitud}"`;
    if (params.rfcEmisor) solicitudAttrs += ` RfcEmisor="${params.rfcEmisor}"`;
    if (params.rfcReceptor) solicitudAttrs += ` RfcReceptor="${params.rfcReceptor}"`;
    if (params.tipoComprobante) solicitudAttrs += ` TipoComprobante="${params.tipoComprobante}"`;

    // Firmar el nodo solicitud
    const solicitudToSign = `<des:solicitud xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" ${solicitudAttrs}></des:solicitud>`;
    const digestValue = this.digestSha1(solicitudToSign);

    const signedInfoXml =
      `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<Reference URI="">` +
      `<Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>`;

    const signatureValue = this.signSha1(signedInfoXml);

    const soapEnvelope =
      `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">` +
      `<s:Header/>` +
      `<s:Body>` +
      `<des:SolicitaDescarga>` +
      `<des:solicitud ${solicitudAttrs}>` +
      `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `${signedInfoXml}` +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
      `<X509Data><X509Certificate>${this.cerBase64}</X509Certificate></X509Data>` +
      `</KeyInfo>` +
      `</Signature>` +
      `</des:solicitud>` +
      `</des:SolicitaDescarga>` +
      `</s:Body>` +
      `</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.solicitar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "http://DescargaMasivaTerceros.sat.gob.mx/ISolicitaDescargaService/SolicitaDescarga",
        Authorization: `WRAP access_token="${token}"`,
      },
      body: soapEnvelope,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new SATError(
        `Error al solicitar descarga: HTTP ${response.status} - ${text.substring(0, 200)}`,
        "SOLICITUD_HTTP_ERROR"
      );
    }

    const responseText = await response.text();
    const idSolicitud = extractXmlValue(responseText, "IdSolicitud");
    const codEstatus = extractXmlValue(responseText, "CodEstatus");
    const mensaje = extractXmlValue(responseText, "Mensaje") || "";

    if (codEstatus !== "5000") {
      throw new SATError(
        `SAT rechazó la solicitud: ${mensaje} (código: ${codEstatus})`,
        "SOLICITUD_RECHAZADA"
      );
    }

    if (!idSolicitud) {
      throw new SATError(
        `No se recibió IdSolicitud. Respuesta: ${responseText.substring(0, 300)}`,
        "SOLICITUD_SIN_ID"
      );
    }

    return idSolicitud;
  }

  /**
   * Paso 3: Verificar estado de una solicitud
   */
  async verificarSolicitud(idSolicitud: string): Promise<VerificacionResult> {
    const token = await this.getToken();

    const solicitudToSign = `<des:solicitud xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" IdSolicitud="${idSolicitud}" RfcSolicitante="${this.rfc}"></des:solicitud>`;
    const digestValue = this.digestSha1(solicitudToSign);

    const signedInfoXml =
      `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<Reference URI="">` +
      `<Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>`;

    const signatureValue = this.signSha1(signedInfoXml);

    const soapEnvelope =
      `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx">` +
      `<s:Header/>` +
      `<s:Body>` +
      `<des:VerificaSolicitudDescarga>` +
      `<des:solicitud IdSolicitud="${idSolicitud}" RfcSolicitante="${this.rfc}">` +
      `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `${signedInfoXml}` +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
      `<X509Data><X509Certificate>${this.cerBase64}</X509Certificate></X509Data>` +
      `</KeyInfo>` +
      `</Signature>` +
      `</des:solicitud>` +
      `</des:VerificaSolicitudDescarga>` +
      `</s:Body>` +
      `</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.verificar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "http://DescargaMasivaTerceros.sat.gob.mx/IVerificaSolicitudDescargaService/VerificaSolicitudDescarga",
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

    return { estadoSolicitud, codigoEstadoSolicitud: codigoEstado, numeroCFDIs, mensaje, paquetes };
  }

  /**
   * Paso 4: Descargar un paquete (ZIP con XMLs en base64)
   */
  async descargarPaquete(idPaquete: string): Promise<Buffer> {
    const token = await this.getToken();

    // Firmar el nodo peticionDescarga (mismo enfoque que solicitud/verificación)
    const peticionToSign = `<des:peticionDescarga xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" IdPaquete="${idPaquete}" RfcSolicitante="${this.rfc}"></des:peticionDescarga>`;
    const digestValue = this.digestSha1(peticionToSign);

    const signedInfoXml =
      `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<Reference URI="">` +
      `<Transforms><Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/></Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<DigestValue>${digestValue}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>`;

    const signatureValue = this.signSha1(signedInfoXml);

    const soapEnvelope =
      `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:des="http://DescargaMasivaTerceros.sat.gob.mx" xmlns:xd="http://www.w3.org/2000/09/xmldsig#">` +
      `<s:Header/>` +
      `<s:Body>` +
      `<des:PeticionDescargaMasivaTercerosEntrada>` +
      `<des:peticionDescarga IdPaquete="${idPaquete}" RfcSolicitante="${this.rfc}">` +
      `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `${signedInfoXml}` +
      `<SignatureValue>${signatureValue}</SignatureValue>` +
      `<KeyInfo>` +
      `<X509Data><X509Certificate>${this.cerBase64}</X509Certificate></X509Data>` +
      `</KeyInfo>` +
      `</Signature>` +
      `</des:peticionDescarga>` +
      `</des:PeticionDescargaMasivaTercerosEntrada>` +
      `</s:Body>` +
      `</s:Envelope>`;

    const response = await fetch(SAT_ENDPOINTS.descargar, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: "http://DescargaMasivaTerceros.sat.gob.mx/IDescargarSolicitudService/Descargar",
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
    const paqueteBase64 = extractXmlValue(responseText, "Paquete");
    if (!paqueteBase64) {
      throw new SATError(
        "No se encontró el paquete en la respuesta del SAT",
        "DESCARGA_SIN_PAQUETE"
      );
    }

    return Buffer.from(paqueteBase64, "base64");
  }
}

// --- Utilidades ---

function extractXmlValue(xml: string, tagName: string): string | null {
  // First try as element content (with or without namespace prefix)
  const elemRegex = new RegExp(`<(?:[^:]+:)?${tagName}[^>]*>([^<]+)<`, "i");
  const elemMatch = xml.match(elemRegex);
  if (elemMatch) return elemMatch[1];

  // Then try as attribute value (e.g., IdSolicitud="xxx")
  const attrRegex = new RegExp(`${tagName}="([^"]*)"`, "i");
  const attrMatch = xml.match(attrRegex);
  return attrMatch ? attrMatch[1] : null;
}

// --- Errores tipados ---

export type SATErrorCode =
  | "AUTH_HTTP_ERROR"
  | "AUTH_TOKEN_MISSING"
  | "CERT_RFC_NOT_FOUND"
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
