/**
 * Parser para archivos OFX (Open Financial Exchange)
 * Formato universal usado por la mayoría de los bancos
 * Tags clave: STMTTRN, DTPOSTED, TRNAMT, NAME, MEMO, FITID
 */

import type { RawMovimiento } from "../normalizer";

export function parseOFX(content: string): RawMovimiento[] {
  const movimientos: RawMovimiento[] = [];

  // Extraer todas las transacciones <STMTTRN>...</STMTTRN>
  const transRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = transRegex.exec(content)) !== null) {
    const block = match[1];

    const dtPosted = extractOFXValue(block, "DTPOSTED");
    const trnAmt = extractOFXValue(block, "TRNAMT");
    const name = extractOFXValue(block, "NAME");
    const memo = extractOFXValue(block, "MEMO");
    const fitId = extractOFXValue(block, "FITID");
    const trnType = extractOFXValue(block, "TRNTYPE");
    const checkNum = extractOFXValue(block, "CHECKNUM");

    if (!dtPosted || !trnAmt) continue;

    const amount = parseFloat(trnAmt);
    const descripcion = [name, memo].filter(Boolean).join(" - ");

    // OFX fecha formato: YYYYMMDDHHMMSS
    const fecha = formatOFXDate(dtPosted);

    movimientos.push({
      fecha,
      descripcion: descripcion || trnType || "Sin descripción",
      referencia: checkNum || fitId || undefined,
      cargo: amount < 0 ? Math.abs(amount) : 0,
      abono: amount > 0 ? amount : 0,
      numOperacion: fitId || undefined,
    });
  }

  return movimientos;
}

/**
 * Extrae el valor de un tag OFX
 * OFX no es XML estándar, puede no tener tags de cierre
 */
function extractOFXValue(block: string, tag: string): string | null {
  // Con tag de cierre: <TAG>value</TAG>
  const closedRegex = new RegExp(`<${tag}>([^<]*)</${tag}>`, "i");
  const closedMatch = block.match(closedRegex);
  if (closedMatch) return closedMatch[1].trim();

  // Sin tag de cierre: <TAG>value\n
  const openRegex = new RegExp(`<${tag}>([^\n<]+)`, "i");
  const openMatch = block.match(openRegex);
  if (openMatch) return openMatch[1].trim();

  return null;
}

/**
 * Convierte fecha OFX (YYYYMMDD...) a DD/MM/YYYY
 */
function formatOFXDate(ofxDate: string): string {
  const clean = ofxDate.replace(/\[.*\]/, "").trim();
  const year = clean.substring(0, 4);
  const month = clean.substring(4, 6);
  const day = clean.substring(6, 8);
  return `${day}/${month}/${year}`;
}
