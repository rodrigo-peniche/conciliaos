/**
 * Generador de lista de documentos faltantes por CFDI
 */

import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

export interface DocumentoFaltante {
  nombre: string;
  porQue: string;
  comoObtener: string;
  generableEnConciliaOS: boolean;
  importancia: "alta" | "media" | "baja";
}

/**
 * Genera lista específica de documentos faltantes según el CFDI
 */
export function generarDocumentosFaltantes(
  cfdi: Cfdi,
  conciliado: boolean,
  tieneContrato: boolean,
  esProveedorNuevo: boolean
): DocumentoFaltante[] {
  const docs: DocumentoFaltante[] = [];
  const montoAlto = cfdi.total > 10000;
  const esServicio =
    cfdi.tipo === "egreso" || cfdi.receptor_uso_cfdi === "G03";
  const esHonorarios = cfdi.receptor_uso_cfdi === "D01";

  // Contrato
  if (!tieneContrato) {
    docs.push({
      nombre: "Contrato con proveedor",
      porQue:
        "Art. 27 fr. I LISR: los gastos deben estar amparados por documentación comprobatoria",
      comoObtener: "Genera un contrato desde el módulo de contratos de ConciliaOS",
      generableEnConciliaOS: true,
      importancia: montoAlto ? "alta" : "media",
    });
  }

  // Comprobante de pago bancario
  if (!conciliado) {
    docs.push({
      nombre: "Comprobante de pago bancario",
      porQue:
        "Art. 27 fr. III LISR: pagos >$2,000 deben realizarse con medios electrónicos",
      comoObtener:
        "Importa tu estado de cuenta y concilia el movimiento correspondiente",
      generableEnConciliaOS: true,
      importancia: "alta",
    });
  }

  // Orden de compra (montos altos)
  if (montoAlto) {
    docs.push({
      nombre: "Orden de compra o solicitud de servicio",
      porQue:
        "Soporte de la necesidad del gasto como estrictamente indispensable (Art. 27 fr. I LISR)",
      comoObtener:
        "Documento interno de la empresa solicitando el bien o servicio",
      generableEnConciliaOS: false,
      importancia: "media",
    });
  }

  // Acta de entrega (bienes o servicios importantes)
  if (montoAlto || esServicio) {
    docs.push({
      nombre: "Acta de entrega o nota de recepción",
      porQue: "Evidencia de que el bien o servicio fue efectivamente recibido",
      comoObtener:
        "Solicita al proveedor una nota de entrega firmada o genera un acta",
      generableEnConciliaOS: false,
      importancia: montoAlto ? "alta" : "media",
    });
  }

  // Justificación de gasto
  if (montoAlto) {
    docs.push({
      nombre: "Justificación de necesidad empresarial",
      porQue:
        "Art. 27 fr. I LISR: gastos deben ser estrictamente indispensables para la actividad",
      comoObtener: "Documento interno explicando por qué el gasto es necesario",
      generableEnConciliaOS: false,
      importancia: "media",
    });
  }

  // Alta formal de proveedor nuevo
  if (esProveedorNuevo) {
    docs.push({
      nombre: "Alta formal de proveedor",
      porQue:
        "Diligencia debida: verificar existencia y capacidad del proveedor",
      comoObtener:
        "Solicita constancia de situación fiscal y comprobante de domicilio al proveedor",
      generableEnConciliaOS: false,
      importancia: "alta",
    });
  }

  // Honorarios: constancia de retenciones
  if (esHonorarios) {
    docs.push({
      nombre: "Constancia de retenciones",
      porQue: "Art. 106 LISR: obligación de retener ISR por honorarios",
      comoObtener: "Genera la constancia anual de retenciones para el prestador",
      generableEnConciliaOS: false,
      importancia: "media",
    });
  }

  // Ordenar por importancia
  const orden = { alta: 0, media: 1, baja: 2 };
  docs.sort((a, b) => orden[a.importancia] - orden[b.importancia]);

  return docs;
}
