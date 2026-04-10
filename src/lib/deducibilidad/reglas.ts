/**
 * Motor de reglas de deducibilidad fiscal
 * Basado en artículos 27, 28 y 36 de la LISR
 */

import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

export interface ResultadoRegla {
  deducible: boolean;
  pct: number;
  topeMonto?: number;
  topeRelativo?: number;
  baseCalculo?: string;
  requiereDocumento?: string;
  requiereIA?: boolean;
}

export interface ReglaDeducibilidad {
  id: string;
  nombre: string;
  descripcion: string;
  articuloLey: string;
  clavesProdServ?: string[];
  usoCFDI?: string[];
  evaluar: (cfdi: CfdiParaRegla, empresa: EmpresaParaRegla) => ResultadoRegla;
}

// Subsets de los tipos completos para evitar dependencias circulares
export interface CfdiParaRegla {
  total: number;
  moneda: string;
  receptor_uso_cfdi: string | null;
  conceptos?: Array<{
    clave_prod_serv?: string;
    descripcion?: string;
  }>;
}

export interface EmpresaParaRegla {
  regimen_codigo: string;
  objeto_social: string | null;
}

export const REGLAS_DEDUCIBILIDAD: ReglaDeducibilidad[] = [
  {
    id: "automoviles",
    nombre: "Automóviles — límite de inversión",
    descripcion:
      "Art. 36 fracción II LISR: el MOI máximo deducible para automóviles es $175,000",
    articuloLey: "Art. 36 fr. II LISR",
    clavesProdServ: ["84111506", "78131801", "25101500", "25101501"],
    evaluar: (cfdi) => {
      const TOPE = 175000;
      if (cfdi.total > TOPE) {
        return {
          deducible: true,
          pct: Math.round((TOPE / cfdi.total) * 100 * 100) / 100,
          topeMonto: TOPE,
        };
      }
      return { deducible: true, pct: 100 };
    },
  },
  {
    id: "restaurantes",
    nombre: "Alimentos en restaurantes — 8.5%",
    descripcion:
      "Art. 28 fracción XX LISR: consumos en restaurantes deducibles al 8.5%",
    articuloLey: "Art. 28 fr. XX LISR",
    clavesProdServ: ["90111800", "90111801", "90111802", "90101500"],
    evaluar: () => ({
      deducible: true,
      pct: 8.5,
    }),
  },
  {
    id: "viaticos",
    nombre: "Viáticos — requisitos especiales",
    descripcion:
      "Art. 28 fracción V LISR: viáticos deducibles con CFDI y destino fuera de 50km del domicilio",
    articuloLey: "Art. 28 fr. V LISR",
    usoCFDI: ["D01"],
    evaluar: () => ({
      deducible: true,
      pct: 100,
      requiereDocumento: "Justificación de destino y distancia (>50km)",
    }),
  },
  {
    id: "donativos",
    nombre: "Donativos — máximo 7% de utilidad fiscal",
    descripcion:
      "Art. 27 fracción I LISR: donativos deducibles hasta 7% de la utilidad fiscal del ejercicio anterior",
    articuloLey: "Art. 27 fr. I LISR",
    usoCFDI: ["D04", "D05"],
    evaluar: () => ({
      deducible: true,
      pct: 100,
      topeRelativo: 0.07,
      baseCalculo: "utilidad_fiscal",
    }),
  },
  {
    id: "arrendamiento_auto",
    nombre: "Arrendamiento de automóviles — tope diario",
    descripcion:
      "Art. 28 fracción XIII LISR: arrendamiento de autos máximo $200/día por vehículo",
    articuloLey: "Art. 28 fr. XIII LISR",
    clavesProdServ: ["78111801", "78111802"],
    evaluar: (cfdi) => {
      const TOPE_DIARIO = 200;
      const TOPE_MENSUAL = TOPE_DIARIO * 30;
      if (cfdi.total > TOPE_MENSUAL) {
        return {
          deducible: true,
          pct: Math.round((TOPE_MENSUAL / cfdi.total) * 100 * 100) / 100,
          topeMonto: TOPE_MENSUAL,
        };
      }
      return { deducible: true, pct: 100 };
    },
  },
  {
    id: "combustible",
    nombre: "Combustible — pago bancarizado",
    descripcion:
      "Art. 27 fracción III LISR: combustible solo deducible si se paga con medios electrónicos",
    articuloLey: "Art. 27 fr. III LISR",
    clavesProdServ: ["15101506", "15101505"],
    evaluar: () => ({
      deducible: true,
      pct: 100,
      requiereDocumento: "Comprobante de pago con tarjeta/transferencia (no efectivo)",
    }),
  },
  {
    id: "no_objeto_social",
    nombre: "Gasto no relacionado con actividad",
    descripcion:
      "Art. 27 fracción I LISR: los gastos deben ser estrictamente indispensables para la actividad",
    articuloLey: "Art. 27 fr. I LISR",
    evaluar: () => ({
      deducible: false,
      pct: 0,
      requiereIA: true,
    }),
  },
];

/**
 * Evalúa un CFDI contra todas las reglas y retorna el resultado más restrictivo aplicable
 */
export function evaluarDeducibilidad(
  cfdi: Cfdi,
  empresa: Empresa
): {
  reglaAplicada: ReglaDeducibilidad | null;
  resultado: ResultadoRegla;
} {
  const cfdiParaRegla: CfdiParaRegla = {
    total: cfdi.total,
    moneda: cfdi.moneda,
    receptor_uso_cfdi: cfdi.receptor_uso_cfdi,
  };

  const empresaParaRegla: EmpresaParaRegla = {
    regimen_codigo: cfdi.emisor_regimen || empresa.regimen_codigo,
    objeto_social: empresa.objeto_social,
  };

  // Buscar regla por uso de CFDI
  for (const regla of REGLAS_DEDUCIBILIDAD) {
    if (regla.usoCFDI && cfdi.receptor_uso_cfdi) {
      if (regla.usoCFDI.includes(cfdi.receptor_uso_cfdi)) {
        return {
          reglaAplicada: regla,
          resultado: regla.evaluar(cfdiParaRegla, empresaParaRegla),
        };
      }
    }
  }

  // Si no se encontró regla específica, aplicar la regla genérica "no_objeto_social"
  // que requiere análisis de IA
  const reglaGenerica = REGLAS_DEDUCIBILIDAD.find((r) => r.id === "no_objeto_social")!;
  return {
    reglaAplicada: reglaGenerica,
    resultado: reglaGenerica.evaluar(cfdiParaRegla, empresaParaRegla),
  };
}

/**
 * Genera checklist de documentos faltantes para soporte de deducibilidad
 */
export function generarDocumentosFaltantes(
  cfdi: Cfdi,
  conciliado: boolean
): Array<{ documento: string; requerido: boolean; presente: boolean }> {
  const montoAlto = cfdi.total > 50000;

  return [
    {
      documento: "Contrato con proveedor",
      requerido: true,
      presente: false,
    },
    {
      documento: "Orden de compra",
      requerido: montoAlto,
      presente: false,
    },
    {
      documento: "Acta/nota de entrega",
      requerido: montoAlto,
      presente: false,
    },
    {
      documento: "Comprobante de pago bancario",
      requerido: true,
      presente: conciliado,
    },
    {
      documento: "Justificación de necesidad empresarial",
      requerido: montoAlto,
      presente: false,
    },
  ];
}
