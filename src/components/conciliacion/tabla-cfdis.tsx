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

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

interface Props {
  cfdis: Cfdi[];
  selectedId: string | null;
  highlightIds: Set<string>;
  onSelect: (id: string) => void;
  onDrop: (cfdiId: string, movimientoId: string) => void;
}

export function TablaCfdis({
  cfdis,
  selectedId,
  highlightIds,
  onSelect,
  onDrop,
}: Props) {
  return (
    <div className="overflow-auto max-h-[500px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[80px] text-xs">Fecha</TableHead>
            <TableHead className="text-xs">UUID / Emisor</TableHead>
            <TableHead className="w-[100px] text-xs text-right">Total</TableHead>
            <TableHead className="w-[60px] text-xs">Tipo</TableHead>
            <TableHead className="w-[60px] text-xs">Ded.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cfdis.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                Sin CFDIs en este periodo
              </TableCell>
            </TableRow>
          ) : (
            cfdis.map((cfdi) => {
              const isSelected = cfdi.id === selectedId;
              const isHighlighted = highlightIds.has(cfdi.id);

              return (
                <TableRow
                  key={cfdi.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-950"
                      : isHighlighted
                      ? "bg-yellow-50 dark:bg-yellow-950"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => onSelect(cfdi.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add("bg-blue-50", "dark:bg-blue-900");
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove("bg-blue-50", "dark:bg-blue-900");
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("bg-blue-50", "dark:bg-blue-900");
                    const movId = e.dataTransfer.getData("movimientoId");
                    if (movId) onDrop(cfdi.id, movId);
                  }}
                >
                  <TableCell className="text-xs font-mono">
                    {new Date(cfdi.fecha_emision).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {cfdi.uuid.substring(0, 8)}…
                    </div>
                    <div className="truncate max-w-[160px]">
                      {cfdi.emisor_nombre || cfdi.emisor_rfc}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {formatMXN(cfdi.total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={cfdi.tipo === "ingreso" ? "default" : "secondary"}
                      className="text-[10px] px-1.5"
                    >
                      {cfdi.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cfdi.es_deducible !== null && (
                      <Badge
                        variant={
                          cfdi.deducible_pct === 100
                            ? "default"
                            : cfdi.deducible_pct && cfdi.deducible_pct > 0
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-[10px] px-1.5"
                      >
                        {cfdi.deducible_pct ?? 0}%
                      </Badge>
                    )}
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
