import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SATDescargaMasiva, SATError } from "@/lib/sat/descarga-masiva";
import { parseCfdiXml } from "@/lib/sat/cfdi-parser";
import CryptoJS from "crypto-js";
import JSZip from "jszip";
import type { Database } from "@/lib/types/database.types";

type SatSyncJobInsert = Database["public"]["Tables"]["sat_sync_jobs"]["Insert"];
type SatSyncJob = Database["public"]["Tables"]["sat_sync_jobs"]["Row"];

export const maxDuration = 60; // Vercel max for free plan

const ENCRYPTION_KEY = process.env.FIEL_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "conciliaos-fiel-key";

/**
 * POST /api/sat/sync
 * Ejecuta la descarga masiva de CFDIs del SAT usando la e.firma de la empresa.
 *
 * Flujo:
 * 1. Valida que la empresa tenga e.firma configurada
 * 2. Descarga .cer y .key de Supabase Storage
 * 3. Desencripta la contraseña
 * 4. Autenticar con SAT → Solicitar → Verificar → Descargar
 * 5. Descomprimir ZIP → Parsear XMLs → Upsert CFDIs en Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { empresaId, fechaInicio, fechaFin, tipo } = body;

    if (!empresaId || !fechaInicio || !fechaFin) {
      return NextResponse.json(
        { error: "empresaId, fechaInicio y fechaFin son requeridos" },
        { status: 400 }
      );
    }

    // Verificar empresa y permisos
    const { data: empresa, error: empError } = await supabase
      .from("empresas")
      .select("id, tenant_id, rfc, efirma_cer_url, efirma_key_url, efirma_password_enc")
      .eq("id", empresaId)
      .single() as {
        data: { id: string; tenant_id: string; rfc: string; efirma_cer_url: string | null; efirma_key_url: string | null; efirma_password_enc: string | null } | null;
        error: unknown;
      };

    if (empError || !empresa) {
      return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 });
    }

    if (empresa.tenant_id !== user.id) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    // Verificar e.firma configurada
    if (!empresa.efirma_cer_url || !empresa.efirma_key_url || !empresa.efirma_password_enc) {
      return NextResponse.json(
        { error: "La empresa no tiene e.firma configurada. Sube tu .cer, .key y contraseña desde la configuración de la empresa." },
        { status: 400 }
      );
    }

    // Crear job de sincronización
    const insertData = {
      empresa_id: empresaId,
      tipo: tipo === "emitidos" ? "cfdi_emitidos" : "cfdi_recibidos",
      estado: "ejecutando",
      fecha_inicio_descarga: fechaInicio,
      fecha_fin_descarga: fechaFin,
      iniciado_por: user.id,
      started_at: new Date().toISOString(),
    } as SatSyncJobInsert;

    const { data: job, error: jobError } = await supabase
      .from("sat_sync_jobs" as never)
      .insert(insertData as never)
      .select()
      .single() as { data: SatSyncJob | null; error: unknown };

    if (jobError || !job) {
      console.error("Error al crear job:", jobError);
      // Continue without job tracking if sat_sync_jobs table doesn't exist
    }

    const jobId = job?.id || "no-job";

    try {
      // Descargar .cer y .key de Supabase Storage
      const { data: cerData, error: cerError } = await supabase.storage
        .from("documentos")
        .download(empresa.efirma_cer_url);

      if (cerError || !cerData) {
        throw new Error(`Error descargando .cer: ${cerError?.message || "archivo no encontrado"}`);
      }

      const { data: keyData, error: keyError } = await supabase.storage
        .from("documentos")
        .download(empresa.efirma_key_url);

      if (keyError || !keyData) {
        throw new Error(`Error descargando .key: ${keyError?.message || "archivo no encontrado"}`);
      }

      // Desencriptar contraseña
      const decryptedBytes = CryptoJS.AES.decrypt(empresa.efirma_password_enc, ENCRYPTION_KEY);
      const password = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!password) {
        throw new Error("No se pudo desencriptar la contraseña de la e.firma");
      }

      // Convertir Blob a Buffer
      const cerBuffer = Buffer.from(await cerData.arrayBuffer());
      const keyBuffer = Buffer.from(await keyData.arrayBuffer());

      // Inicializar cliente SAT
      const sat = new SATDescargaMasiva(cerBuffer, keyBuffer, password);
      const rfc = sat.getRfc();

      // Paso 1: Autenticar
      await updateJob(supabase, jobId, { estado: "ejecutando" });
      await sat.autenticar();

      const fechaInicioDate = new Date(fechaInicio + "T00:00:00");
      const fechaFinDate = new Date(fechaFin + "T23:59:59");

      let totalDescargados = 0;
      let totalErrores = 0;
      let totalEncontrados = 0;
      const mensajes: string[] = [];

      // Descargar AMBOS: recibidos y emitidos (SAT usa operaciones separadas)
      const direcciones: Array<{ direccion: "recibido" | "emitido"; descargaDireccion: "recibidos" | "emitidos"; rfcEmisor?: string; rfcReceptor?: string }> = [
        { direccion: "recibido", descargaDireccion: "recibidos", rfcReceptor: rfc },
        { direccion: "emitido", descargaDireccion: "emitidos", rfcEmisor: rfc },
      ];

      for (const dir of direcciones) {
        try {
          // Paso 2: Solicitar descarga (operación específica por dirección)
          const idSolicitud = await sat.solicitarDescarga({
            rfcSolicitante: rfc,
            rfcReceptor: dir.rfcReceptor,
            rfcEmisor: dir.rfcEmisor,
            fechaInicio: fechaInicioDate,
            fechaFin: fechaFinDate,
            tipoSolicitud: "CFDI",
            direccion: dir.descargaDireccion,
          });

          // Paso 3: Verificar (poll hasta que esté listo, max 10 intentos)
          let verificacion: Awaited<ReturnType<typeof sat.verificarSolicitud>> | null = null;
          for (let i = 0; i < 10; i++) {
            await sleep(3000);
            verificacion = await sat.verificarSolicitud(idSolicitud);

            if (verificacion.estadoSolicitud === "3") break;
            if (verificacion.estadoSolicitud === "4" || verificacion.estadoSolicitud === "5") {
              throw new Error(`SAT error ${dir.direccion}: ${verificacion.mensaje}`);
            }
          }

          if (!verificacion || verificacion.estadoSolicitud !== "3") {
            mensajes.push(`${dir.direccion}: aún en proceso (${verificacion?.numeroCFDIs || 0} encontrados)`);
            continue;
          }

          totalEncontrados += verificacion.numeroCFDIs;

          // Paso 4: Descargar paquetes y procesar XMLs
          for (const idPaquete of verificacion.paquetes) {
            try {
              const zipBuffer = await sat.descargarPaquete(idPaquete);
              const zip = await JSZip.loadAsync(zipBuffer);
              const xmlFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith(".xml"));

              for (const xmlName of xmlFiles) {
                try {
                  const xmlContent = await zip.files[xmlName].async("string");
                  const parsed = await parseCfdiXml(xmlContent);
                  if (!parsed.cfdi.uuid) continue;

                  const { error: upsertError } = await supabase.from("cfdis").upsert({
                    empresa_id: empresaId,
                    uuid: parsed.cfdi.uuid.toUpperCase(),
                    tipo: parsed.cfdi.tipo,
                    version: parsed.cfdi.version,
                    emisor_rfc: parsed.cfdi.emisor_rfc,
                    emisor_nombre: parsed.cfdi.emisor_nombre,
                    emisor_regimen: parsed.cfdi.emisor_regimen,
                    receptor_rfc: parsed.cfdi.receptor_rfc,
                    receptor_nombre: parsed.cfdi.receptor_nombre,
                    receptor_uso_cfdi: parsed.cfdi.receptor_uso_cfdi,
                    subtotal: parsed.cfdi.subtotal,
                    total: parsed.cfdi.total,
                    moneda: parsed.cfdi.moneda,
                    tipo_cambio: parsed.cfdi.tipo_cambio,
                    fecha_emision: parsed.cfdi.fecha_emision,
                    estado_sat: "vigente",
                    direccion: dir.direccion,
                    xml_raw: xmlContent.length < 50000 ? xmlContent : null,
                  } as never, { onConflict: "uuid" });

                  if (upsertError) {
                    console.error(`Error upsert CFDI ${xmlName}:`, upsertError);
                    totalErrores++;
                  } else {
                    totalDescargados++;
                  }
                } catch (parseErr) {
                  console.error(`Error parsing ${xmlName}:`, parseErr);
                  totalErrores++;
                }
              }
            } catch (pkgErr) {
              console.error(`Error paquete ${idPaquete}:`, pkgErr);
              totalErrores++;
            }
          }

          mensajes.push(`${dir.direccion}: ${verificacion.numeroCFDIs} encontrados`);
        } catch (dirErr) {
          const msg = dirErr instanceof Error ? dirErr.message : "Error desconocido";
          mensajes.push(`${dir.direccion}: error - ${msg}`);
          console.error(`Error descargando ${dir.direccion}:`, dirErr);
        }
      }

      // Actualizar job como completado
      await updateJob(supabase, jobId, {
        estado: "completado",
        total_encontrados: totalEncontrados,
        total_descargados: totalDescargados,
        total_errores: totalErrores,
        finished_at: new Date().toISOString(),
      });

      // Actualizar fecha de sincronización
      await supabase
        .from("empresas")
        .update({ sat_sincronizado_at: new Date().toISOString() } as never)
        .eq("id", empresaId);

      return NextResponse.json({
        jobId,
        estado: "completado",
        totalEncontrados,
        totalDescargados,
        totalErrores,
        detalle: mensajes,
        mensaje: `Descarga completada: ${totalDescargados} CFDIs procesados (${mensajes.join(", ")})${totalErrores > 0 ? `. ${totalErrores} errores.` : "."}`,
      });

    } catch (satErr) {
      const errorMsg = satErr instanceof SATError
        ? `[${satErr.code}] ${satErr.message}`
        : satErr instanceof Error
          ? satErr.message
          : "Error desconocido";

      console.error("Error SAT sync:", errorMsg);

      await updateJob(supabase, jobId, {
        estado: "error",
        error_detalle: errorMsg,
        finished_at: new Date().toISOString(),
      });

      return NextResponse.json(
        { jobId, error: errorMsg },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error en /api/sat/sync:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}

async function updateJob(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  updates: Record<string, unknown>
) {
  if (jobId === "no-job") return;
  try {
    await supabase
      .from("sat_sync_jobs" as never)
      .update(updates as never)
      .eq("id", jobId);
  } catch {
    // Non-critical - don't fail the sync for job tracking errors
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
