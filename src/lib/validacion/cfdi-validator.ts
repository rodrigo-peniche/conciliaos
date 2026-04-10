/**
 * Validador completo de CFDIs 4.0 conforme al SAT
 * Art. 29-A CFF y requisitos de deducibilidad
 */

import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

export interface ValidacionItem {
  id: string;
  categoria: "tecnica" | "contenido" | "fiscal";
  descripcion: string;
  resultado: "ok" | "warning" | "error";
  detalle: string;
  fundamento?: string;
}

export interface ValidationResult {
  cfdiId: string;
  validaciones: ValidacionItem[];
  score: number; // 0-100
  errores: number;
  advertencias: number;
  ok: number;
}

// UUID v4 regex
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// RFC patterns
const RFC_MORAL = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;
const RFC_FISICA = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const RFC_GENERICO = /^(XAXX010101000|XEXX010101000)$/;

// Formas de pago válidas para PUE
const FORMAS_PAGO_VALIDAS = [
  "01", "02", "03", "04", "05", "06", "08", "12", "13", "14", "15",
  "17", "23", "24", "25", "26", "27", "28", "29", "30", "31",
];

/**
 * Ejecuta todas las validaciones sobre un CFDI
 */
export function validateCFDI(
  cfdi: Cfdi,
  empresa: Empresa
): ValidationResult {
  const validaciones: ValidacionItem[] = [];

  // === VALIDACIONES TÉCNICAS (art. 29-A CFF) ===

  // 1. RFC emisor válido
  const rfcEmisorValido =
    RFC_MORAL.test(cfdi.emisor_rfc) ||
    RFC_FISICA.test(cfdi.emisor_rfc) ||
    RFC_GENERICO.test(cfdi.emisor_rfc);
  validaciones.push({
    id: "rfc_emisor",
    categoria: "tecnica",
    descripcion: "RFC emisor con estructura válida",
    resultado: rfcEmisorValido ? "ok" : "error",
    detalle: rfcEmisorValido
      ? `RFC: ${cfdi.emisor_rfc}`
      : `RFC inválido: ${cfdi.emisor_rfc}`,
    fundamento: "Art. 29-A fr. I CFF",
  });

  // 2. RFC receptor = empresa
  const rfcReceptorCorrecto =
    cfdi.receptor_rfc.toUpperCase() === empresa.rfc.toUpperCase();
  validaciones.push({
    id: "rfc_receptor",
    categoria: "tecnica",
    descripcion: "RFC receptor coincide con empresa",
    resultado: rfcReceptorCorrecto ? "ok" : "error",
    detalle: rfcReceptorCorrecto
      ? `RFC receptor: ${cfdi.receptor_rfc}`
      : `Esperado: ${empresa.rfc}, Recibido: ${cfdi.receptor_rfc}`,
    fundamento: "Art. 29-A fr. IV CFF",
  });

  // 3. Nombre receptor
  if (cfdi.receptor_nombre && empresa.razon_social) {
    const sim = similaridadTexto(
      cfdi.receptor_nombre.toUpperCase(),
      empresa.razon_social.toUpperCase()
    );
    validaciones.push({
      id: "nombre_receptor",
      categoria: "tecnica",
      descripcion: "Nombre receptor correcto",
      resultado: sim >= 0.8 ? "ok" : sim >= 0.5 ? "warning" : "error",
      detalle: `Similitud: ${Math.round(sim * 100)}% — CFDI: "${cfdi.receptor_nombre}"`,
      fundamento: "Art. 29-A fr. IV CFF",
    });
  }

  // 4. Código postal receptor
  if (cfdi.receptor_domicilio_fiscal) {
    const cpCorrecto =
      cfdi.receptor_domicilio_fiscal === empresa.codigo_postal;
    validaciones.push({
      id: "cp_receptor",
      categoria: "tecnica",
      descripcion: "Código postal receptor correcto (CFDI 4.0)",
      resultado: cpCorrecto ? "ok" : "error",
      detalle: cpCorrecto
        ? `C.P. ${cfdi.receptor_domicilio_fiscal}`
        : `Esperado: ${empresa.codigo_postal}, Recibido: ${cfdi.receptor_domicilio_fiscal}`,
      fundamento: "CFDI 4.0 — campo obligatorio",
    });
  }

  // 5. Régimen fiscal receptor
  if (cfdi.receptor_regimen) {
    const regimenCorrecto =
      cfdi.receptor_regimen === empresa.regimen_codigo;
    validaciones.push({
      id: "regimen_receptor",
      categoria: "tecnica",
      descripcion: "Régimen fiscal receptor válido",
      resultado: regimenCorrecto ? "ok" : "warning",
      detalle: regimenCorrecto
        ? `Régimen: ${cfdi.receptor_regimen}`
        : `Esperado: ${empresa.regimen_codigo}, Recibido: ${cfdi.receptor_regimen}`,
      fundamento: "Art. 29-A fr. IV CFF",
    });
  }

  // 8. UUID formato correcto
  validaciones.push({
    id: "uuid_formato",
    categoria: "tecnica",
    descripcion: "UUID formato correcto (v4)",
    resultado: UUID_REGEX.test(cfdi.uuid) ? "ok" : "error",
    detalle: `UUID: ${cfdi.uuid}`,
    fundamento: "Estándar UUID v4",
  });

  // 9. Fecha emisión no futura
  const fechaEmision = new Date(cfdi.fecha_emision);
  const ahora = new Date();
  validaciones.push({
    id: "fecha_emision",
    categoria: "tecnica",
    descripcion: "Fecha emisión no futura",
    resultado: fechaEmision <= ahora ? "ok" : "error",
    detalle: `Fecha: ${cfdi.fecha_emision}`,
    fundamento: "Art. 29-A fr. III CFF",
  });

  // 11. No cancelado
  validaciones.push({
    id: "no_cancelado",
    categoria: "tecnica",
    descripcion: "CFDI no cancelado",
    resultado:
      cfdi.estado_sat === "vigente"
        ? "ok"
        : cfdi.estado_sat === "cancelado"
        ? "error"
        : "warning",
    detalle: `Estado SAT: ${cfdi.estado_sat}`,
    fundamento: "Art. 29-A CFF",
  });

  // === VALIDACIONES DE CONTENIDO ===

  // 16. Subtotal coherente
  validaciones.push({
    id: "subtotal",
    categoria: "contenido",
    descripcion: "Subtotal coherente",
    resultado: cfdi.subtotal > 0 ? "ok" : "warning",
    detalle: `Subtotal: $${cfdi.subtotal}`,
  });

  // 17. Total = subtotal - descuento + impuestos - retenciones
  const totalEsperado =
    cfdi.subtotal -
    cfdi.descuento +
    cfdi.iva_trasladado +
    cfdi.ieps_trasladado -
    cfdi.iva_retenido -
    cfdi.isr_retenido;
  const diffTotal = Math.abs(cfdi.total - totalEsperado);
  validaciones.push({
    id: "total_cuadra",
    categoria: "contenido",
    descripcion: "Total cuadra con componentes",
    resultado: diffTotal < 1 ? "ok" : diffTotal < 10 ? "warning" : "error",
    detalle: `Total: $${cfdi.total}, Esperado: $${totalEsperado.toFixed(2)}, Diff: $${diffTotal.toFixed(2)}`,
    fundamento: "Art. 29-A fr. VII CFF",
  });

  // 18. Forma/método de pago
  if (cfdi.metodo_pago === "PUE" && cfdi.forma_pago) {
    const formaValida = FORMAS_PAGO_VALIDAS.includes(cfdi.forma_pago);
    validaciones.push({
      id: "forma_pago_pue",
      categoria: "contenido",
      descripcion: "Forma de pago válida para PUE",
      resultado: formaValida ? "ok" : "warning",
      detalle: `Método: ${cfdi.metodo_pago}, Forma: ${cfdi.forma_pago}`,
    });
  }

  if (cfdi.metodo_pago === "PPD" && cfdi.forma_pago && cfdi.forma_pago !== "99") {
    validaciones.push({
      id: "forma_pago_ppd",
      categoria: "contenido",
      descripcion: "PPD debe tener forma de pago 99",
      resultado: "error",
      detalle: `Forma de pago: ${cfdi.forma_pago} (esperado: 99)`,
    });
  }

  // 19. Moneda con tipo de cambio
  if (cfdi.moneda !== "MXN" && cfdi.moneda !== "XXX") {
    validaciones.push({
      id: "tipo_cambio",
      categoria: "contenido",
      descripcion: "Tipo de cambio presente para moneda extranjera",
      resultado: cfdi.tipo_cambio > 0 ? "ok" : "error",
      detalle: `Moneda: ${cfdi.moneda}, TC: ${cfdi.tipo_cambio}`,
    });
  }

  // === VALIDACIONES FISCALES ===

  // 20. Tasa IVA
  if (cfdi.subtotal > 0 && cfdi.iva_trasladado > 0) {
    const tasa = cfdi.iva_trasladado / cfdi.subtotal;
    const tasaCercana16 = Math.abs(tasa - 0.16) < 0.02;
    const tasaCercana8 = Math.abs(tasa - 0.08) < 0.02;
    const tasaCercana0 = tasa < 0.01;

    validaciones.push({
      id: "tasa_iva",
      categoria: "fiscal",
      descripcion: "Tasa IVA correcta",
      resultado:
        tasaCercana16 || tasaCercana8 || tasaCercana0 ? "ok" : "warning",
      detalle: `Tasa efectiva: ${(tasa * 100).toFixed(1)}%`,
      fundamento: "Art. 1 y 2-A LIVA",
    });
  }

  // 21. Retenciones ISR honorarios
  if (cfdi.receptor_uso_cfdi === "D01" && cfdi.isr_retenido === 0) {
    validaciones.push({
      id: "retencion_isr",
      categoria: "fiscal",
      descripcion: "Retención ISR aplicada (honorarios)",
      resultado: "warning",
      detalle: "CFDI con uso D01 (honorarios) sin retención ISR",
      fundamento: "Art. 106 LISR",
    });
  }

  // EFOS
  if (cfdi.efos_verificado) {
    validaciones.push({
      id: "efos",
      categoria: "fiscal",
      descripcion: "Emisor no está en lista EFOS",
      resultado:
        cfdi.efos_resultado === "limpio" || !cfdi.efos_resultado
          ? "ok"
          : "error",
      detalle: cfdi.efos_resultado || "Limpio",
      fundamento: "Art. 69-B CFF",
    });
  }

  // Calcular score
  const errores = validaciones.filter((v) => v.resultado === "error").length;
  const advertencias = validaciones.filter(
    (v) => v.resultado === "warning"
  ).length;
  const oks = validaciones.filter((v) => v.resultado === "ok").length;
  const total = validaciones.length;
  const score = total > 0 ? Math.round((oks / total) * 100) : 0;

  return {
    cfdiId: cfdi.id,
    validaciones,
    score,
    errores,
    advertencias,
    ok: oks,
  };
}

/**
 * Similaridad de textos (Jaccard sobre palabras)
 */
function similaridadTexto(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.split(/\s+/).filter(Boolean));
  const inter = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? inter.size / union.size : 0;
}
