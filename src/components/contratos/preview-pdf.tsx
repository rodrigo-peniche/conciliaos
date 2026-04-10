"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Download, FileText } from "lucide-react";

interface Props {
  contratoId: string | null;
  html: string;
}

export function PreviewPDF({ contratoId, html }: Props) {
  const [loading, setLoading] = useState(false);

  const descargarPDF = async () => {
    if (!contratoId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contratos/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratoId }),
      });

      if (!res.ok) throw new Error("Error generando PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contrato.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando PDF:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Preview del contrato
        </h3>
        {contratoId && (
          <Button size="sm" onClick={descargarPDF} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
          </Button>
        )}
      </div>

      <Card className="p-6 bg-white dark:bg-zinc-950 max-h-[500px] overflow-y-auto">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </Card>
    </div>
  );
}
