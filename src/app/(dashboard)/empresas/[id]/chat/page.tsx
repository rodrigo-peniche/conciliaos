"use client";

import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatFiscalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat Fiscal IA</h1>
        <p className="text-muted-foreground">
          Consulta a ConciliaBot sobre normativa fiscal, deducibilidad y más.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Chat Fiscal IA</h3>
        <p className="text-sm text-muted-foreground">
          Proximamente. Pregunta sobre deducibilidad, normativa y más.
        </p>
      </Card>
    </div>
  );
}
