"use client";

import { useParams } from "next/navigation";
import { ChatFiscal } from "@/components/chat/chat-fiscal";

export default function ChatFiscalPage() {
  const params = useParams();
  const empresaId = params.id as string;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat Fiscal IA</h1>
        <p className="text-muted-foreground">
          Consulta a ConciliaBot sobre normativa fiscal, deducibilidad y más.
        </p>
      </div>
      <ChatFiscal empresaId={empresaId} />
    </div>
  );
}
