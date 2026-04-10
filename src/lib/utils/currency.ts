/**
 * Utilidades de formateo de moneda mexicana
 */

const MXN_FORMATTER = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MXN_COMPACT_FORMATTER = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  notation: "compact",
  compactDisplay: "short",
});

/**
 * Formatea un número como moneda mexicana: $1,234.56
 */
export function formatMXN(amount: number): string {
  return MXN_FORMATTER.format(amount);
}

/**
 * Formatea un número como moneda compacta: $1.2M
 */
export function formatMXNCompact(amount: number): string {
  return MXN_COMPACT_FORMATTER.format(amount);
}

/**
 * Formatea un porcentaje: 85.50%
 */
export function formatPct(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Parsea un string de moneda a número
 */
export function parseMXN(value: string): number {
  return parseFloat(value.replace(/[$,\s]/g, "")) || 0;
}
