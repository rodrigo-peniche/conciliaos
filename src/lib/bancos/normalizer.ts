/**
 * Normalizador de movimientos bancarios
 * Convierte la salida de cada parser a un formato uniforme
 */

import crypto from "crypto";
import { extraerRFCdeTexto } from "@/lib/utils/rfc";
import type { MovimientoNormalizado } from "@/lib/types/conciliaos.types";

export type FormatoBancario = "bbva" | "banamex" | "banorte" | "ofx" | "mt940" | "csv_generico";

export interface RawMovimiento {
  fecha: string;
  fechaValor?: string;
  descripcion: string;
  referencia?: string;
  cargo?: number;
  abono?: number;
  saldo?: number;
  numOperacion?: string;
}

/**
 * Normaliza un movimiento raw al formato interno
 */
export function normalizarMovimiento(raw: RawMovimiento): MovimientoNormalizado {
  const importe = (raw.abono || 0) - (raw.cargo || 0);
  const tipo: "cargo" | "abono" = importe < 0 ? "cargo" : "abono";

  const descripcion = raw.descripcion?.trim() || "";
  const referencia = raw.referencia?.trim() || undefined;

  // Intentar extraer RFC de la descripción
  const rfcContraparte = extraerRFCdeTexto(descripcion) || undefined;

  // Extraer nombre de contraparte de la descripción (heurística)
  const nombreContraparte = extraerNombreContraparte(descripcion);

  // Hash para deduplicación
  const hashInput = `${raw.fecha}|${importe}|${descripcion}|${referencia || ""}`;
  const hash = crypto.createHash("sha256").update(hashInput).digest("hex");

  return {
    fecha: parseFecha(raw.fecha),
    descripcion,
    referencia,
    importe,
    tipo,
    saldo: raw.saldo,
    numOperacion: raw.numOperacion,
    rfcContraparte,
    nombreContraparte,
    hash,
  };
}

/**
 * Parsea una fecha en los formatos comunes de bancos mexicanos
 */
function parseFecha(fechaStr: string): Date {
  const clean = fechaStr.trim();

  // DD/MM/YYYY
  const dmy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
  }

  // DD/MM/YY
  const dmy2 = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (dmy2) {
    const year = parseInt(dmy2[3]) + 2000;
    return new Date(year, parseInt(dmy2[2]) - 1, parseInt(dmy2[1]));
  }

  // YYYY-MM-DD
  const ymd = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
  }

  // DD/MMM/YYYY (Banamex con mes en español)
  const meses: Record<string, number> = {
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
  };
  const dmmmy = clean.match(/^(\d{1,2})\/([a-z]{3})\/(\d{4})$/i);
  if (dmmmy) {
    const mes = meses[dmmmy[2].toLowerCase()];
    if (mes !== undefined) {
      return new Date(parseInt(dmmmy[3]), mes, parseInt(dmmmy[1]));
    }
  }

  // OFX format: YYYYMMDDHHMMSS
  const ofx = clean.match(/^(\d{4})(\d{2})(\d{2})/);
  if (ofx) {
    return new Date(parseInt(ofx[1]), parseInt(ofx[2]) - 1, parseInt(ofx[3]));
  }

  // Fallback
  return new Date(clean);
}

/**
 * Intenta extraer el nombre de la contraparte de la descripción bancaria
 */
function extraerNombreContraparte(descripcion: string): string | undefined {
  // Patrones comunes en SPEI/transferencias
  // "SPEI ENV NOMBRE DE LA PERSONA RFC1234567890"
  const speiMatch = descripcion.match(
    /(?:SPEI|TRANSFER|PAGO|DEP)[^:]*?(?:ENV|REC|DE|A)\s+(.{3,40}?)(?:\s+[A-ZÑ&]{3,4}\d{6}|$)/i
  );
  if (speiMatch) return speiMatch[1].trim();

  return undefined;
}
