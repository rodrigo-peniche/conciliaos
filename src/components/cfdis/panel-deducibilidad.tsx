"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  Loader2,
  ChevronDown,
  ChevronUp,
  Scale,
} from "lucide-react";
import { BadgeDeducibilidad } from "./badge-deducibilidad";
import { formatMXN } from "@/lib/utils/currency";
import type { ResultadoDeducibilidad } from "@/lib/types/conciliaos.types";

interface Props {
  cfdiId: string;
  empresaId: string;
  total: number;
  esDeducible: boolean | null;
  porcentaje: number | null;
  motivo: string | null;
  iaAnalisis: string | null;
}

export function PanelDeducibilidad({
  cfdiId,
  empresaId,
  total,
  esDeducible,
  porcentaje,
  motivo,
  iaAnalisis,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<ResultadoDeducibilidad | null>(null);
  const [mostrarIA, setMostrarIA] = useState(false);

  const analizar = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/deducibilidad/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cfdiId, empresaId }),
      });
      const data = await res.json();
      setResultado(data);
    } catch (err) {
      console.error("Error analizando:", err);
    } finally {
      setLoading(false);
    }
  };

  // Usar resultado del análisis o datos existentes del CFDI
  const pct = resultado?.porcentaje ?? porcentaje;
  const deducible = resultado?.esDeducible ?? esDeducible;
  const montoDeducible = pct !== null ? (total * (pct ?? 0)) / 100 : null;
  const montoNoDeducible = montoDeducible !== null ? total - montoDeducible : null;

  // Parsear análisis IA si existe
  let iaData: {
    razonamiento?: string;
    fundamento?: string;
    documentos_recomendados?: string[];
    alerta?: string | null;
  } | null = null;

  if (resultado) {
    iaData = {
      razonamiento: resultado.razonamiento,
      fundamento: resultado.fundamentoLegal,
      documentos_recomendados: resultado.documentosRecomendados,
      alerta: resultado.alerta,
    };
  } else if (iaAnalisis) {
    try {
      iaData = JSON.parse(iaAnalisis);
    } catch {
      // ignore
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4" />
          Análisis de Deducibilidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Badge principal */}
        <div className="flex items-center justify-between">
          <BadgeDeducibilidad
            esDeducible={deducible}
            porcentaje={pct}
            size="lg"
          />
          {!resultado && esDeducible === null && (
            <Button
              size="sm"
              onClick={analizar}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scale className="mr-2 h-4 w-4" />
              )}
              Analizar
            </Button>
          )}
        </div>

        {/* Montos */}
        {pct !== null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-2">
              <p className="text-[10px] text-muted-foreground">Deducible</p>
              <p className="text-sm font-bold text-green-600">
                {formatMXN(montoDeducible ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[10px] text-muted-foreground">No deducible</p>
              <p className="text-sm font-bold text-red-600">
                {formatMXN(montoNoDeducible ?? 0)}
              </p>
            </div>
          </div>
        )}

        {/* Fundamento legal */}
        {(motivo || iaData?.fundamento) && (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">
              FUNDAMENTO LEGAL
            </p>
            <p className="text-xs">{iaData?.fundamento || motivo}</p>
          </div>
        )}

        {/* Análisis de IA (colapsable) */}
        {iaData?.razonamiento && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => setMostrarIA(!mostrarIA)}
            >
              Análisis de IA
              {mostrarIA ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            {mostrarIA && (
              <div className="mt-2 rounded-lg border p-3 space-y-2">
                <p className="text-xs">{iaData.razonamiento}</p>
                {iaData.alerta && (
                  <div className="flex items-start gap-2 rounded bg-amber-50 p-2 dark:bg-amber-950">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {iaData.alerta}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Checklist de documentos */}
        {(resultado?.documentosRecomendados || iaData?.documentos_recomendados) && (
          <div>
            <Separator className="my-2" />
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">
              DOCUMENTOS DE SOPORTE
            </p>
            <div className="space-y-1.5">
              {(resultado?.documentosRecomendados || iaData?.documentos_recomendados || []).map(
                (doc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-red-500" />
                      <span>{doc}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                      <Upload className="mr-1 h-3 w-3" />
                      Adjuntar
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
