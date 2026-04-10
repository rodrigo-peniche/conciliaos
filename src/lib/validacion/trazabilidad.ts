/**
 * Checklist de trazabilidad documental
 * Score de 0-100 basado en documentación completa
 */

import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

export interface ChecklistItem {
  id: string;
  descripcion: string;
  peso: number;
  cumplido: boolean;
  detalle: string;
  comoObtener?: string;
  generableEnConciliaOS?: boolean;
}

/**
 * Genera el checklist de trazabilidad para un CFDI
 */
export function generateTrazabilidadChecklist(
  cfdi: Cfdi,
  tieneContrato: boolean = false,
  tieneRecepcion: boolean = false,
  tieneOrdenCompra: boolean = false
): { items: ChecklistItem[]; score: number } {
  const items: ChecklistItem[] = [
    {
      id: "cfdi_vigente",
      descripcion: "CFDI vigente en SAT",
      peso: 20,
      cumplido: cfdi.estado_sat === "vigente",
      detalle:
        cfdi.estado_sat === "vigente"
          ? "Verificado como vigente"
          : `Estado: ${cfdi.estado_sat}`,
    },
    {
      id: "efos_limpio",
      descripcion: "Emisor no en lista EFOS/EDOS",
      peso: 20,
      cumplido:
        cfdi.efos_verificado &&
        (!cfdi.efos_resultado || cfdi.efos_resultado === "limpio"),
      detalle: cfdi.efos_verificado
        ? cfdi.efos_resultado || "Limpio"
        : "No verificado",
    },
    {
      id: "conciliado",
      descripcion: "Conciliado con movimiento bancario",
      peso: 20,
      cumplido: cfdi.conciliado,
      detalle: cfdi.conciliado
        ? `Conciliado el ${cfdi.conciliado_at ? new Date(cfdi.conciliado_at).toLocaleDateString("es-MX") : "—"}`
        : "No conciliado",
    },
    {
      id: "contrato",
      descripcion: "Contrato con proveedor vinculado",
      peso: 15,
      cumplido: tieneContrato,
      detalle: tieneContrato
        ? "Contrato vigente encontrado"
        : "Sin contrato vinculado",
      comoObtener: "Genera un contrato desde el módulo de contratos",
      generableEnConciliaOS: true,
    },
    {
      id: "recepcion",
      descripcion: "Comprobante de recepción/entrega",
      peso: 10,
      cumplido: tieneRecepcion,
      detalle: tieneRecepcion ? "Documento adjunto" : "Sin comprobante",
      comoObtener: "Adjunta acta de entrega o nota de recepción",
    },
    {
      id: "orden_compra",
      descripcion: "Orden de compra previa",
      peso: 10,
      cumplido: tieneOrdenCompra,
      detalle: tieneOrdenCompra ? "Documento adjunto" : "Sin orden de compra",
      comoObtener: "Adjunta la orden de compra o solicitud de servicio",
    },
    {
      id: "cfdi_40_valido",
      descripcion: "Cumple requisitos CFDI 4.0",
      peso: 5,
      cumplido:
        cfdi.receptor_domicilio_fiscal !== null &&
        cfdi.receptor_regimen !== null,
      detalle:
        cfdi.receptor_domicilio_fiscal && cfdi.receptor_regimen
          ? "CFDI 4.0 completo"
          : "Faltan datos de CFDI 4.0 (C.P. o régimen receptor)",
    },
  ];

  const score = items.reduce(
    (sum, item) => sum + (item.cumplido ? item.peso : 0),
    0
  );

  return { items, score };
}
