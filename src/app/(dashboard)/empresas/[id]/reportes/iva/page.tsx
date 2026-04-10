"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Loader2, Receipt } from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";
import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

export default function IvaPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const [mes, setMes] = useState("");
  const [loading, setLoading] = useState(false);
  const [cfdis, setCfdis] = useState<Cfdi[]>([]);

  const generar = useCallback(async () => {
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
      setCfdis(data.cfdis || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, mes]);

  // Cálculos IVA
  const emitidos = cfdis.filter((c) => c.direccion === "emitido" || c.tipo === "ingreso");
  const recibidos = cfdis.filter((c) => c.direccion === "recibido" || c.tipo === "egreso" || c.tipo === "pago");

  const ivaTrasladado = emitidos.reduce((s, c) => s + c.iva_trasladado, 0);
  const ivaAcreditable = recibidos
    .filter((c) => c.es_deducible !== false)
    .reduce((s, c) => s + c.iva_trasladado, 0);
  const ivaRetenido = recibidos.reduce((s, c) => s + c.iva_retenido, 0);
  const saldo = ivaTrasladado - ivaAcreditable - ivaRetenido;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cédula IVA Mensual</h1>
        <p className="text-muted-foreground">
          IVA trasladado menos IVA acreditable = saldo a cargo o a favor
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
            <Button onClick={generar} disabled={loading || !mes}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="mr-2 h-4 w-4" />
              )}
              Calcular
            </Button>
          </div>
        </CardContent>
      </Card>

      {cfdis.length > 0 && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">IVA Trasladado</p>
              <p className="text-lg font-bold text-blue-600">
                {formatMXN(ivaTrasladado)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">IVA Acreditable</p>
              <p className="text-lg font-bold text-green-600">
                {formatMXN(ivaAcreditable)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">IVA Retenido</p>
              <p className="text-lg font-bold text-purple-600">
                {formatMXN(ivaRetenido)}
              </p>
            </Card>
            <Card className={`p-4 ${saldo >= 0 ? "bg-red-50 dark:bg-red-950" : "bg-green-50 dark:bg-green-950"}`}>
              <p className="text-xs text-muted-foreground">
                {saldo >= 0 ? "Saldo a cargo" : "Saldo a favor"}
              </p>
              <p className={`text-lg font-bold ${saldo >= 0 ? "text-red-600" : "text-green-600"}`}>
                {formatMXN(Math.abs(saldo))}
              </p>
            </Card>
          </div>

          {/* Tabla detalle */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                Detalle de CFDIs ({cfdis.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">RFC</TableHead>
                      <TableHead className="text-xs">UUID</TableHead>
                      <TableHead className="text-xs text-right">Subtotal</TableHead>
                      <TableHead className="text-xs text-right">IVA</TableHead>
                      <TableHead className="text-xs text-right">Ded.%</TableHead>
                      <TableHead className="text-xs text-right">IVA Acred.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recibidos.map((c) => {
                      const ded = c.deducible_pct ?? 100;
                      const ivaAcred = c.iva_trasladado * (ded / 100);
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-xs font-mono">
                            {c.emisor_rfc}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {c.uuid.substring(0, 8)}…
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {formatMXN(c.subtotal)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {formatMXN(c.iva_trasladado)}
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {ded}%
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono">
                            {formatMXN(ivaAcred)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
