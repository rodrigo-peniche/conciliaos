"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMXN } from "@/lib/utils/currency";
import { CheckCircle2, Clock, AlertTriangle, ArrowLeftRight } from "lucide-react";

interface Props {
  totalMovimientos: number;
  conciliados: number;
  pendientes: number;
  excepciones: number;
  matchesExactos: number;
  matchesFuzzy: number;
  porcentaje: number;
}

export function PanelDiferencias({
  totalMovimientos,
  conciliados,
  pendientes,
  excepciones,
  matchesExactos,
  matchesFuzzy,
  porcentaje,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Barra de progreso */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Progreso de conciliación</span>
          <span className="font-bold">{porcentaje}%</span>
        </div>
        <Progress value={porcentaje} className="h-2" />
      </div>

      {/* KPIs en grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{totalMovimientos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-xs text-muted-foreground">Conciliados</p>
              <p className="text-lg font-bold text-green-600">{conciliados}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-yellow-600" />
            <div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-lg font-bold text-yellow-600">{pendientes}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-xs text-muted-foreground">Excepciones</p>
              <p className="text-lg font-bold text-red-600">{excepciones}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detalle de matches */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Matches exactos: <strong className="text-foreground">{matchesExactos}</strong></span>
        <span>Matches fuzzy: <strong className="text-foreground">{matchesFuzzy}</strong></span>
      </div>
    </div>
  );
}
