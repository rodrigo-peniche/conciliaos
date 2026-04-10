"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftRight } from "lucide-react";

export default function ConciliacionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conciliación Bancaria</h1>
        <p className="text-muted-foreground">
          Cruza movimientos bancarios con CFDIs del SAT.
        </p>
      </div>
      <Card className="flex flex-col items-center justify-center py-16">
        <ArrowLeftRight className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Sin movimientos por conciliar</h3>
        <p className="text-sm text-muted-foreground">
          Importa un estado de cuenta y descarga CFDIs para comenzar la conciliación.
        </p>
      </Card>
    </div>
  );
}
