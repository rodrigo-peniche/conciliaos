"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, FileText } from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";
import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

interface DiotRow {
  rfc: string;
  nombre: string;
  totalOperaciones: number;
  iva16: number;
  iva8: number;
  ivaExento: number;
  retenido: number;
}

export default function DiotPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const [mes, setMes] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DiotRow[]>([]);

  const generarDiot = useCallback(async () => {
    if (!mes) return;
    setLoading(true);
    try {
      const [year, month] = mes.split("-");
      const inicio = `${year}-${month}-01`;
      const fin = new Date(parseInt(year), parseInt(month), 0)
        .toISOString()
        .split("T")[0];

      const res = await fetch(
        `/api/conciliacion?empresaId=${empresaId}&periodoInicio=${inicio}&periodoFin=${fin}`
      );
      const data = await res.json();
      const cfdis: Cfdi[] = data.cfdis || [];

      // Agrupar por RFC emisor
      const agrupado = new Map<string, DiotRow>();
      for (const cfdi of cfdis) {
        if (cfdi.direccion === "emitido") continue; // solo recibidos
        const key = cfdi.emisor_rfc;
        const existing = agrupado.get(key) || {
          rfc: cfdi.emisor_rfc,
          nombre: cfdi.emisor_nombre || "",
          totalOperaciones: 0,
          iva16: 0,
          iva8: 0,
          ivaExento: 0,
          retenido: 0,
        };

        existing.totalOperaciones += cfdi.subtotal;

        // Clasificar IVA (simplificado)
        if (cfdi.iva_trasladado > 0) {
          const tasa = cfdi.subtotal > 0 ? cfdi.iva_trasladado / cfdi.subtotal : 0;
          if (tasa >= 0.15) {
            existing.iva16 += cfdi.iva_trasladado;
          } else {
            existing.iva8 += cfdi.iva_trasladado;
          }
        } else {
          existing.ivaExento += cfdi.subtotal;
        }

        existing.retenido += cfdi.iva_retenido;
        agrupado.set(key, existing);
      }

      setRows(Array.from(agrupado.values()).sort((a, b) => b.totalOperaciones - a.totalOperaciones));
    } catch (err) {
      console.error("Error generando DIOT:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, mes]);

  const descargarTxt = () => {
    // Formato DIOT: RFC|Nombre|TotalOp|IVA16|IVA8|IVAExento|Retenido
    const lines = rows.map(
      (r) =>
        `04|${r.rfc}|${r.nombre}|04|${r.totalOperaciones.toFixed(2)}|${r.iva16.toFixed(2)}|${r.iva8.toFixed(2)}|${r.ivaExento.toFixed(2)}|${r.retenido.toFixed(2)}|||`
    );

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `DIOT_${mes}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reporte DIOT</h1>
        <p className="text-muted-foreground">
          Declaración Informativa de Operaciones con Terceros
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Periodo (mes)</Label>
              <Input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Button onClick={generarDiot} disabled={loading || !mes}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Generar
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" onClick={descargarTxt}>
                <Download className="mr-2 h-4 w-4" />
                Descargar TXT
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {rows.length} proveedores — Periodo {mes}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">RFC</TableHead>
                  <TableHead className="text-xs">Nombre</TableHead>
                  <TableHead className="text-xs text-right">Total Op.</TableHead>
                  <TableHead className="text-xs text-right">IVA 16%</TableHead>
                  <TableHead className="text-xs text-right">IVA 8%</TableHead>
                  <TableHead className="text-xs text-right">Exento</TableHead>
                  <TableHead className="text-xs text-right">Retenido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.rfc}>
                    <TableCell className="text-xs font-mono">{r.rfc}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">
                      {r.nombre}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatMXN(r.totalOperaciones)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatMXN(r.iva16)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatMXN(r.iva8)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatMXN(r.ivaExento)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {formatMXN(r.retenido)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
