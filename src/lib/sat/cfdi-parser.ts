/**
 * Parser de CFDIs XML 4.0
 * Extrae todos los campos y complementos relevantes
 */

import { parseStringPromise } from "xml2js";
import type { CfdiInsert } from "@/lib/types/conciliaos.types";

export interface CfdiConcepto {
  claveProdServ: string;
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  descuento: number;
  importe: number;
  objetoImp?: string;
  ivaTasa?: number;
  ivaImporte?: number;
  isrRetencionTasa?: number;
  isrRetencionImporte?: number;
  cuentaPredial?: string;
}

export interface CfdiRelacion {
  uuid: string;
  tipoRelacion: string;
}

export interface ComplementoPago {
  fechaPago: string;
  formaPago: string;
  monedaPago: string;
  tipoCambioPago?: number;
  monto: number;
  idDocumento: string;
  serie?: string;
  folio?: string;
  monedaDR?: string;
  numParcialidad?: number;
  impSaldoAnterior?: number;
  impPagado?: number;
  impSaldoInsoluto?: number;
}

export interface CfdiParsed {
  cfdi: Omit<CfdiInsert, "empresa_id"> & {
    emisor_nombre: string | null;
    emisor_regimen: string | null;
    receptor_nombre: string | null;
    receptor_regimen: string | null;
    receptor_domicilio_fiscal: string | null;
    receptor_uso_cfdi: string | null;
    subtotal: number;
    descuento: number;
    total: number;
    moneda: string;
    tipo_cambio: number;
    total_mxn: number | null;
    iva_trasladado: number;
    iva_retenido: number;
    isr_retenido: number;
    ieps_trasladado: number;
    forma_pago: string | null;
    metodo_pago: string | null;
    condiciones_pago: string | null;
    tipo_relacion: string | null;
    fecha_certificacion: string | null;
    fecha_timbrado: string | null;
    no_certificado_sat: string | null;
    no_certificado_emisor: string | null;
    sello_cfd: string | null;
    sello_sat: string | null;
    cadena_original: string | null;
    xml_raw: string | null;
  };
  conceptos: CfdiConcepto[];
  relaciones: CfdiRelacion[];
  complementosPago: ComplementoPago[];
}

/**
 * Parsea un XML de CFDI 4.0 y extrae todos los campos
 */
export async function parseCfdiXml(xml: string): Promise<CfdiParsed> {
  const result = await parseStringPromise(xml, {
    explicitArray: false,
    ignoreAttrs: false,
    tagNameProcessors: [(name: string) => name.replace(/^.*:/, "")],
    attrNameProcessors: [(name: string) => name.replace(/^.*:/, "")],
  });

  const comprobante = result.Comprobante?.$;
  if (!comprobante) {
    throw new Error("XML no contiene nodo Comprobante válido");
  }

  const emisor = result.Comprobante?.Emisor?.$;
  const receptor = result.Comprobante?.Receptor?.$;
  const complemento = result.Comprobante?.Complemento;
  const timbreFiscal = getTimbreFiscal(complemento);

  // Parsear tipo de CFDI
  const tipoMap: Record<string, CfdiInsert["tipo"]> = {
    I: "ingreso",
    E: "egreso",
    T: "traslado",
    P: "pago",
    N: "nomina",
  };
  const tipo = tipoMap[comprobante.TipoDeComprobante] || "ingreso";

  // Parsear impuestos
  const impuestos = parseImpuestos(result.Comprobante?.Impuestos);

  // Parsear conceptos
  const conceptos = parseConceptos(result.Comprobante?.Conceptos);

  // Parsear relaciones
  const relaciones = parseRelaciones(result.Comprobante?.CfdiRelacionados);

  // Parsear complementos de pago
  const complementosPago = parseComplementosPago(complemento);

  const subtotal = parseFloat(comprobante.SubTotal || "0");
  const descuento = parseFloat(comprobante.Descuento || "0");
  const total = parseFloat(comprobante.Total || "0");
  const tipoCambio = parseFloat(comprobante.TipoCambio || "1");
  const moneda = comprobante.Moneda || "MXN";

  const cfdi: CfdiParsed["cfdi"] = {
    uuid: timbreFiscal?.UUID || "",
    tipo,
    version: comprobante.Version || "4.0",
    emisor_rfc: emisor?.Rfc || "",
    emisor_nombre: emisor?.Nombre || null,
    emisor_regimen: emisor?.RegimenFiscal || null,
    receptor_rfc: receptor?.Rfc || "",
    receptor_nombre: receptor?.Nombre || null,
    receptor_regimen: receptor?.RegimenFiscalReceptor || null,
    receptor_domicilio_fiscal: receptor?.DomicilioFiscalReceptor || null,
    receptor_uso_cfdi: receptor?.UsoCFDI || null,
    subtotal,
    descuento,
    total,
    moneda,
    tipo_cambio: tipoCambio,
    total_mxn: moneda === "MXN" ? total : total * tipoCambio,
    iva_trasladado: impuestos.ivaTrasladado,
    iva_retenido: impuestos.ivaRetenido,
    isr_retenido: impuestos.isrRetenido,
    ieps_trasladado: impuestos.iepsTrasladado,
    forma_pago: comprobante.FormaPago || null,
    metodo_pago: comprobante.MetodoPago || null,
    condiciones_pago: comprobante.CondicionesDePago || null,
    tipo_relacion: null,
    fecha_emision: comprobante.Fecha || new Date().toISOString(),
    fecha_certificacion: timbreFiscal?.FechaTimbrado || null,
    fecha_timbrado: timbreFiscal?.FechaTimbrado || null,
    no_certificado_sat: timbreFiscal?.NoCertificadoSAT || null,
    no_certificado_emisor: comprobante.NoCertificado || null,
    sello_cfd: comprobante.Sello?.substring(0, 100) || null,
    sello_sat: timbreFiscal?.SelloSAT?.substring(0, 100) || null,
    cadena_original: null,
    xml_raw: xml,
  };

  return { cfdi, conceptos, relaciones, complementosPago };
}

// --- Helpers de parseo ---

function getTimbreFiscal(complemento: Record<string, unknown> | undefined): Record<string, string> | null {
  if (!complemento) return null;
  const tfd = (complemento as Record<string, unknown>)["TimbreFiscalDigital"];
  if (!tfd) return null;
  return (tfd as Record<string, Record<string, string>>).$ || null;
}

interface ImpuestosParsed {
  ivaTrasladado: number;
  ivaRetenido: number;
  isrRetenido: number;
  iepsTrasladado: number;
}

function parseImpuestos(impuestosNode: Record<string, unknown> | undefined): ImpuestosParsed {
  const result: ImpuestosParsed = {
    ivaTrasladado: 0,
    ivaRetenido: 0,
    isrRetenido: 0,
    iepsTrasladado: 0,
  };

  if (!impuestosNode) return result;

  // Traslados
  const traslados = getArray(
    (impuestosNode as Record<string, Record<string, unknown>>)?.Traslados,
    "Traslado"
  );
  for (const t of traslados) {
    const attrs = (t as Record<string, Record<string, string>>)?.$ || t;
    const impuesto = attrs.Impuesto || (attrs as Record<string, string>).Impuesto;
    const importe = parseFloat((attrs.Importe || (attrs as Record<string, string>).Importe || "0") as string);
    if (impuesto === "002") result.ivaTrasladado += importe;
    if (impuesto === "003") result.iepsTrasladado += importe;
  }

  // Retenciones
  const retenciones = getArray(
    (impuestosNode as Record<string, Record<string, unknown>>)?.Retenciones,
    "Retencion"
  );
  for (const r of retenciones) {
    const attrs = (r as Record<string, Record<string, string>>)?.$ || r;
    const impuesto = attrs.Impuesto || (attrs as Record<string, string>).Impuesto;
    const importe = parseFloat((attrs.Importe || (attrs as Record<string, string>).Importe || "0") as string);
    if (impuesto === "001") result.isrRetenido += importe;
    if (impuesto === "002") result.ivaRetenido += importe;
  }

  return result;
}

function parseConceptos(conceptosNode: Record<string, unknown> | undefined): CfdiConcepto[] {
  if (!conceptosNode) return [];
  const items = getArray(conceptosNode, "Concepto");

  return items.map((item) => {
    const attrs = (item as Record<string, Record<string, string>>).$ || item;
    return {
      claveProdServ: (attrs.ClaveProdServ || "") as string,
      noIdentificacion: (attrs.NoIdentificacion || undefined) as string | undefined,
      cantidad: parseFloat((attrs.Cantidad || "1") as string),
      claveUnidad: (attrs.ClaveUnidad || "") as string,
      unidad: (attrs.Unidad || undefined) as string | undefined,
      descripcion: (attrs.Descripcion || "") as string,
      valorUnitario: parseFloat((attrs.ValorUnitario || "0") as string),
      descuento: parseFloat((attrs.Descuento || "0") as string),
      importe: parseFloat((attrs.Importe || "0") as string),
      objetoImp: (attrs.ObjetoImp || undefined) as string | undefined,
    };
  });
}

function parseRelaciones(relacionadosNode: Record<string, unknown> | undefined): CfdiRelacion[] {
  if (!relacionadosNode) return [];
  const attrs = (relacionadosNode as Record<string, Record<string, string>>).$ || {};
  const tipoRelacion = (attrs.TipoRelacion || "") as string;
  const items = getArray(relacionadosNode, "CfdiRelacionado");

  return items.map((item) => {
    const a = (item as Record<string, Record<string, string>>).$ || item;
    return {
      uuid: (a.UUID || "") as string,
      tipoRelacion,
    };
  });
}

function parseComplementosPago(complemento: Record<string, unknown> | undefined): ComplementoPago[] {
  if (!complemento) return [];
  const pagos = (complemento as Record<string, unknown>)["Pagos"] || (complemento as Record<string, unknown>)["pago20:Pagos"];
  if (!pagos) return [];

  const pagoItems = getArray(pagos as Record<string, unknown>, "Pago");
  const result: ComplementoPago[] = [];

  for (const pago of pagoItems) {
    const pagoAttrs = (pago as Record<string, Record<string, string>>).$ || pago;
    const doctos = getArray(pago as Record<string, unknown>, "DoctoRelacionado");

    for (const docto of doctos) {
      const doctoAttrs = (docto as Record<string, Record<string, string>>).$ || docto;
      result.push({
        fechaPago: (pagoAttrs.FechaPago || "") as string,
        formaPago: (pagoAttrs.FormaDePagoP || "") as string,
        monedaPago: (pagoAttrs.MonedaP || "MXN") as string,
        tipoCambioPago: pagoAttrs.TipoCambioP
          ? parseFloat(pagoAttrs.TipoCambioP as string)
          : undefined,
        monto: parseFloat((pagoAttrs.Monto || "0") as string),
        idDocumento: (doctoAttrs.IdDocumento || "") as string,
        serie: (doctoAttrs.Serie || undefined) as string | undefined,
        folio: (doctoAttrs.Folio || undefined) as string | undefined,
        monedaDR: (doctoAttrs.MonedaDR || undefined) as string | undefined,
        numParcialidad: doctoAttrs.NumParcialidad
          ? parseInt(doctoAttrs.NumParcialidad as string, 10)
          : undefined,
        impSaldoAnterior: doctoAttrs.ImpSaldoAnt
          ? parseFloat(doctoAttrs.ImpSaldoAnt as string)
          : undefined,
        impPagado: doctoAttrs.ImpPagado
          ? parseFloat(doctoAttrs.ImpPagado as string)
          : undefined,
        impSaldoInsoluto: doctoAttrs.ImpSaldoInsoluto
          ? parseFloat(doctoAttrs.ImpSaldoInsoluto as string)
          : undefined,
      });
    }
  }

  return result;
}

function getArray(obj: Record<string, unknown> | undefined, key: string): unknown[] {
  if (!obj) return [];
  const val = obj[key];
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}
