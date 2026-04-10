"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export interface CheckeoFiscal {
  id: string;
  descripcion: string;
  estado: "ok" | "warning" | "error";
  detalle: string;
}

interface Props {
  checkeos: CheckeoFiscal[];
}

const iconMap = {
  ok: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
  error: <XCircle className="h-4 w-4 text-red-600" />,
};

export function SemaforoFiscal({ checkeos }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Semáforo Fiscal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {checkeos.map((c) => (
          <div
            key={c.id}
            className={`flex items-start gap-3 rounded-lg p-2.5 ${
              c.estado === "error"
                ? "bg-red-50 dark:bg-red-950"
                : c.estado === "warning"
                ? "bg-yellow-50 dark:bg-yellow-950"
                : "bg-green-50 dark:bg-green-950"
            }`}
          >
            <div className="mt-0.5">{iconMap[c.estado]}</div>
            <div>
              <p className="text-xs font-medium">{c.descripcion}</p>
              <p className="text-[10px] text-muted-foreground">{c.detalle}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
