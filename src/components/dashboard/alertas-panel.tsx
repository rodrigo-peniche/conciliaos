"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Clock } from "lucide-react";

export interface Alerta {
  id: string;
  tipo: "critica" | "advertencia" | "info";
  titulo: string;
  detalle: string;
  fecha: string;
}

interface Props {
  alertas: Alerta[];
}

const iconMap = {
  critica: <AlertTriangle className="h-4 w-4 text-red-600" />,
  advertencia: <Clock className="h-4 w-4 text-yellow-600" />,
  info: <Bell className="h-4 w-4 text-blue-600" />,
};

const badgeMap: Record<string, "destructive" | "secondary" | "outline"> = {
  critica: "destructive",
  advertencia: "secondary",
  info: "outline",
};

export function AlertasPanel({ alertas }: Props) {
  if (alertas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            Sin alertas activas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          Alertas
          <Badge variant="destructive" className="text-[10px]">
            {alertas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alertas.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-3 rounded-lg border p-2.5"
          >
            {iconMap[a.tipo]}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium">{a.titulo}</p>
                <Badge variant={badgeMap[a.tipo]} className="text-[10px]">
                  {a.tipo}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{a.detalle}</p>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {a.fecha}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
