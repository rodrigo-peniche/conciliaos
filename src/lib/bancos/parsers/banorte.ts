/**
 * Parser para estados de cuenta CSV de Banorte
 * Formato: FECHA, DESCRIPCION, REFERENCIA, CARGO, ABONO, SALDO CONTABLE
 * Fecha: DD/MM/AAAA
 */

import type { RawMovimiento } from "../normalizer";

export function parseBanorte(csvContent: string): RawMovimiento[] {
  const movimientos: RawMovimiento[] = [];
  const content = csvContent.replace(/^\uFEFF/, "");
  const lines = content.split(/\r?\n/);

  let headerIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].toUpperCase();
    if (line.includes("FECHA") && line.includes("DESCRIPCION")) {
      headerIndex = i;
      break;
    }
  }

  const startLine = headerIndex >= 0 ? headerIndex + 1 : 1;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 5) continue;

    const fecha = cols[0]?.trim();
    const descripcion = cols[1]?.trim();
    const referencia = cols[2]?.trim();
    const cargoStr = cols[3]?.trim().replace(/[$,\s]/g, "");
    const abonoStr = cols[4]?.trim().replace(/[$,\s]/g, "");
    const saldoStr = cols[5]?.trim().replace(/[$,\s]/g, "");

    if (!fecha || !descripcion) continue;
    if (!/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(fecha)) continue;

    const cargo = cargoStr ? parseFloat(cargoStr) || 0 : 0;
    const abono = abonoStr ? parseFloat(abonoStr) || 0 : 0;
    const saldo = saldoStr ? parseFloat(saldoStr) : undefined;

    movimientos.push({
      fecha,
      descripcion,
      referencia: referencia || undefined,
      cargo: Math.abs(cargo),
      abono: Math.abs(abono),
      saldo,
    });
  }

  return movimientos;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
