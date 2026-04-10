"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot } from "lucide-react";
import { MensajeBurbuja } from "./mensaje-burbuja";
import { SugerenciasRapidas } from "./sugerencias-rapidas";

interface Mensaje {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  empresaId: string;
}

export function ChatFiscal({ empresaId }: Props) {
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const enviarMensaje = async (texto?: string) => {
    const msg = texto || input.trim();
    if (!msg || loading) return;

    const newMessages: Mensaje[] = [
      ...messages,
      { role: "user", content: msg },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          messages: newMessages,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Error en la respuesta");
      }

      // Streaming SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";
      let buffer = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
              if (parsed.text) {
                assistantMsg += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantMsg,
                  };
                  return updated;
                });
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch (err) {
      console.error("Error en chat:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Lo siento, hubo un error al procesar tu consulta. Intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Messages area */}
      <Card className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">ConciliaBot</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Soy tu asistente fiscal. Pregúntame sobre deducibilidad, obligaciones
                fiscales, conciliación, o cualquier duda sobre tu empresa.
              </p>
              <SugerenciasRapidas onSelect={enviarMensaje} />
            </div>
          ) : (
            messages.map((msg, i) => (
              <MensajeBurbuja key={i} role={msg.role} content={msg.content} />
            ))
          )}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">ConciliaBot está escribiendo...</span>
            </div>
          )}
        </div>
      </Card>

      {/* Input area */}
      <div className="mt-3 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta fiscal..."
          rows={1}
          className="resize-none min-h-[40px]"
          disabled={loading}
        />
        <Button
          onClick={() => enviarMensaje()}
          disabled={loading || !input.trim()}
          size="sm"
          className="h-10 w-10 p-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
