/**
 * Validación y utilidades para RFC mexicano
 */

// RFC Persona Moral: 3 letras + 6 dígitos (fecha) + 3 alfanuméricos (homoclave)
const RFC_MORAL_REGEX = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

// RFC Persona Física: 4 letras + 6 dígitos (fecha) + 3 alfanuméricos (homoclave)
const RFC_FISICA_REGEX = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;

// RFC genérico para público en general y extranjeros
const RFC_GENERICO = "XAXX010101000";
const RFC_EXTRANJERO = "XEXX010101000";

/**
 * Valida la estructura de un RFC mexicano
 */
export function validarRFC(rfc: string): {
  valido: boolean;
  tipo: "moral" | "fisica" | "generico" | "extranjero" | null;
  error?: string;
} {
  const rfcClean = rfc.trim().toUpperCase();

  if (!rfcClean) {
    return { valido: false, tipo: null, error: "RFC vacío" };
  }

  if (rfcClean === RFC_GENERICO) {
    return { valido: true, tipo: "generico" };
  }

  if (rfcClean === RFC_EXTRANJERO) {
    return { valido: true, tipo: "extranjero" };
  }

  if (rfcClean.length === 12 && RFC_MORAL_REGEX.test(rfcClean)) {
    const fechaValida = validarFechaRFC(rfcClean.substring(3, 9));
    if (!fechaValida) {
      return { valido: false, tipo: null, error: "Fecha en RFC inválida" };
    }
    return { valido: true, tipo: "moral" };
  }

  if (rfcClean.length === 13 && RFC_FISICA_REGEX.test(rfcClean)) {
    const fechaValida = validarFechaRFC(rfcClean.substring(4, 10));
    if (!fechaValida) {
      return { valido: false, tipo: null, error: "Fecha en RFC inválida" };
    }
    return { valido: true, tipo: "fisica" };
  }

  return {
    valido: false,
    tipo: null,
    error: `Formato inválido. PM: 12 caracteres (3 letras + 6 dígitos + 3 homoclave). PF: 13 caracteres (4 letras + 6 dígitos + 3 homoclave)`,
  };
}

/**
 * Valida la porción de fecha dentro de un RFC (AAMMDD)
 */
function validarFechaRFC(fecha: string): boolean {
  const anio = parseInt(fecha.substring(0, 2), 10);
  const mes = parseInt(fecha.substring(2, 4), 10);
  const dia = parseInt(fecha.substring(4, 6), 10);

  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;

  // Validar días por mes (simplificado)
  const diasPorMes = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (dia > diasPorMes[mes - 1]) return false;

  // El año puede ser 00-99, representa 1900-2099
  if (anio < 0 || anio > 99) return false;

  return true;
}

/**
 * Formatea un RFC con espacios para legibilidad
 */
export function formatearRFC(rfc: string): string {
  return rfc.trim().toUpperCase();
}

/**
 * Extrae RFC de un texto (útil para descripciones bancarias)
 */
export function extraerRFCdeTexto(texto: string): string | null {
  const regex = /\b[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}\b/gi;
  const matches = texto.match(regex);

  if (!matches) return null;

  // Validar cada match encontrado
  for (const match of matches) {
    const resultado = validarRFC(match);
    if (resultado.valido && resultado.tipo !== "generico" && resultado.tipo !== "extranjero") {
      return match.toUpperCase();
    }
  }

  return null;
}
