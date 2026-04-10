"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Download, Scale, Loader2 } from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";

interface BalanceData {
  efectivo: number;
  cxc: number;
  totalActivo: number;
  cxp: number;
  impuestosPorPagar: number;
  totalPasivo: number;
  capital: number;
}

export default function BalancePage() {
  const params = useParams();
  const empresaId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);

  const generar = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/conciliacion?empresaId=${empresaId}`);
      const data = await res.json();
      const cfdis = data.cfdis || [];
      const movs = data.movimientos || [];

      // Cálculos simplificados
      const efectivo = movs.reduce(
        (s: number, m: { importe: number }) => s + m.importe,
        0
      );
      const cxc = cfdis
        .filter((c: { tipo: string; conciliado: boolean }) => c.tipo === "ingreso" && !c.conciliado)
        .reduce((s: number, c: { total: number }) => s + c.total, 0);
      const cxp = cfdis
        .filter((c: { tipo: string; conciliado: boolean }) => (c.tipo === "egreso" || c.tipo === "pago") && !c.conciliado)
        .reduce((s: number, c: { total: number }) => s + c.total, 0);
      const impuestos = cfdis.reduce(
        (s: number, c: { iva_trasladado: number; iva_retenido: number }) => s + c.iva_trasladado - c.iva_retenido,
        0
      );

      const totalActivo = Math.abs(efectivo) + cxc;
      const totalPasivo = cxp + Math.abs(impuestos);

      setBalance({
        efectivo: Math.abs(efectivo),
        cxc,
        totalActivo,
        cxp,
        impuestosPorPagar: Math.abs(impuestos),
        totalPasivo,
        capital: totalActivo - totalPasivo,
      });
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Balance General Simplificado
          </h1>
          <p className="text-muted-foreground">
            Activo, pasivo y capital estimados
          </p>
        </div>
        <Button onClick={generar} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Scale className="mr-2 h-4 w-4" />
          )}
          Generar
        </Button>
      </div>

      {balance && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* Activo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-blue-600">ACTIVO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Efectivo en cuentas</span>
                <span className="font-mono">{formatMXN(balance.efectivo)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cuentas por cobrar</span>
                <span className="font-mono">{formatMXN(balance.cxc)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total Activo</span>
                <span className="font-mono text-blue-600">
                  {formatMXN(balance.totalActivo)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pasivo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600">PASIVO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Cuentas por pagar</span>
                <span className="font-mono">{formatMXN(balance.cxp)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Impuestos por pagar</span>
                <span className="font-mono">
                  {formatMXN(balance.impuestosPorPagar)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-bold">
                <span>Total Pasivo</span>
                <span className="font-mono text-red-600">
                  {formatMXN(balance.totalPasivo)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Capital */}
          <Card className={balance.capital >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">CAPITAL</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-center mt-4">
                {formatMXN(balance.capital)}
              </p>
              <p className="text-xs text-center text-muted-foreground mt-1">
                Activo - Pasivo
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
