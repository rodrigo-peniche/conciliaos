"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function CfdisPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">CFDIs</h1>
        <p className="text-muted-foreground">
          Gestiona los CFDIs emitidos y recibidos de la empresa.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Sin CFDIs descargados</h3>
        <p className="text-sm text-muted-foreground">
          Configura la conexión con el SAT para descargar CFDIs automáticamente.
        </p>
      </Card>
    </div>
  );
}
