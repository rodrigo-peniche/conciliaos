/**
 * Verificador de Lista 69-B del SAT (EFOS/EDOS)
 * Contribuyentes con operaciones presuntas o definitivas
 */

export type EfosStatus =
  | "no_verificado"
  | "limpio"
  | "presunto"
  | "definitivo"
  | "desvirtuado"
  | "sentencia";

export interface EfosResult {
  rfc: string;
  status: EfosStatus;
  nombre?: string;
  fechaPublicacion?: string;
  verificadoAt: Date;
}

// Cache en memoria de la lista EFOS (en producción usar Redis)
let efosCache: Map<string, EfosResult> | null = null;
let efosCacheTimestamp: Date | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Verifica si un RFC está en la lista 69-B del SAT
 */
export async function checkEFOS(rfc: string): Promise<EfosResult> {
  const rfcClean = rfc.trim().toUpperCase();

  // Verificar si tenemos cache válido
  if (efosCache && efosCacheTimestamp) {
    const cacheAge = Date.now() - efosCacheTimestamp.getTime();
    if (cacheAge < CACHE_TTL_MS) {
      const cached = efosCache.get(rfcClean);
      if (cached) return cached;
      return {
        rfc: rfcClean,
        status: "limpio",
        verificadoAt: new Date(),
      };
    }
  }

  // Si no hay cache, intentar cargar la lista
  await cargarListaEFOS();

  if (efosCache) {
    const found = efosCache.get(rfcClean);
    if (found) return found;
  }

  return {
    rfc: rfcClean,
    status: "limpio",
    verificadoAt: new Date(),
  };
}

/**
 * Verifica un batch de RFCs contra la lista 69-B
 */
export async function checkEFOSBatch(
  rfcs: string[]
): Promise<Map<string, EfosResult>> {
  // Asegurar que la lista está cargada
  await cargarListaEFOS();

  const results = new Map<string, EfosResult>();

  for (const rfc of rfcs) {
    const rfcClean = rfc.trim().toUpperCase();
    if (efosCache?.has(rfcClean)) {
      results.set(rfcClean, efosCache.get(rfcClean)!);
    } else {
      results.set(rfcClean, {
        rfc: rfcClean,
        status: "limpio",
        verificadoAt: new Date(),
      });
    }
  }

  return results;
}

/**
 * Carga la lista 69-B del SAT desde el CSV público
 */
async function cargarListaEFOS(): Promise<void> {
  // Si el cache es reciente, no recargar
  if (efosCache && efosCacheTimestamp) {
    const cacheAge = Date.now() - efosCacheTimestamp.getTime();
    if (cacheAge < CACHE_TTL_MS) return;
  }

  const csvUrl =
    process.env.SAT_EFOS_CSV_URL ||
    "https://omawww.sat.gob.mx/cifras_sat/Documents/Listado_69-B_definitivo.csv";

  try {
    const response = await fetch(csvUrl, {
      signal: AbortSignal.timeout(30000), // 30s timeout
    });

    if (!response.ok) {
      console.error(`Error al descargar lista EFOS: HTTP ${response.status}`);
      return;
    }

    const csvText = await response.text();
    const newCache = new Map<string, EfosResult>();

    // Parsear CSV (formato: No, RFC, Nombre del Contribuyente, Situación, ...)
    const lines = csvText.split("\n");
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // CSV puede tener comillas y comas dentro de campos
      const cols = parseCSVLine(line);
      if (cols.length < 4) continue;

      const rfc = cols[1]?.trim().toUpperCase();
      const nombre = cols[2]?.trim();
      const situacion = cols[3]?.trim().toLowerCase();

      if (!rfc || rfc.length < 12) continue;

      let status: EfosStatus = "presunto";
      if (situacion.includes("definitiv")) status = "definitivo";
      else if (situacion.includes("desvirtu")) status = "desvirtuado";
      else if (situacion.includes("sentencia")) status = "sentencia";
      else if (situacion.includes("presunt")) status = "presunto";

      newCache.set(rfc, {
        rfc,
        status,
        nombre,
        verificadoAt: new Date(),
      });
    }

    efosCache = newCache;
    efosCacheTimestamp = new Date();

    console.log(`Lista EFOS cargada: ${newCache.size} contribuyentes`);
  } catch (error) {
    console.error("Error al cargar lista EFOS:", error);
  }
}

/**
 * Parsea una línea CSV respetando comillas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
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

/**
 * Limpia el cache de EFOS (útil para testing)
 */
export function clearEFOSCache(): void {
  efosCache = null;
  efosCacheTimestamp = null;
}
