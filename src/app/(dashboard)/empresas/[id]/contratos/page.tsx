"use client";

import { Card } from "@/components/ui/card";
import { FileCheck } from "lucide-react";

export default function ContratosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
        <p className="text-muted-foreground">
          Genera y gestiona contratos con proveedores y clientes.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <FileCheck className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Sin contratos</h3>
        <p className="text-sm text-muted-foreground">
          Genera contratos automáticamente con IA a partir de los datos de tus proveedores.
        </p>
      </Card>
    </div>
  );
}
