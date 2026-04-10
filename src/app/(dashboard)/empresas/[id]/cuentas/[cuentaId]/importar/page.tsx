"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { detectarYParsear } from "@/lib/bancos/parsers/auto-detect";
import { normalizarMovimiento, type RawMovimiento } from "@/lib/bancos/normalizer";
import { formatMXN } from "@/lib/utils/currency";
import type { MovimientoNormalizado } from "@/lib/types/conciliaos.types";

export default function ImportarEstadoCuentaPage() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [banco, setBanco] = useState<string>("");
  const [formato, setFormato] = useState<string>("");
  const [confianza, setConfianza] = useState<number>(0);
  const [rawMovimientos, setRawMovimientos] = useState<RawMovimiento[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoNormalizado[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    importados: number;
    duplicados: number;
  } | null>(null);

  const router = useRouter();
  const params = useParams();

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setLoading(true);

    try {
      const content = await uploadedFile.text();
      const result = detectarYParsear(content, uploadedFile.name);

      setBanco(result.banco);
      setFormato(result.formato);
      setConfianza(result.confianza);
      setRawMovimientos(result.movimientos);

      const normalized = result.movimientos.map(normalizarMovimiento);
      setMovimientos(normalized);

      setStep(2);
    } catch (error) {
      console.error("Error al parsear archivo:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileUpload(droppedFile);
    },
    [handleFileUpload]
  );

  const handleImportar = async () => {
    setLoading(true);
    try {
      // TODO: Server action para insertar en Supabase
      // INSERT INTO movimientos_bancarios ... ON CONFLICT (hash_dedup) DO NOTHING
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setImportResult({
        importados: movimientos.length,
        duplicados: 0,
      });
      setStep(4);
    } catch (error) {
      console.error("Error al importar:", error);
    } finally {
      setLoading(false);
    }
  };

  // Estadísticas del archivo
  const totalCargos = movimientos.filter((m) => m.tipo === "cargo").reduce((sum, m) => sum + Math.abs(m.importe), 0);
  const totalAbonos = movimientos.filter((m) => m.tipo === "abono").reduce((sum, m) => sum + m.importe, 0);
  const fechaInicio = movimientos.length > 0 ? movimientos[0].fecha : null;
  const fechaFin = movimientos.length > 0 ? movimientos[movimientos.length - 1].fecha : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Importar Estado de Cuenta
        </h1>
        <p className="text-muted-foreground">
          Sube un archivo CSV, OFX o MT940 de tu banco.
        </p>
      </div>

      <Progress value={(step / 4) * 100} />

      {/* PASO 1: Subir archivo */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Seleccionar archivo
            </CardTitle>
            <CardDescription>
              Formatos soportados: CSV (BBVA, Banamex, Banorte), OFX, MT940
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors hover:border-blue-400 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              {loading ? (
                <Loader2 className="mb-2 h-10 w-10 animate-spin text-blue-600" />
              ) : (
                <FileSpreadsheet className="mb-2 h-10 w-10 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {loading
                  ? "Procesando archivo..."
                  : "Arrastra tu estado de cuenta aquí o haz clic"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, OFX, MT940 — máx. 10MB
              </p>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.ofx,.qfx,.mt940,.sta,.txt,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 2: Preview de detección */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Archivo detectado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Archivo</p>
                <p className="text-sm font-medium">{file?.name}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Banco detectado</p>
                <p className="text-sm font-medium">{banco}</p>
                <Badge
                  variant={confianza >= 0.8 ? "default" : "secondary"}
                  className="mt-1 text-xs"
                >
                  {Math.round(confianza * 100)}% confianza
                </Badge>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Movimientos</p>
                <p className="text-sm font-medium">{movimientos.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Formato</p>
                <p className="text-sm font-medium uppercase">{formato}</p>
              </div>
            </div>

            {/* Preview de primeras 5 filas */}
            <div>
              <p className="text-sm font-medium mb-2">Preview (primeras 5):</p>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.slice(0, 5).map((mov, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs">
                          {mov.fecha.toLocaleDateString("es-MX")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">
                          {mov.descripcion}
                        </TableCell>
                        <TableCell
                          className={`text-xs text-right font-mono ${
                            mov.tipo === "cargo"
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {mov.tipo === "cargo" ? "-" : "+"}
                          {formatMXN(Math.abs(mov.importe))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              mov.tipo === "cargo" ? "destructive" : "default"
                            }
                            className="text-xs"
                          >
                            {mov.tipo}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PASO 3: Resumen antes de importar */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de importación</CardTitle>
            <CardDescription>
              Confirma los datos antes de importar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">
                  Total movimientos
                </p>
                <p className="text-2xl font-bold">{movimientos.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Periodo</p>
                <p className="text-sm font-medium">
                  {fechaInicio?.toLocaleDateString("es-MX")} —{" "}
                  {fechaFin?.toLocaleDateString("es-MX")}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total cargos</p>
                <p className="text-lg font-bold text-red-600">
                  -{formatMXN(totalCargos)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Total abonos</p>
                <p className="text-lg font-bold text-green-600">
                  +{formatMXN(totalAbonos)}
                </p>
              </div>
            </div>

            {movimientos.some((m) => m.rfcContraparte) && (
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Se detectaron{" "}
                  {movimientos.filter((m) => m.rfcContraparte).length} RFCs de
                  contraparte en las descripciones bancarias.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PASO 4: Resultado */}
      {step === 4 && importResult && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle>Importación completada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Importados</p>
                <p className="text-2xl font-bold text-green-600">
                  {importResult.importados}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Duplicados</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {importResult.duplicados}
                </p>
              </div>
            </div>
            <Button
              onClick={() =>
                router.push(
                  `/dashboard/empresas/${params.id}/conciliacion`
                )
              }
            >
              Ir a conciliación
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navegación */}
      {step < 4 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={movimientos.length === 0}
            >
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleImportar} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar {movimientos.length} movimientos
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
