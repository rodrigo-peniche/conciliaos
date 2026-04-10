"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export default function EmpresaDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Empresa</h1>
        <p className="text-muted-foreground">
          Resumen fiscal y contable del periodo actual.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CFDIs Recibidos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
              Este mes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gasto Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-green-700 bg-green-50">
                0% deducible
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conciliación</CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <Progress value={0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Sin alertas activas</p>
          </CardContent>
        </Card>
      </div>

      {/* Semáforo fiscal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Semáforo Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "CFDIs descargados y actualizados", status: "pendiente" },
              { label: "Conciliación bancaria al día", status: "pendiente" },
              { label: "Sin proveedores en lista EFOS", status: "pendiente" },
              { label: "Declaraciones presentadas al corriente", status: "pendiente" },
              { label: "Contratos vigentes con proveedores principales", status: "pendiente" },
              { label: "Trazabilidad documental completa", status: "pendiente" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-gray-300" />
                <span className="text-sm">{item.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
