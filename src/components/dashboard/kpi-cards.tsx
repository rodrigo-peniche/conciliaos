"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatMXN } from "@/lib/utils/currency";
import {
  FileText,
  DollarSign,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export interface KpiData {
  cfdisRecibidos: number;
  cfdiVariacion: number;
  gastoTotal: number;
  pctDeducible: number;
  pctConciliacion: number;
  movsPendientes: number;
  alertasActivas: number;
}

interface Props {
  data: KpiData;
}

export function KpiCards({ data }: Props) {
  const cards = [
    {
      title: "CFDIs recibidos",
      value: data.cfdisRecibidos.toString(),
      sub:
        data.cfdiVariacion >= 0
          ? `+${data.cfdiVariacion}% vs mes anterior`
          : `${data.cfdiVariacion}% vs mes anterior`,
      icon: FileText,
      color: "text-blue-600",
      trend: data.cfdiVariacion >= 0 ? "up" : "down",
    },
    {
      title: "Gasto del mes",
      value: formatMXN(data.gastoTotal),
      sub: `${data.pctDeducible}% deducible`,
      icon: DollarSign,
      color: "text-green-600",
      trend: null,
    },
    {
      title: "Conciliación",
      value: `${data.pctConciliacion}%`,
      sub: `${data.movsPendientes} movimientos pendientes`,
      icon: ArrowLeftRight,
      color:
        data.pctConciliacion >= 80
          ? "text-green-600"
          : data.pctConciliacion >= 50
          ? "text-yellow-600"
          : "text-red-600",
      trend: null,
    },
    {
      title: "Alertas activas",
      value: data.alertasActivas.toString(),
      sub: data.alertasActivas > 0 ? "Requieren atención" : "Todo en orden",
      icon: AlertTriangle,
      color: data.alertasActivas > 0 ? "text-red-600" : "text-green-600",
      trend: null,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                {card.title}
              </p>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="mt-1">
              <p className="text-2xl font-bold">{card.value}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {card.trend === "up" && (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                )}
                {card.trend === "down" && (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <p className="text-xs text-muted-foreground">{card.sub}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
