"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  FileUp,
  Landmark,
  Calendar,
  Loader2,
} from "lucide-react";
import type { Database } from "@/lib/types/database.types";
import * as XLSX from "xlsx";

type MovimientoBancario = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];
type CuentaBancaria = Database["public"]["Tables"]["cuentas_bancarias"]["Row"];

export default function BancosPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const supabase = createClient();

  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<string>("");
  const [movimientos, setMovimientos] = useState<MovimientoBancario[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const cargarCuentas = useCallback(async () => {
    const { data } = await supabase
      .from("cuentas_bancarias" as never)
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("activa", true);
    if (data) {
      setCuentas(data as unknown as CuentaBancaria[]);
      if ((data as unknown as CuentaBancaria[]).length > 0 && !cuentaSeleccionada) {
        setCuentaSeleccionada((data as unknown as CuentaBancaria[])[0].id);
      }
    }
  }, [empresaId, supabase, cuentaSeleccionada]);

  const cargarMovimientos = useCallback(async () => {
    if (!cuentaSeleccionada) return;
    setLoading(true);
    let query = supabase
      .from("movimientos_bancarios" as never)
      .select("*")
      .eq("empresa_id", empresaId)
      .eq("cuenta_id", cuentaSeleccionada)
      .order("fecha", { ascending: false });

    if (fechaInicio) {
      query = query.gte("fecha", fechaInicio);
    }
    if (fechaFin) {
      query = query.lte("fecha", fechaFin);
    }

    const { data } = await query;
    if (data) {
      setMovimientos(data as unknown as MovimientoBancario[]);
    }
    setLoading(false);
  }, [cuentaSeleccionada, empresaId, supabase, fechaInicio, fechaFin]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  const movimientosFiltrados = movimientos.filter((m) => {
    if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        (m.descripcion?.toLowerCase().includes(term)) ||
        (m.referencia?.toLowerCase().includes(term)) ||
        (m.nombre_contraparte?.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const handleDescargarPlantilla = () => {
    const wb = XLSX.utils.book_new();
    const headers = [["Fecha", "Referencia", "Descripcion", "Cargo", "Abono", "Saldo"]];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, "plantilla_movimientos_bancarios.xlsx");
  };

  const handleImportarExcel = async (file: File) => {
    if (!cuentaSeleccionada) {
      alert("Selecciona una cuenta bancaria primero.");
      return;
    }
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const inserts = rows.map((row) => {
        const cargo = Number(row["Cargo"] || 0);
        const abono = Number(row["Abono"] || 0);
        const importe = abono > 0 ? abono : -cargo;
        const tipo = abono > 0 ? "abono" : "cargo";

        let fecha = String(row["Fecha"] || "");
        if (/^\d+$/.test(fecha)) {
          const d = XLSX.SSF.parse_date_code(Number(fecha));
          fecha = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
        }

        return {
          cuenta_id: cuentaSeleccionada,
          empresa_id: empresaId,
          fecha,
          referencia: String(row["Referencia"] || ""),
          descripcion: String(row["Descripcion"] || row["Descripción"] || ""),
          importe,
          tipo,
          saldo: row["Saldo"] != null ? Number(row["Saldo"]) : null,
        };
      });

      if (inserts.length > 0) {
        const { error } = await supabase
          .from("movimientos_bancarios" as never)
          .insert(inserts as never);
        if (error) {
          alert("Error al importar: " + error.message);
        } else {
          alert(`Se importaron ${inserts.length} movimientos correctamente.`);
          cargarMovimientos();
        }
      }
    } catch (err) {
      alert("Error al leer el archivo Excel.");
      console.error(err);
    }
    setLoading(false);
  };

  const handleExportarExcel = () => {
    const data = movimientosFiltrados.map((m) => ({
      Fecha: m.fecha,
      Referencia: m.referencia || "",
      Descripcion: m.descripcion || "",
      Cargo: m.tipo === "cargo" ? Math.abs(m.importe) : "",
      Abono: m.tipo === "abono" ? m.importe : "",
      Saldo: m.saldo ?? "",
      Estado: m.estado_conciliacion,
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Movimientos");
    XLSX.writeFile(wb, "movimientos_bancarios.xlsx");
  };

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handlePdfUpload(files[0]);
    }
  };

  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [pdfResult, setPdfResult] = useState<string | null>(null);

  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Solo se aceptan archivos PDF.");
      return;
    }
    if (!cuentaSeleccionada) {
      alert("Selecciona una cuenta bancaria primero.");
      return;
    }

    setPdfProcessing(true);
    setPdfResult(null);

    try {
      const cuentaSel = cuentas.find(c => c.id === cuentaSeleccionada);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cuentaId", cuentaSeleccionada);
      formData.append("empresaId", empresaId);
      if (cuentaSel?.tipo) formData.append("tipoCuenta", cuentaSel.alias || cuentaSel.tipo);

      const res = await fetch("/api/bancos/extracto", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setPdfResult(`Error: ${data.error}`);
        setPdfProcessing(false);
        return;
      }

      if (!data.movimientos || data.movimientos.length === 0) {
        setPdfResult("No se encontraron movimientos en el PDF.");
        setPdfProcessing(false);
        return;
      }

      // Insertar movimientos en Supabase
      const inserts = data.movimientos.map((m: { fecha: string; referencia: string; descripcion: string; cargo: number; abono: number; saldo: number | null }) => {
        const importe = m.abono > 0 ? m.abono : -m.cargo;
        const tipo = m.abono > 0 ? "abono" : "cargo";
        return {
          cuenta_id: cuentaSeleccionada,
          empresa_id: empresaId,
          fecha: m.fecha,
          referencia: m.referencia || "",
          descripcion: m.descripcion || "",
          importe,
          tipo,
          saldo: m.saldo,
        };
      });

      const { error: insertError } = await supabase
        .from("movimientos_bancarios" as never)
        .insert(inserts as never);

      if (insertError) {
        setPdfResult(`Error al guardar: ${insertError.message}`);
      } else {
        setPdfResult(`${data.total} movimientos importados de ${data.banco || "estado de cuenta"} (${data.periodo || ""}).`);
        cargarMovimientos();
      }
    } catch (err) {
      console.error("Error procesando PDF:", err);
      setPdfResult("Error al procesar el PDF. Intenta de nuevo.");
    }
    setPdfProcessing(false);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-8 w-8" />
            Bancos
          </h1>
          <p className="text-muted-foreground">
            Administra estados de cuenta, importa y exporta movimientos bancarios.
          </p>
        </div>
      </div>

      {/* Selector de cuenta */}
      {cuentas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cuenta bancaria</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={cuentaSeleccionada} onValueChange={(v) => setCuentaSeleccionada(v ?? "")}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Selecciona una cuenta">
                  {(() => {
                    const sel = cuentas.find(c => c.id === cuentaSeleccionada);
                    return sel ? `${sel.banco} - ${sel.alias || sel.numero_cuenta || sel.clabe} (${sel.moneda})` : "Selecciona una cuenta";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {cuentas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.banco} - {c.alias || c.numero_cuenta || c.clabe} ({c.moneda})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Upload y acciones */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upload PDF */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subir estado de cuenta (PDF)</CardTitle>
            <CardDescription>
              Arrastra un PDF de estado de cuenta bancario para procesarlo automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                pdfProcessing ? "border-blue-500 bg-blue-50 dark:bg-blue-950" :
                dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-muted-foreground/25"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handlePdfDrop}
              onClick={() => !pdfProcessing && fileInputRef.current?.click()}
            >
              {pdfProcessing ? (
                <>
                  <Loader2 className="mx-auto h-10 w-10 text-blue-600 mb-3 animate-spin" />
                  <p className="text-sm font-medium text-blue-700">
                    Procesando estado de cuenta con IA...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Esto puede tomar unos segundos
                  </p>
                </>
              ) : (
                <>
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra un archivo PDF aqui o haz clic para seleccionar
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
                }}
              />
            </div>
            {pdfResult && (
              <div className={`rounded-lg p-3 text-sm ${
                pdfResult.startsWith("Error") ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              }`}>
                {pdfResult}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import/Export Excel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importar / Exportar movimientos</CardTitle>
            <CardDescription>
              Descarga la plantilla, llena los movimientos y vuelve a importarla.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleDescargarPlantilla}>
              <Download className="mr-2 h-4 w-4" />
              Descargar plantilla Excel
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => excelInputRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Importar movimientos
            </Button>
            <input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImportarExcel(e.target.files[0]);
              }}
            />
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportarExcel}
              disabled={movimientosFiltrados.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Movimientos bancarios</CardTitle>
          <CardDescription>
            {movimientosFiltrados.length} movimiento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descripcion, referencia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v ?? "todos")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="cargo">Cargo</SelectItem>
                <SelectItem value="abono">Abono</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>

          {/* Tabla */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Cargando movimientos...
                    </TableCell>
                  </TableRow>
                ) : movimientosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay movimientos. Importa un estado de cuenta o usa la plantilla Excel.
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientosFiltrados.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="whitespace-nowrap">{m.fecha}</TableCell>
                      <TableCell className="text-xs">{m.referencia || "-"}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{m.descripcion || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={m.tipo === "abono" ? "default" : "secondary"}>
                          {m.tipo === "abono" ? "Abono" : "Cargo"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${m.tipo === "cargo" ? "text-red-600" : "text-green-600"}`}>
                        {m.tipo === "cargo" ? "-" : "+"}{formatMoney(Math.abs(m.importe))}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {m.saldo != null ? formatMoney(m.saldo) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            m.estado_conciliacion === "conciliado"
                              ? "default"
                              : m.estado_conciliacion === "pendiente"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {m.estado_conciliacion}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
