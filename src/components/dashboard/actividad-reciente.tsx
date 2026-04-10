"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

export function ActividadReciente({ cfdis }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Últimos CFDIs recibidos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Fecha</TableHead>
              <TableHead className="text-xs">Emisor</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cfdis.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-xs text-muted-foreground py-6"
                >
                  Sin CFDIs recientes
                </TableCell>
              </TableRow>
            ) : (
              cfdis.slice(0, 10).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs font-mono">
                    {new Date(c.fecha_emision).toLocaleDateString("es-MX", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">
                    {c.emisor_nombre || c.emisor_rfc}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {formatMXN(c.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {c.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.estado_sat === "vigente"
                          ? "default"
                          : c.estado_sat === "cancelado"
                          ? "destructive"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {c.estado_sat}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
