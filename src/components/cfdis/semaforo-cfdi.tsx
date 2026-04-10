"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Shield } from "lucide-react";
import type { ValidationResult, ValidacionItem } from "@/lib/validacion/cfdi-validator";

interface Props {
  result: ValidationResult;
}

const iconMap = {
  ok: <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />,
  warning: <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-600" />,
};

const categoriaLabels: Record<string, string> = {
  tecnica: "Validaciones Técnicas",
  contenido: "Validaciones de Contenido",
  fiscal: "Validaciones Fiscales",
};

export function SemaforoCfdi({ result }: Props) {
  const color =
    result.score >= 80
      ? "text-green-600"
      : result.score >= 60
      ? "text-yellow-600"
      : "text-red-600";

  const bgColor =
    result.score >= 80
      ? "bg-green-50 dark:bg-green-950"
      : result.score >= 60
      ? "bg-yellow-50 dark:bg-yellow-950"
      : "bg-red-50 dark:bg-red-950";

  // Agrupar por categoría
  const grouped = result.validaciones.reduce(
    (acc, v) => {
      if (!acc[v.categoria]) acc[v.categoria] = [];
      acc[v.categoria].push(v);
      return acc;
    },
    {} as Record<string, ValidacionItem[]>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Validación CFDI
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className={`rounded-lg p-3 ${bgColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Score de validación</span>
            <span className={`text-lg font-bold ${color}`}>
              {result.score}%
            </span>
          </div>
          <Progress value={result.score} className="h-2" />
          <div className="flex gap-4 mt-2 text-[10px]">
            <span className="text-green-600">{result.ok} OK</span>
            <span className="text-yellow-600">
              {result.advertencias} Advertencias
            </span>
            <span className="text-red-600">{result.errores} Errores</span>
          </div>
        </div>

        {/* Validaciones agrupadas */}
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
              {categoriaLabels[cat] || cat}
            </p>
            <div className="space-y-1">
              {items.map((v) => (
                <div
                  key={v.id}
                  className="flex items-start gap-2 text-xs py-1"
                >
                  {iconMap[v.resultado]}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{v.descripcion}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {v.detalle}
                    </p>
                  </div>
                  {v.fundamento && (
                    <Badge variant="outline" className="text-[8px] shrink-0">
                      {v.fundamento}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
