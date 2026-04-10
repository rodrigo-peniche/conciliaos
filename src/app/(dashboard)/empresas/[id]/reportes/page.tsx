"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  Receipt,
  Scale,
  ArrowRight,
} from "lucide-react";

const REPORTES = [
  {
    id: "diot",
    titulo: "DIOT",
    descripcion:
      "Declaración Informativa de Operaciones con Terceros. Agrupado por RFC proveedor.",
    icon: FileText,
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  },
  {
    id: "iva",
    titulo: "Cédula IVA Mensual",
    descripcion:
      "IVA trasladado menos IVA acreditable. Cálculo de saldo a cargo o a favor.",
    icon: Receipt,
    color: "text-green-600 bg-green-50 dark:bg-green-950",
  },
  {
    id: "balance",
    titulo: "Balance General Simplificado",
    descripcion:
      "Activo, pasivo y capital. Exportable a Excel.",
    icon: Scale,
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950",
  },
];

export default function ReportesPage() {
  const params = useParams();
  const empresaId = params.id as string;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">
          Genera reportes fiscales y contables: DIOT, cédula IVA, balance y más.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTES.map((r) => (
          <Card key={r.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${r.color}`}
              >
                <r.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">{r.titulo}</CardTitle>
              <CardDescription className="text-xs">
                {r.descripcion}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={`/empresas/${empresaId}/reportes/${r.id}`}>
                <Button variant="outline" className="w-full" size="sm">
                  Generar reporte
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
