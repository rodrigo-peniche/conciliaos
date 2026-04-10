import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type SatSyncJob = Database["public"]["Tables"]["sat_sync_jobs"]["Row"];

/**
 * SSE endpoint para seguimiento en tiempo real de jobs de sincronización SAT
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  // Configurar SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Poll del estado del job cada 3 segundos
      let running = true;
      const interval = setInterval(async () => {
        try {
          const { data: job, error } = await supabase
            .from("sat_sync_jobs" as never)
            .select("*")
            .eq("id", jobId)
            .single() as { data: SatSyncJob | null; error: unknown };

          if (error || !job) {
            sendEvent({ error: "Job no encontrado", estado: "error" });
            running = false;
            clearInterval(interval);
            controller.close();
            return;
          }

          sendEvent({
            jobId: job.id,
            estado: job.estado,
            tipo: job.tipo,
            totalEncontrados: job.total_encontrados,
            totalDescargados: job.total_descargados,
            totalErrores: job.total_errores,
            errorDetalle: job.error_detalle,
            startedAt: job.started_at,
            finishedAt: job.finished_at,
          });

          // Si el job terminó, cerrar stream
          if (
            job.estado === "completado" ||
            job.estado === "error" ||
            job.estado === "cancelado"
          ) {
            running = false;
            clearInterval(interval);
            controller.close();
          }
        } catch {
          if (running) {
            sendEvent({ error: "Error al consultar estado" });
          }
        }
      }, 3000);

      // Limpiar si el cliente se desconecta
      request.signal.addEventListener("abort", () => {
        running = false;
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
