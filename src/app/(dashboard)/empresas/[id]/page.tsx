"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { KpiCards, type KpiData } from "@/components/dashboard/kpi-cards";
import {
  SemaforoFiscal,
  type CheckeoFiscal,
} from "@/components/dashboard/semaforo-fiscal";
import {
  GraficaCfdiMensual,
  type DatoMensual,
} from "@/components/dashboard/grafica-cfdi-mensual";
import { AlertasPanel, type Alerta } from "@/components/dashboard/alertas-panel";
import { ActividadReciente } from "@/components/dashboard/actividad-reciente";
import { useEmpresaStore } from "@/hooks/use-empresa";
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
import { Download, FileText, RefreshCw, Calendar, CheckCircle2, Upload, FolderUp, AlertTriangle, XCircle, ChevronDown, ChevronUp, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

// Datos default
const DEFAULT_KPI: KpiData = {
  cfdisRecibidos: 0,
  cfdiVariacion: 0,
  gastoTotal: 0,
  pctDeducible: 0,
  pctConciliacion: 0,
  movsPendientes: 0,
  alertasActivas: 0,
};

const DEFAULT_GRAFICA: DatoMensual[] = [
  { mes: "Nov", deducible: 0, noDeducible: 0 },
  { mes: "Dic", deducible: 0, noDeducible: 0 },
  { mes: "Ene", deducible: 0, noDeducible: 0 },
  { mes: "Feb", deducible: 0, noDeducible: 0 },
  { mes: "Mar", deducible: 0, noDeducible: 0 },
  { mes: "Abr", deducible: 0, noDeducible: 0 },
];

// --- Semáforo general de la empresa ---
function calcularEstadoEmpresa(empresa: Empresa | null, cfdis: Cfdi[], checkeos: CheckeoFiscal[]): {
  color: "green" | "yellow" | "red";
  label: string;
  score: number;
} {
  let score = 0;
  let total = 0;

  // 1. CFDIs cargados (20 puntos)
  total += 20;
  if (cfdis.length > 50) score += 20;
  else if (cfdis.length > 10) score += 15;
  else if (cfdis.length > 0) score += 10;

  // 2. e.firma configurada (20 puntos)
  total += 20;
  if (empresa?.efirma_cer_url && empresa?.efirma_key_url) score += 20;

  // 3. Sin cancelados (15 puntos)
  total += 15;
  const cancelados = cfdis.filter(c => c.estado_sat === "cancelado").length;
  if (cancelados === 0) score += 15;
  else if (cancelados < 5) score += 10;
  else if (cancelados < 20) score += 5;

  // 4. Conciliación bancaria (15 puntos)
  total += 15;
  const conciliados = cfdis.filter(c => c.conciliado).length;
  const pctConc = cfdis.length > 0 ? (conciliados / cfdis.length) * 100 : 0;
  if (pctConc >= 80) score += 15;
  else if (pctConc >= 50) score += 10;
  else if (pctConc > 0) score += 5;

  // 5. Datos fiscales completos (15 puntos)
  total += 15;
  if (empresa?.rfc && empresa?.razon_social && empresa?.regimen_codigo && empresa?.codigo_postal) {
    score += 15;
  } else if (empresa?.rfc && empresa?.razon_social) {
    score += 10;
  }

  // 6. Checkeos del semáforo (15 puntos)
  total += 15;
  const okCount = checkeos.filter(c => c.estado === "ok").length;
  const errCount = checkeos.filter(c => c.estado === "error").length;
  if (errCount === 0 && okCount >= 4) score += 15;
  else if (errCount === 0) score += 10;
  else if (errCount < 2) score += 5;

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  if (pct >= 70) return { color: "green", label: "Buen estado", score: pct };
  if (pct >= 40) return { color: "yellow", label: "Requiere atención", score: pct };
  return { color: "red", label: "Acción urgente", score: pct };
}

function EmpresaStatusBar({ estado }: { estado: { color: "green" | "yellow" | "red"; label: string; score: number } }) {
  const colorMap = {
    green: { bg: "bg-green-500", text: "text-green-700", bgLight: "bg-green-50 dark:bg-green-950", border: "border-green-300", icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
    yellow: { bg: "bg-yellow-500", text: "text-yellow-700", bgLight: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-300", icon: <AlertTriangle className="h-5 w-5 text-yellow-600" /> },
    red: { bg: "bg-red-500", text: "text-red-700", bgLight: "bg-red-50 dark:bg-red-950", border: "border-red-300", icon: <XCircle className="h-5 w-5 text-red-600" /> },
  };
  const c = colorMap[estado.color];

  return (
    <div className={`rounded-lg border ${c.border} ${c.bgLight} p-4`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {c.icon}
          <div>
            <p className={`font-semibold ${c.text}`}>{estado.label}</p>
            <p className="text-xs text-muted-foreground">Score fiscal: {estado.score}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${c.bg} rounded-full transition-all`} style={{ width: `${estado.score}%` }} />
          </div>
          <span className={`text-sm font-bold ${c.text}`}>{estado.score}%</span>
        </div>
      </div>
    </div>
  );
}

export default function EmpresaDashboardPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const { empresaActual } = useEmpresaStore();

  const [kpi, setKpi] = useState<KpiData>(DEFAULT_KPI);
  const [checkeos, setCheckeos] = useState<CheckeoFiscal[]>([]);
  const [grafica, setGrafica] = useState<DatoMensual[]>(DEFAULT_GRAFICA);
  const [alertas] = useState<Alerta[]>([]);
  const [allCfdis, setAllCfdis] = useState<Cfdi[]>([]);
  const [cfdisRecientes, setCfdisRecientes] = useState<Cfdi[]>([]);
  const [empresaData, setEmpresaData] = useState<Empresa | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [satFechaInicio, setSatFechaInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [satFechaFin, setSatFechaFin] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [descargandoCfdis, setDescargandoCfdis] = useState(false);
  const [descargandoDeclaraciones] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);

  // Tabla CFDIs
  const [showCfdisTable, setShowCfdisTable] = useState(false);
  const [cfdisFilter, setCfdisFilter] = useState("");
  const [cfdisPage, setCfdisPage] = useState(0);
  const CFDIS_PER_PAGE = 20;

  // Cargar datos reales desde Supabase
  const cargarDatos = useCallback(async () => {
    try {
      const supabase = createClient();
      setLoadError(null);

      // Cargar empresa
      const { data: empData, error: empError } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();

      if (empError) {
        console.error("Error cargando empresa:", empError);
        setLoadError(`Error cargando empresa: ${(empError as { message?: string }).message}`);
      } else {
        setEmpresaData(empData as unknown as Empresa);
      }

      // Cargar CFDIs directamente de Supabase
      const { data: cfdisData, error: cfdisError } = await supabase
        .from("cfdis")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("fecha_emision", { ascending: false });

      if (cfdisError) {
        console.error("Error cargando CFDIs:", cfdisError);
        setLoadError(`Error cargando CFDIs: ${(cfdisError as { message?: string }).message}`);
        return;
      }

      const cfdis = (cfdisData || []) as unknown as Cfdi[];
      setAllCfdis(cfdis);
      setCfdisRecientes(cfdis.slice(0, 10));

      // Calcular KPIs
      const ingresos = cfdis.filter(c => c.tipo === "ingreso").reduce((s, c) => s + (c.total || 0), 0);
      const egresos = cfdis.filter(c => c.tipo === "egreso").reduce((s, c) => s + (c.total || 0), 0);
      const gastoTotal = ingresos + egresos;
      const deducibles = cfdis.filter(c => c.es_deducible === true);
      const analizados = cfdis.filter(c => c.es_deducible !== null);
      const pctDed = analizados.length > 0 ? Math.round((deducibles.length / analizados.length) * 100) : 0;
      const conciliados = cfdis.filter(c => c.conciliado).length;
      const pctConc = cfdis.length > 0 ? Math.round((conciliados / cfdis.length) * 100) : 0;
      const cancelados = cfdis.filter(c => c.estado_sat === "cancelado").length;

      setKpi({
        cfdisRecibidos: cfdis.length,
        cfdiVariacion: 0,
        gastoTotal,
        pctDeducible: pctDed,
        pctConciliacion: pctConc,
        movsPendientes: cfdis.length - conciliados,
        alertasActivas: cancelados,
      });

      // Calcular checkeos dinámicos
      const emp = empData as unknown as Empresa | null;
      const newCheckeos: CheckeoFiscal[] = [
        {
          id: "cfdis",
          descripcion: "CFDIs descargados y actualizados",
          estado: cfdis.length > 0 ? "ok" : "warning",
          detalle: cfdis.length > 0 ? `${cfdis.length} CFDIs cargados` : "Carga tus CFDIs del SAT",
        },
        {
          id: "efirma",
          descripcion: "e.firma (FIEL) configurada",
          estado: emp?.efirma_cer_url && emp?.efirma_key_url ? "ok" : "warning",
          detalle: emp?.efirma_cer_url ? "Certificado y llave cargados" : "Configura tu e.firma para descarga automática",
        },
        {
          id: "cancelados",
          descripcion: "CFDIs cancelados bajo control",
          estado: cancelados === 0 ? "ok" : cancelados < 5 ? "warning" : "error",
          detalle: cancelados === 0 ? "Sin CFDIs cancelados" : `${cancelados} CFDI(s) cancelado(s)`,
        },
        {
          id: "conciliacion",
          descripcion: "Conciliación bancaria al día",
          estado: pctConc >= 80 ? "ok" : pctConc > 0 ? "warning" : "warning",
          detalle: pctConc > 0 ? `${pctConc}% conciliado` : "Importa un estado de cuenta para comenzar",
        },
        {
          id: "efos",
          descripcion: "Sin proveedores en lista EFOS/EDOS",
          estado: "ok",
          detalle: "No se detectaron proveedores en lista negra",
        },
        {
          id: "datos",
          descripcion: "Datos fiscales completos",
          estado: emp?.rfc && emp?.razon_social && emp?.regimen_codigo ? "ok" : "warning",
          detalle: emp?.rfc ? `RFC: ${emp.rfc}` : "Completa los datos fiscales de la empresa",
        },
      ];
      setCheckeos(newCheckeos);

      // Generar datos de gráfica por mes
      if (cfdis.length > 0) {
        const meses: Record<string, { ingresos: number; egresos: number }> = {};
        cfdis.forEach((c) => {
          const fecha = c.fecha_emision ? new Date(c.fecha_emision) : null;
          if (!fecha) return;
          const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
          if (!meses[key]) meses[key] = { ingresos: 0, egresos: 0 };
          if (c.tipo === "ingreso") {
            meses[key].ingresos += c.total || 0;
          } else if (c.tipo === "egreso") {
            meses[key].egresos += c.total || 0;
          }
        });

        const graficaData: DatoMensual[] = Object.entries(meses)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([mes, data]) => ({
            mes: new Date(mes + "-01").toLocaleDateString("es-MX", { month: "short" }),
            deducible: Math.round(data.ingresos),
            noDeducible: Math.round(data.egresos),
          }));

        if (graficaData.length > 0) setGrafica(graficaData);
      }
    } catch (e) {
      console.error("Error cargando datos:", e);
      setLoadError(`Error inesperado: ${e instanceof Error ? e.message : "desconocido"}`);
    }
  }, [empresaId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const [cfdisCount, setCfdisCount] = useState(0);
  const [cfdisProcessing, setCfdisProcessing] = useState(false);
  const [cfdisResult, setCfdisResult] = useState<string | null>(null);

  const handleCargarCfdis = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCfdisProcessing(true);
    setCfdisResult(null);
    setCfdisCount(0);

    const supabase = createClient();
    let processed = 0;
    let errors = 0;
    let firstError = "";

    const xmlFiles = Array.from(files).filter(
      (f) => f.name.toLowerCase().endsWith(".xml")
    );

    if (xmlFiles.length === 0) {
      setCfdisResult("No se encontraron archivos XML en la selección.");
      setCfdisProcessing(false);
      return;
    }

    for (const file of xmlFiles) {
      try {
        const text = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/xml");
        const comp = doc.querySelector("Comprobante") || doc.querySelector("*|Comprobante");

        if (!comp) { errors++; continue; }

        const uuid = doc.querySelector("TimbreFiscalDigital, *|TimbreFiscalDigital")?.getAttribute("UUID") ||
                     doc.querySelector("[UUID]")?.getAttribute("UUID") || "";
        const rfcEmisor = doc.querySelector("Emisor, *|Emisor")?.getAttribute("Rfc") || "";
        const nombreEmisor = doc.querySelector("Emisor, *|Emisor")?.getAttribute("Nombre") || "";
        const rfcReceptor = doc.querySelector("Receptor, *|Receptor")?.getAttribute("Rfc") || "";
        const nombreReceptor = doc.querySelector("Receptor, *|Receptor")?.getAttribute("Nombre") || "";
        const total = parseFloat(comp.getAttribute("Total") || "0");
        const subtotal = parseFloat(comp.getAttribute("SubTotal") || "0");
        const fecha = comp.getAttribute("Fecha") || "";
        const moneda = comp.getAttribute("Moneda") || "MXN";
        const tipoCambio = parseFloat(comp.getAttribute("TipoCambio") || "1");
        const tipoComprobante = comp.getAttribute("TipoDeComprobante") || "I";
        const version = comp.getAttribute("Version") || "4.0";
        const usoCfdi = doc.querySelector("Receptor, *|Receptor")?.getAttribute("UsoCFDI") || "";
        const regimenEmisor = doc.querySelector("Emisor, *|Emisor")?.getAttribute("RegimenFiscal") || "";

        // Parse impuestos
        const trasladados = doc.querySelectorAll("Traslado, *|Traslado");
        let ivaTraslado = 0;
        trasladados.forEach((t) => {
          if (t.getAttribute("Impuesto") === "002") {
            ivaTraslado += parseFloat(t.getAttribute("Importe") || "0");
          }
        });
        const retenidos = doc.querySelectorAll("Retencion, *|Retencion");
        let isrRetencion = 0;
        let ivaRetencion = 0;
        retenidos.forEach((r) => {
          if (r.getAttribute("Impuesto") === "001") {
            isrRetencion += parseFloat(r.getAttribute("Importe") || "0");
          }
          if (r.getAttribute("Impuesto") === "002") {
            ivaRetencion += parseFloat(r.getAttribute("Importe") || "0");
          }
        });

        const tipoMap: Record<string, string> = { I: "ingreso", E: "egreso", T: "traslado", P: "pago", N: "nomina" };

        const { error: upsertError } = await supabase.from("cfdis").upsert({
          empresa_id: empresaId,
          uuid: uuid.toUpperCase(),
          tipo: tipoMap[tipoComprobante] || "ingreso",
          version: version,
          emisor_rfc: rfcEmisor,
          emisor_nombre: nombreEmisor,
          emisor_regimen: regimenEmisor,
          receptor_rfc: rfcReceptor,
          receptor_nombre: nombreReceptor,
          receptor_uso_cfdi: usoCfdi,
          subtotal,
          total,
          moneda,
          tipo_cambio: tipoCambio,
          fecha_emision: fecha,
          estado_sat: "vigente",
        } as never, { onConflict: "uuid" });

        if (upsertError) {
          console.error(`Error CFDI ${file.name}:`, upsertError);
          if (errors === 0) {
            firstError = `${upsertError.message} (${upsertError.code || ""})`;
          }
          errors++;
        } else {
          processed++;
        }
        setCfdisCount(processed + errors);
      } catch (e) {
        console.error(`Error parsing ${file.name}:`, e);
        errors++;
      }
    }

    let resultMsg = `${processed} CFDIs cargados exitosamente`;
    if (errors > 0) {
      resultMsg += `, ${errors} con error`;
      if (firstError) resultMsg += `: ${firstError}`;
    }
    setCfdisResult(resultMsg + ".");
    setCfdisProcessing(false);
    setUltimaSync(new Date().toLocaleString("es-MX"));
    cargarDatos();
  };

  // Filtrar CFDIs para la tabla
  const filteredCfdis = allCfdis.filter(c => {
    if (!cfdisFilter) return true;
    const q = cfdisFilter.toLowerCase();
    return (
      (c.emisor_nombre || "").toLowerCase().includes(q) ||
      (c.emisor_rfc || "").toLowerCase().includes(q) ||
      (c.receptor_nombre || "").toLowerCase().includes(q) ||
      (c.receptor_rfc || "").toLowerCase().includes(q) ||
      (c.uuid || "").toLowerCase().includes(q) ||
      (c.tipo || "").toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filteredCfdis.length / CFDIS_PER_PAGE);
  const paginatedCfdis = filteredCfdis.slice(cfdisPage * CFDIS_PER_PAGE, (cfdisPage + 1) * CFDIS_PER_PAGE);

  // Estado de la empresa
  const estadoEmpresa = calcularEstadoEmpresa(empresaData, allCfdis, checkeos);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {empresaActual?.nombre_comercial ||
            empresaActual?.razon_social ||
            empresaData?.nombre_comercial ||
            empresaData?.razon_social ||
            "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Resumen fiscal y contable del periodo actual.
        </p>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <XCircle className="h-4 w-4" />
            <span className="text-sm font-medium">{loadError}</span>
          </div>
        </div>
      )}

      {/* Semáforo general de la empresa */}
      <EmpresaStatusBar estado={estadoEmpresa} />

      {/* Cargar CFDIs */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FolderUp className="h-5 w-5 text-blue-600" />
                Cargar CFDIs
              </CardTitle>
              <CardDescription>
                Selecciona la carpeta con tus XMLs del SAT o arrastra los archivos.
              </CardDescription>
            </div>
            {ultimaSync && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Última carga: {ultimaSync}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Seleccionar carpeta de CFDIs */}
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                cfdisProcessing
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-950"
                  : "hover:border-blue-400"
              }`}
              onClick={() => !cfdisProcessing && document.getElementById("cfdis-folder")?.click()}
            >
              {cfdisProcessing ? (
                <>
                  <RefreshCw className="mb-2 h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-sm font-medium text-blue-700">
                    Procesando... {cfdisCount} XMLs
                  </p>
                </>
              ) : (
                <>
                  <FolderUp className="mb-2 h-8 w-8 text-blue-600" />
                  <p className="text-sm font-medium">Seleccionar carpeta de XMLs</p>
                  <p className="text-xs text-muted-foreground">
                    Selecciona la carpeta completa con tus CFDIs (.xml)
                  </p>
                </>
              )}
              <input
                id="cfdis-folder"
                type="file"
                accept=".xml"
                multiple
                className="hidden"
                {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                onChange={(e) => handleCargarCfdis(e.target.files)}
              />
            </div>

            {/* Seleccionar archivos individuales */}
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => !cfdisProcessing && document.getElementById("cfdis-files")?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Seleccionar archivos XML</p>
              <p className="text-xs text-muted-foreground">
                O selecciona uno o más archivos XML individualmente
              </p>
              <input
                id="cfdis-files"
                type="file"
                accept=".xml"
                multiple
                className="hidden"
                onChange={(e) => handleCargarCfdis(e.target.files)}
              />
            </div>
          </div>

          {cfdisResult && (
            <div className={`rounded-lg p-3 ${
              cfdisResult.includes("error")
                ? "bg-yellow-50 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
                : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">{cfdisResult}</span>
              </div>
            </div>
          )}

          {/* Descarga automática del SAT */}
          <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-600" />
              Descarga automática del SAT (con e.firma)
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fecha inicio
                </label>
                <Input
                  type="date"
                  value={satFechaInicio}
                  onChange={(e) => setSatFechaInicio(e.target.value)}
                  className="w-[160px] h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Fecha fin
                </label>
                <Input
                  type="date"
                  value={satFechaFin}
                  onChange={(e) => setSatFechaFin(e.target.value)}
                  className="w-[160px] h-8 text-sm"
                />
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  if (!satFechaInicio || !satFechaFin) {
                    alert("Selecciona un rango de fechas.");
                    return;
                  }
                  setDescargandoCfdis(true);
                  try {
                    const res = await fetch("/api/sat/sync", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        empresaId,
                        fechaInicio: satFechaInicio,
                        fechaFin: satFechaFin,
                        tipo: "recibidos",
                      }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                      setUltimaSync(new Date().toLocaleString("es-MX"));
                      cargarDatos();
                      if (data.estado === "completado") {
                        setCfdisResult(`SAT: ${data.totalDescargados} CFDIs descargados exitosamente${data.totalErrores > 0 ? `, ${data.totalErrores} errores` : ""}.`);
                      } else if (data.estado === "en_proceso") {
                        setCfdisResult(`SAT: Solicitud en proceso (${data.numeroCFDIs || 0} CFDIs encontrados). El SAT puede tardar minutos u horas. Intenta de nuevo más tarde.`);
                      } else {
                        setCfdisResult(`SAT: ${data.mensaje || "Sincronización iniciada."}`);
                      }
                    } else {
                      alert("Error: " + (data.error || "Verifica que la e.firma esté configurada."));
                    }
                  } catch {
                    alert("Error de conexión con el servidor. Intenta de nuevo.");
                  }
                  setDescargandoCfdis(false);
                }}
                disabled={descargandoCfdis}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {descargandoCfdis ? (
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-3.5 w-3.5" />
                )}
                Descargar CFDIs del SAT
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  alert("Función de declaraciones en desarrollo. Próximamente disponible.");
                }}
                disabled={descargandoDeclaraciones}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Declaraciones
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Requiere e.firma (.cer + .key) configurada. La descarga puede tardar varios minutos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <KpiCards data={kpi} />

      {/* Tabla de CFDIs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Facturas Cargadas ({allCfdis.length})
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCfdisTable(!showCfdisTable)}
            >
              {showCfdisTable ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              {showCfdisTable ? "Ocultar" : "Ver todas"}
            </Button>
          </div>
        </CardHeader>
        {showCfdisTable && (
          <CardContent className="p-0">
            {/* Filtro */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por emisor, receptor, RFC, UUID..."
                  value={cfdisFilter}
                  onChange={(e) => { setCfdisFilter(e.target.value); setCfdisPage(0); }}
                  className="pl-9 h-8 text-sm"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Emisor</TableHead>
                    <TableHead className="text-xs">RFC Emisor</TableHead>
                    <TableHead className="text-xs">Receptor</TableHead>
                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs">Moneda</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">UUID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCfdis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">
                        {allCfdis.length === 0 ? "No hay CFDIs cargados. Sube tus XMLs arriba." : "Sin resultados para el filtro."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedCfdis.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs font-mono whitespace-nowrap">
                          {c.fecha_emision ? new Date(c.fecha_emision).toLocaleDateString("es-MX") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              c.tipo === "ingreso" ? "border-green-300 text-green-700" :
                              c.tipo === "egreso" ? "border-red-300 text-red-700" :
                              c.tipo === "pago" ? "border-blue-300 text-blue-700" :
                              "border-gray-300"
                            }`}
                          >
                            {c.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{c.emisor_nombre || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{c.emisor_rfc}</TableCell>
                        <TableCell className="text-xs max-w-[150px] truncate">{c.receptor_nombre || "-"}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatMXN(c.subtotal)}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-semibold">{formatMXN(c.total)}</TableCell>
                        <TableCell className="text-xs">{c.moneda}</TableCell>
                        <TableCell>
                          <Badge
                            variant={c.estado_sat === "vigente" ? "default" : c.estado_sat === "cancelado" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {c.estado_sat}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground max-w-[120px] truncate">
                          {c.uuid?.substring(0, 8)}...
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Mostrando {cfdisPage * CFDIS_PER_PAGE + 1}-{Math.min((cfdisPage + 1) * CFDIS_PER_PAGE, filteredCfdis.length)} de {filteredCfdis.length}
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={cfdisPage === 0} onClick={() => setCfdisPage(p => p - 1)}>
                    Anterior
                  </Button>
                  <Button size="sm" variant="outline" disabled={cfdisPage >= totalPages - 1} onClick={() => setCfdisPage(p => p + 1)}>
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Gráfica + Semáforo */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <GraficaCfdiMensual datos={grafica} />
        </div>
        <div className="lg:col-span-2">
          <SemaforoFiscal checkeos={checkeos} />
        </div>
      </div>

      {/* Alertas + Actividad reciente */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AlertasPanel alertas={alertas} />
        <ActividadReciente cfdis={cfdisRecientes} />
      </div>
    </div>
  );
}
