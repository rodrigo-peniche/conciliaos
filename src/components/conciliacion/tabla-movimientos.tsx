"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMXN } from "@/lib/utils/currency";
import type { Database } from "@/lib/types/database.types";

type Movimiento = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];

interface Props {
  movimientos: Movimiento[];
  selectedId: string | null;
  highlightIds: Set<string>;
  onSelect: (id: string) => void;
  onDragStart: (id: string) => void;
}

const estadoBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pendiente: { variant: "outline", label: "Pendiente" },
  conciliado: { variant: "default", label: "Conciliado" },
  revisado: { variant: "secondary", label: "Revisado" },
  ignorado: { variant: "secondary", label: "Ignorado" },
  diferencia: { variant: "destructive", label: "Diferencia" },
};

export function TablaMovimientos({
  movimientos,
  selectedId,
  highlightIds,
  onSelect,
  onDragStart,
}: Props) {
  return (
    <div className="overflow-auto max-h-[500px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[80px] text-xs">Fecha</TableHead>
            <TableHead className="text-xs">Descripción</TableHead>
            <TableHead className="w-[90px] text-xs">RFC</TableHead>
            <TableHead className="w-[100px] text-xs text-right">Monto</TableHead>
            <TableHead className="w-[90px] text-xs">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movimientos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                Sin movimientos en este periodo
              </TableCell>
            </TableRow>
          ) : (
            movimientos.map((mov) => {
              const isSelected = mov.id === selectedId;
              const isHighlighted = highlightIds.has(mov.id);
              const estado = estadoBadge[mov.estado_conciliacion] || estadoBadge.pendiente;

              return (
                <TableRow
                  key={mov.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-950"
                      : isHighlighted
                      ? "bg-yellow-50 dark:bg-yellow-950"
                      : "hover:bg-muted/50"
                  }`}
                  draggable={mov.estado_conciliacion === "pendiente"}
                  onClick={() => onSelect(mov.id)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("movimientoId", mov.id);
                    onDragStart(mov.id);
                  }}
                >
                  <TableCell className="text-xs font-mono">
                    {new Date(mov.fecha).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-xs max-w-[180px] truncate">
                    {mov.descripcion || mov.concepto || "—"}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {mov.rfc_contraparte
                      ? mov.rfc_contraparte.substring(0, 10) + "…"
                      : "—"}
                  </TableCell>
                  <TableCell
                    className={`text-xs text-right font-mono ${
                      mov.tipo === "cargo" ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {mov.tipo === "cargo" ? "-" : "+"}
                    {formatMXN(Math.abs(mov.importe))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={estado.variant} className="text-[10px] px-1.5">
                      {estado.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
