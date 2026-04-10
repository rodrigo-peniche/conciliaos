"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMXN } from "@/lib/utils/currency";
import { Check, X, AlertTriangle } from "lucide-react";
import type { Database } from "@/lib/types/database.types";

type Partida = Database["public"]["Tables"]["conciliacion_partidas"]["Row"];
type Movimiento = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];
type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

interface PartidaConDetalle extends Partida {
  movimiento?: Movimiento;
  cfdi?: Cfdi;
}

interface Props {
  partidas: PartidaConDetalle[];
  onResolver: (partidaId: string, accion: "aceptado" | "rechazado") => void;
}

const tipoBadge: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
  match_exacto: { variant: "default", label: "Exacto" },
  match_fuzzy: { variant: "secondary", label: "Fuzzy" },
  manual: { variant: "outline", label: "Manual" },
  sin_cfdi: { variant: "outline", label: "Sin CFDI" },
  sin_movimiento: { variant: "outline", label: "Sin Mov." },
  diferencia: { variant: "secondary", label: "Diferencia" },
};

const estadoBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pendiente: { variant: "outline", label: "Pendiente" },
  aceptado: { variant: "default", label: "Aceptado" },
  rechazado: { variant: "destructive", label: "Rechazado" },
  excepcion: { variant: "secondary", label: "Excepción" },
};

export function PartidasConciliadas({ partidas, onResolver }: Props) {
  if (partidas.length === 0) {
    return (
      <div className="text-center text-xs text-muted-foreground py-6">
        Sin partidas de conciliación. Ejecuta el auto-matching o arrastra movimientos.
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[250px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="text-xs">Tipo</TableHead>
            <TableHead className="text-xs">Score</TableHead>
            <TableHead className="text-xs">Movimiento</TableHead>
            <TableHead className="text-xs">CFDI</TableHead>
            <TableHead className="text-xs text-right">Δ Monto</TableHead>
            <TableHead className="text-xs">Δ Días</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
            <TableHead className="text-xs w-[80px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partidas.map((p) => {
            const tipo = tipoBadge[p.tipo] || tipoBadge.manual;
            const estado = estadoBadge[p.estado] || estadoBadge.pendiente;

            return (
              <TableRow key={p.id}>
                <TableCell>
                  <Badge variant={tipo.variant} className="text-[10px]">
                    {tipo.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {p.score_matching !== null
                    ? (p.score_matching * 100).toFixed(0) + "%"
                    : "—"}
                </TableCell>
                <TableCell className="text-xs truncate max-w-[120px]">
                  {p.movimiento?.descripcion || p.movimiento_id?.substring(0, 8) || "—"}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {p.cfdi?.uuid?.substring(0, 8) || p.cfdi_id?.substring(0, 8) || "—"}
                </TableCell>
                <TableCell className="text-xs text-right font-mono">
                  {p.diferencia_monto > 0 ? (
                    <span className="text-amber-600">
                      {formatMXN(p.diferencia_monto)}
                    </span>
                  ) : (
                    <span className="text-green-600">$0</span>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {p.diferencia_dias > 0 ? (
                    <span className="text-amber-600">{p.diferencia_dias}d</span>
                  ) : (
                    <span className="text-green-600">0d</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={estado.variant} className="text-[10px]">
                    {estado.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.estado === "pendiente" && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onResolver(p.id, "aceptado")}
                        title="Aceptar"
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onResolver(p.id, "rechazado")}
                        title="Rechazar"
                      >
                        <X className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
