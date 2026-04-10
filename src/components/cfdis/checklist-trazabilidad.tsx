"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Upload,
  ClipboardList,
} from "lucide-react";
import type { ChecklistItem } from "@/lib/validacion/trazabilidad";

interface Props {
  items: ChecklistItem[];
  score: number;
}

export function ChecklistTrazabilidad({ items, score }: Props) {
  const color =
    score >= 80
      ? "text-green-600"
      : score >= 60
      ? "text-yellow-600"
      : "text-red-600";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Trazabilidad Documental
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center gap-3">
          <Progress value={score} className="flex-1 h-2" />
          <span className={`text-sm font-bold ${color}`}>{score}/100</span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-lg p-2.5 ${
                item.cumplido
                  ? "bg-green-50 dark:bg-green-950"
                  : "bg-red-50 dark:bg-red-950"
              }`}
            >
              {item.cumplido ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{item.descripcion}</p>
                  <span className="text-[10px] text-muted-foreground">
                    ({item.peso} pts)
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {item.detalle}
                </p>
                {!item.cumplido && item.comoObtener && (
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    {item.comoObtener}
                  </p>
                )}
              </div>
              {!item.cumplido && !item.generableEnConciliaOS && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                  <Upload className="mr-1 h-3 w-3" />
                  Adjuntar
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
