"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCheck,
  Plus,
  Download,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";
import type { Database } from "@/lib/types/database.types";

type Contrato = Database["public"]["Tables"]["contratos"]["Row"];

const estadoBadge: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
> = {
  borrador: { variant: "outline", label: "Borrador" },
  revision: { variant: "secondary", label: "En revisión" },
  firmado: { variant: "default", label: "Firmado" },
  activo: { variant: "default", label: "Activo" },
  vencido: { variant: "destructive", label: "Vencido" },
  cancelado: { variant: "secondary", label: "Cancelado" },
};

const tipoBadge: Record<string, string> = {
  servicios: "Servicios",
  obra: "Obra",
  suministro: "Suministro",
  arrendamiento: "Arrendamiento",
  nda: "NDA",
  honorarios: "Honorarios",
  otro: "Otro",
};

export default function ContratosPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarContratos = useCallback(async () => {
    try {
      const res = await fetch(`/api/contratos?empresaId=${empresaId}`);
      const data = await res.json();
      setContratos(data.contratos || []);
    } catch (err) {
      console.error("Error cargando contratos:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    cargarContratos();
  }, [cargarContratos]);

  // Alertas de contratos próximos a vencer
  const hoy = new Date();
  const proxVencer = contratos.filter((c) => {
    if (!c.fecha_fin || c.estado === "cancelado" || c.estado === "vencido") return false;
    const fin = new Date(c.fecha_fin);
    const diff = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 30;
  });

  const descargarPDF = async (contratoId: string) => {
    try {
      const res = await fetch("/api/contratos/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contratoId }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contrato.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando PDF:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            Genera y gestiona contratos con proveedores y clientes.
          </p>
        </div>
        <Link href={`/empresas/${empresaId}/contratos/nuevo`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Contrato
          </Button>
        </Link>
      </div>

      {/* Alertas de vencimiento */}
      {proxVencer.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {proxVencer.length} contrato(s) próximos a vencer
              </p>
            </div>
            <div className="space-y-1">
              {proxVencer.map((c) => {
                const dias = Math.ceil(
                  (new Date(c.fecha_fin!).getTime() - hoy.getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <p key={c.id} className="text-xs text-amber-700 dark:text-amber-300">
                    {c.nombre} — vence en {dias} día(s)
                  </p>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : contratos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileCheck className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Sin contratos</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Genera contratos automáticamente con IA a partir de los datos de tus proveedores.
          </p>
          <Link href={`/empresas/${empresaId}/contratos/nuevo`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear primer contrato
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contratado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[80px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contratos.map((c) => {
                const estado = estadoBadge[c.estado] || estadoBadge.borrador;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">
                      {c.nombre}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {tipoBadge[c.tipo] || c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.contratado_nombre}
                    </TableCell>
                    <TableCell className="text-sm text-right font-mono">
                      {c.monto ? formatMXN(c.monto) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.fecha_inicio && (
                        <>
                          {new Date(c.fecha_inicio).toLocaleDateString("es-MX")}
                          {c.fecha_fin && (
                            <>
                              {" — "}
                              {new Date(c.fecha_fin).toLocaleDateString("es-MX")}
                            </>
                          )}
                        </>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={estado.variant} className="text-xs">
                        {estado.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => descargarPDF(c.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
