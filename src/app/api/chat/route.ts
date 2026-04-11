import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

/**
 * POST /api/chat — Chat fiscal IA con streaming SSE
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { messages, empresaId } = await request.json();

  if (!messages || !empresaId) {
    return new Response("messages y empresaId son requeridos", { status: 400 });
  }

  // Obtener datos de la empresa para contexto
  const { data: empresa } = (await supabase
    .from("empresas" as never)
    .select("*")
    .eq("id", empresaId)
    .single()) as { data: Empresa | null };

  const apiKey = process.env.CONCILIAOS_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Fallback sin API key
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const msg =
          "El chat fiscal IA no está disponible. Configura `ANTHROPIC_API_KEY` en las variables de entorno para habilitarlo.";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
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

  const systemPrompt = `Eres ConciliaBot, el asistente fiscal de ConciliaOS. Eres un experto en:
- Ley del ISR (LISR) y su Reglamento
- Ley del IVA (LIVA) y su Reglamento
- Código Fiscal de la Federación (CFF)
- Resolución Miscelánea Fiscal (RMF) vigente
- Criterios normativos del SAT
- NIF (Normas de Información Financiera) mexicanas
- Ley del IMSS y Ley del Infonavit

${empresa ? `Contexto de la empresa consultante:
- Razón social: ${empresa.razon_social}
- RFC: ${empresa.rfc}
- Régimen fiscal: ${empresa.regimen_fiscal} (${empresa.regimen_codigo})
- Actividades económicas: ${empresa.actividades_sat?.join(", ") || "No especificadas"}
- Objeto social: ${empresa.objeto_social || "No especificado"}` : ""}

INSTRUCCIONES:
1. Responde siempre con fundamento en artículos específicos de la ley
2. Si hay jurisprudencia relevante, mencionarla
3. Si la pregunta es ambigua, pide clarificación
4. Señala cuando una situación requiere consulta con contador o abogado
5. Formato: respuesta clara + fundamento legal + recomendación práctica
6. Si preguntan sobre un CFDI específico, solicita el UUID para consultarlo en el sistema
7. Responde en español mexicano`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        stream: true,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok || !response.body) {
      return new Response("Error en la API de Claude", { status: 502 });
    }

    // Pipe the streaming response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  if (
                    parsed.type === "content_block_delta" &&
                    parsed.delta?.text
                  ) {
                    controller.enqueue(
                      encoder.encode(
                        `data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`
                      )
                    );
                  }
                } catch {
                  // skip unparseable
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);
    return new Response("Error interno", { status: 500 });
  }
}
