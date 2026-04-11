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
import { Download, FileText, RefreshCw, Calendar, CheckCircle2, Clock, Upload, FolderUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

// Datos demo mientras no hay datos reales
const DEFAULT_KPI: KpiData = {
  cfdisRecibidos: 0,
  cfdiVariacion: 0,
  gastoTotal: 0,
  pctDeducible: 0,
  pctConciliacion: 0,
  movsPendientes: 0,
  alertasActivas: 0,
};

const DEFAULT_CHECKEOS: CheckeoFiscal[] = [
  {
    id: "cfdis",
    descripcion: "CFDIs descargados y actualizados",
    estado: "warning",
    detalle: "Sincroniza con el SAT para actualizar",
  },
  {
    id: "conciliacion",
    descripcion: "Conciliación bancaria al día",
    estado: "warning",
    detalle: "Importa un estado de cuenta para comenzar",
  },
  {
    id: "efos",
    descripcion: "Sin proveedores en lista EFOS/EDOS",
    estado: "ok",
    detalle: "No se detectaron proveedores en lista negra",
  },
  {
    id: "declaraciones",
    descripcion: "Declaraciones presentadas al corriente",
    estado: "warning",
    detalle: "Verificar en portal del SAT",
  },
  {
    id: "contratos",
    descripcion: "Contratos vigentes con proveedores principales",
    estado: "warning",
    detalle: "Genera contratos desde el módulo de contratos",
  },
  {
    id: "trazabilidad",
    descripcion: "Trazabilidad documental completa",
    estado: "warning",
    detalle: "Adjunta documentos de soporte a los CFDIs",
  },
];

const DEFAULT_GRAFICA: DatoMensual[] = [
  { mes: "Nov", deducible: 0, noDeducible: 0 },
  { mes: "Dic", deducible: 0, noDeducible: 0 },
  { mes: "Ene", deducible: 0, noDeducible: 0 },
  { mes: "Feb", deducible: 0, noDeducible: 0 },
  { mes: "Mar", deducible: 0, noDeducible: 0 },
  { mes: "Abr", deducible: 0, noDeducible: 0 },
];

export default function EmpresaDashboardPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const { empresaActual } = useEmpresaStore();

  const [kpi, setKpi] = useState<KpiData>(DEFAULT_KPI);
  const [checkeos, setCheckeos] = useState<CheckeoFiscal[]>(DEFAULT_CHECKEOS);
  const [grafica, setGrafica] = useState<DatoMensual[]>(DEFAULT_GRAFICA);
  const [alertas] = useState<Alerta[]>([]);
  const [cfdisRecientes, setCfdisRecientes] = useState<Cfdi[]>([]);
  const [satFechaInicio, setSatFechaInicio] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [satFechaFin, setSatFechaFin] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [descargandoCfdis, setDescargandoCfdis] = useState(false);
  const [descargandoDeclaraciones, setDescargandoDeclaraciones] = useState(false);
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);

  // Cargar datos reales si existen
  const cargarDatos = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/conciliacion?empresaId=${empresaId}`
      );
      if (res.ok) {
        const data = await res.json();
        const cfdis: Cfdi[] = data.cfdis || [];
        const movs = data.movimientos || [];

        if (cfdis.length > 0) {
          setCfdisRecientes(cfdis.slice(0, 10));

          const gastoTotal = cfdis.reduce((s: number, c: Cfdi) => s + c.total, 0);
          const deducibles = cfdis.filter((c: Cfdi) => c.es_deducible);
          const pctDed =
            cfdis.length > 0
              ? Math.round((deducibles.length / cfdis.length) * 100)
              : 0;

          const conciliados = movs.filter(
            (m: { estado_conciliacion: string }) => m.estado_conciliacion === "conciliado"
          ).length;
          const pctConc =
            movs.length > 0
              ? Math.round((conciliados / movs.length) * 100)
              : 0;

          setKpi({
            cfdisRecibidos: cfdis.length,
            cfdiVariacion: 0,
            gastoTotal,
            pctDeducible: pctDed,
            pctConciliacion: pctConc,
            movsPendientes: movs.length - conciliados,
            alertasActivas: 0,
          });
        }
      }
    } catch {
      // use defaults
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
        // Parse basic CFDI data from XML
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
        const formaPago = comp.getAttribute("FormaPago") || "";
        const metodoPago = comp.getAttribute("MetodoPago") || "";
        const version = comp.getAttribute("Version") || "4.0";
        const serie = comp.getAttribute("Serie") || "";
        const folio = comp.getAttribute("Folio") || "";
        const usoCfdi = doc.querySelector("Receptor, *|Receptor")?.getAttribute("UsoCFDI") || "";
        const regimenEmisor = doc.querySelector("Emisor, *|Emisor")?.getAttribute("RegimenFiscal") || "";

        // Parse impuestos
        const trasladados = doc.querySelectorAll("Traslado, *|Traslado");
        let ivaTraslado = 0;
        let isrRetencion = 0;
        let ivaRetencion = 0;
        trasladados.forEach((t) => {
          if (t.getAttribute("Impuesto") === "002") {
            ivaTraslado += parseFloat(t.getAttribute("Importe") || "0");
          }
        });
        const retenidos = doc.querySelectorAll("Retencion, *|Retencion");
        retenidos.forEach((r) => {
          if (r.getAttribute("Impuesto") === "001") {
            isrRetencion += parseFloat(r.getAttribute("Importe") || "0");
          }
          if (r.getAttribute("Impuesto") === "002") {
            ivaRetencion += parseFloat(r.getAttribute("Importe") || "0");
          }
        });

        const tipoMap: Record<string, string> = { I: "ingreso", E: "egreso", T: "traslado", P: "pago", N: "nomina" };

        await supabase.from("cfdis").upsert({
          empresa_id: empresaId,
          uuid: uuid.toUpperCase(),
          rfc_emisor: rfcEmisor,
          nombre_emisor: nombreEmisor,
          rfc_receptor: rfcReceptor,
          nombre_receptor: nombreReceptor,
          total,
          subtotal,
          fecha_emision: fecha,
          moneda,
          tipo_cambio: tipoCambio,
          tipo_comprobante: tipoMap[tipoComprobante] || "ingreso",
          forma_pago: formaPago,
          metodo_pago: metodoPago,
          version_cfdi: version,
          serie,
          folio,
          uso_cfdi: usoCfdi,
          regimen_emisor: regimenEmisor,
          iva_trasladado: ivaTraslado,
          isr_retenido: isrRetencion,
          iva_retenido: ivaRetencion,
          xml_url: null,
          estado_sat: "vigente",
          es_deducible: null,
        } as never, { onConflict: "uuid" });

        processed++;
        setCfdisCount(processed);
      } catch {
        errors++;
      }
    }

    setCfdisResult(`${processed} CFDIs cargados${errors > 0 ? `, ${errors} con error` : ""}.`);
    setCfdisProcessing(false);
    setUltimaSync(new Date().toLocaleString("es-MX"));
    cargarDatos();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {empresaActual?.nombre_comercial ||
            empresaActual?.razon_social ||
            "Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Resumen fiscal y contable del periodo actual.
        </p>
      </div>

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
                    const res = await fetch(
                      `/api/sat/sync?empresaId=${empresaId}&fechaInicio=${satFechaInicio}&fechaFin=${satFechaFin}`
                    );
                    if (res.ok) {
                      setUltimaSync(new Date().toLocaleString("es-MX"));
                      cargarDatos();
                      alert("Descarga de CFDIs iniciada. Revisa el progreso en unos minutos.");
                    } else {
                      const data = await res.json().catch(() => ({}));
                      alert(data.error || "Error: Verifica que la e.firma esté configurada en la empresa.");
                    }
                  } catch {
                    alert("Error de conexión. Verifica tu e.firma en Configuración de la empresa.");
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
