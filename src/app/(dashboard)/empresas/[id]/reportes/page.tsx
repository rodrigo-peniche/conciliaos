"use client";

import { Card } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Genera reportes fiscales y contables: DIOT, cédula IVA, balance y más.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Sin datos para reportes</h3>
        <p className="text-sm text-muted-foreground">
          Descarga CFDIs y concilia movimientos para generar reportes fiscales.
        </p>
      </Card>
    </div>
  );
}
