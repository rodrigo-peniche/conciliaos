/**
 * Detector automático de formato de estado de cuenta bancario
 */

import type { FormatoBancario } from "../normalizer";
import type { RawMovimiento } from "../normalizer";
import { parseBBVA } from "./bbva";
import { parseBanamex } from "./banamex";
import { parseBanorte } from "./banorte";
import { parseOFX } from "./ofx";

export interface DeteccionResult {
  formato: FormatoBancario;
  banco: string;
  confianza: number;
  movimientos: RawMovimiento[];
}

/**
 * Detecta el formato del archivo y lo parsea automáticamente
 */
export function detectarYParsear(
  content: string,
  fileName: string
): DeteccionResult {
  const ext = fileName.toLowerCase().split(".").pop() || "";
  const contentLower = content.toLowerCase();

  // OFX por extensión o contenido
  if (ext === "ofx" || ext === "qfx" || contentLower.includes("<ofx>")) {
    return {
      formato: "ofx",
      banco: detectarBancoOFX(content),
      confianza: 0.95,
      movimientos: parseOFX(content),
    };
  }

  // MT940 por extensión
  if (ext === "mt940" || ext === "sta" || content.startsWith(":20:")) {
    return {
      formato: "mt940",
      banco: "Desconocido",
      confianza: 0.8,
      movimientos: [], // TODO: Implementar parser MT940
    };
  }

  // CSV — detectar banco por contenido
  if (ext === "csv" || ext === "txt" || ext === "xlsx") {
    return detectarCSV(content);
  }

  // Fallback: intentar como CSV genérico
  return detectarCSV(content);
}

function detectarCSV(content: string): DeteccionResult {
  const firstLines = content.split("\n").slice(0, 5).join("\n").toUpperCase();

  // BBVA: columnas simples
  if (
    firstLines.includes("BBVA") ||
    (firstLines.includes("FECHA") &&
      firstLines.includes("CARGO") &&
      firstLines.includes("ABONO") &&
      !firstLines.includes("REFERENCIA") &&
      !firstLines.includes("VALOR"))
  ) {
    return {
      formato: "bbva",
      banco: "BBVA",
      confianza: 0.85,
      movimientos: parseBBVA(content),
    };
  }

  // Banamex: tiene Fecha Operación y Fecha Valor
  if (
    firstLines.includes("BANAMEX") ||
    firstLines.includes("CITIBANAMEX") ||
    (firstLines.includes("FECHA") && firstLines.includes("VALOR"))
  ) {
    return {
      formato: "banamex",
      banco: "Citibanamex",
      confianza: 0.85,
      movimientos: parseBanamex(content),
    };
  }

  // Banorte: tiene REFERENCIA y SALDO CONTABLE
  if (
    firstLines.includes("BANORTE") ||
    (firstLines.includes("REFERENCIA") && firstLines.includes("SALDO"))
  ) {
    return {
      formato: "banorte",
      banco: "Banorte",
      confianza: 0.85,
      movimientos: parseBanorte(content),
    };
  }

  // Fallback: intentar BBVA como formato más genérico
  const movimientos = parseBBVA(content);
  return {
    formato: "csv_generico",
    banco: "Desconocido",
    confianza: 0.5,
    movimientos,
  };
}

function detectarBancoOFX(content: string): string {
  const contentUpper = content.toUpperCase();
  if (contentUpper.includes("BBVA")) return "BBVA";
  if (contentUpper.includes("BANAMEX") || contentUpper.includes("CITI"))
    return "Citibanamex";
  if (contentUpper.includes("BANORTE")) return "Banorte";
  if (contentUpper.includes("HSBC")) return "HSBC";
  if (contentUpper.includes("SANTANDER")) return "Santander";
  if (contentUpper.includes("SCOTIABANK")) return "Scotiabank";
  if (contentUpper.includes("INBURSA")) return "Inbursa";
  if (contentUpper.includes("BANBAJIO") || contentUpper.includes("BAJIO"))
    return "BanBajío";
  return "Desconocido";
}
