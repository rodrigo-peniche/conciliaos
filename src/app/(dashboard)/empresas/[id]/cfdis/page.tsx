"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Upload,
  Loader2,
  Search,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

const TIPO_BADGE: Record<string, string> = {
  ingreso: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  egreso: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  traslado: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  nomina: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  pago: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

const ESTADO_ICON: Record<string, React.ReactNode> = {
  vigente: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  cancelado: <XCircle className="h-4 w-4 text-red-500" />,
  no_encontrado: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  por_verificar: <AlertCircle className="h-4 w-4 text-gray-400" />,
};

function formatMoney(n: number | null) {
  if (n == null) return "$0.00";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
}

export default function CfdisPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cfdis, setCfdis] = useState<Cfdi[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    total: number;
    insertados: number;
    errores: string[];
  } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [ordenCampo, setOrdenCampo] = useState<"fecha_emision" | "total">(
    "fecha_emision"
  );
  const [ordenAsc, setOrdenAsc] = useState(false);

  // Cargar CFDIs
  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("cfdis")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("fecha_emision", { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error cargando CFDIs:", error);
      }
      setCfdis((data as unknown as Cfdi[]) || []);
      setLoading(false);
    };
    cargar();
  }, [empresaId]);

  // Upload XMLs
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("empresaId", empresaId);
    for (let i = 0; i < files.length; i++) {
      if (files[i].name.toLowerCase().endsWith(".xml")) {
        formData.append(`file_${i}`, files[i]);
      }
    }

    try {
      const res = await fetch("/api/cfdis/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploadResult(data);

      // Reload CFDIs
      const supabase = createClient();
      const { data: refreshed } = await supabase
        .from("cfdis")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("fecha_emision", { ascending: false })
        .limit(500);
      setCfdis((refreshed as unknown as Cfdi[]) || []);
    } catch (err) {
      console.error("Error subiendo XMLs:", err);
      alert("Error subiendo archivos.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filtrar y ordenar
  const cfdisFiltrados = cfdis
    .filter((c) => {
      if (filtroTipo && c.tipo !== filtroTipo) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        return (
          c.uuid.toLowerCase().includes(q) ||
          c.emisor_nombre?.toLowerCase().includes(q) ||
          c.emisor_rfc.toLowerCase().includes(q) ||
          c.receptor_nombre?.toLowerCase().includes(q) ||
          c.receptor_rfc.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const va = ordenCampo === "total" ? a.total : a.fecha_emision;
      const vb = ordenCampo === "total" ? b.total : b.fecha_emision;
      if (va < vb) return ordenAsc ? -1 : 1;
      if (va > vb) return ordenAsc ? 1 : -1;
      return 0;
    });

  // Resumen
  const totalIngresos = cfdis
    .filter((c) => c.tipo === "ingreso" && c.estado_sat === "vigente")
    .reduce((s, c) => s + c.total, 0);
  const totalEgresos = cfdis
    .filter((c) => c.tipo === "egreso" && c.estado_sat === "vigente")
    .reduce((s, c) => s + c.total, 0);

  const toggleOrden = (campo: "fecha_emision" | "total") => {
    if (ordenCampo === campo) {
      setOrdenAsc(!ordenAsc);
    } else {
      setOrdenCampo(campo);
      setOrdenAsc(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CFDIs</h1>
          <p className="text-muted-foreground">
            Gestiona los CFDIs emitidos y recibidos de la empresa.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xml"
            className="hidden"
            onChange={handleUpload}
            // @ts-expect-error webkitdirectory is non-standard
            webkitdirectory=""
            directory=""
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Procesando..." : "Subir carpeta de XMLs"}
          </Button>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <Card
          className={
            uploadResult.errores.length > 0
              ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950"
              : "border-green-300 bg-green-50 dark:bg-green-950"
          }
        >
          <CardContent className="pt-4 text-sm">
            <p>
              <strong>{uploadResult.insertados}</strong> de{" "}
              {uploadResult.total} CFDIs procesados correctamente.
            </p>
            {uploadResult.errores.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-yellow-700 dark:text-yellow-300">
                  {uploadResult.errores.length} errores
                </summary>
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {uploadResult.errores.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen */}
      {cfdis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">{cfdis.length}</p>
              <p className="text-xs text-muted-foreground">Total CFDIs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatMoney(totalIngresos)}
              </p>
              <p className="text-xs text-muted-foreground">Ingresos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatMoney(totalEgresos)}
              </p>
              <p className="text-xs text-muted-foreground">Egresos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-bold">
                {cfdis.filter((c) => c.estado_sat === "cancelado").length}
              </p>
              <p className="text-xs text-muted-foreground">Cancelados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      {cfdis.length > 0 && (
        <Card>
          <CardContent className="pt-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por RFC, nombre o UUID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5">
              {["ingreso", "egreso", "traslado", "nomina", "pago"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(filtroTipo === t ? null : t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filtroTipo === t
                      ? TIPO_BADGE[t]
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {cfdisFiltrados.length} resultados
            </span>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      {cfdis.length > 0 ? (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Estado</th>
                  <th className="p-2 text-left font-medium">Tipo</th>
                  <th
                    className="p-2 text-left font-medium cursor-pointer select-none"
                    onClick={() => toggleOrden("fecha_emision")}
                  >
                    <span className="flex items-center gap-1">
                      Fecha
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="p-2 text-left font-medium">Emisor</th>
                  <th className="p-2 text-left font-medium">Receptor</th>
                  <th
                    className="p-2 text-right font-medium cursor-pointer select-none"
                    onClick={() => toggleOrden("total")}
                  >
                    <span className="flex items-center justify-end gap-1">
                      Total
                      <ArrowUpDown className="h-3 w-3" />
                    </span>
                  </th>
                  <th className="p-2 text-left font-medium">UUID</th>
                </tr>
              </thead>
              <tbody>
                {cfdisFiltrados.slice(0, 200).map((c) => (
                  <tr
                    key={c.id}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-2">
                      <span title={c.estado_sat}>
                        {ESTADO_ICON[c.estado_sat] || c.estado_sat}
                      </span>
                    </td>
                    <td className="p-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          TIPO_BADGE[c.tipo] || ""
                        }`}
                      >
                        {c.tipo}
                      </span>
                    </td>
                    <td className="p-2 whitespace-nowrap text-xs">
                      {new Date(c.fecha_emision).toLocaleDateString("es-MX")}
                    </td>
                    <td className="p-2">
                      <div className="text-xs font-medium truncate max-w-[180px]">
                        {c.emisor_nombre || c.emisor_rfc}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.emisor_rfc}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-xs font-medium truncate max-w-[180px]">
                        {c.receptor_nombre || c.receptor_rfc}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.receptor_rfc}
                      </div>
                    </td>
                    <td className="p-2 text-right whitespace-nowrap text-xs font-mono">
                      {formatMoney(c.total)}
                    </td>
                    <td className="p-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {c.uuid.substring(0, 8)}...
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cfdisFiltrados.length > 200 && (
              <p className="text-center text-xs text-muted-foreground py-3">
                Mostrando 200 de {cfdisFiltrados.length} CFDIs
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Sin CFDIs</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sube una carpeta con archivos XML de CFDIs para comenzar.
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Subir carpeta de XMLs
          </Button>
        </Card>
      )}
    </div>
  );
}
