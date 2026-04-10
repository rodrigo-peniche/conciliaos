"use client";

import { Card } from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function CuentasBancariasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cuentas Bancarias</h1>
        <p className="text-muted-foreground">
          Gestiona las cuentas bancarias e importa estados de cuenta.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Sin cuentas bancarias</h3>
        <p className="text-sm text-muted-foreground">
          Agrega una cuenta bancaria para importar estados de cuenta.
        </p>
      </Card>
    </div>
  );
}
