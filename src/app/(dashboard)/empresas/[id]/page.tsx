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
import { Download, FileText, RefreshCw, Calendar, CheckCircle2, Clock } from "lucide-react";
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
  const [satFechaInicio, setSatFechaInicio] = useState("");
  const [satFechaFin, setSatFechaFin] = useState("");
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

  const handleDescargarCfdis = async () => {
    if (!satFechaInicio || !satFechaFin) {
      alert("Selecciona un rango de fechas.");
      return;
    }
    setDescargandoCfdis(true);
    try {
      const res = await fetch(
        `/api/sat/descargar-cfdis?empresaId=${empresaId}&fechaInicio=${satFechaInicio}&fechaFin=${satFechaFin}`
      );
      if (res.ok) {
        setUltimaSync(new Date().toLocaleString("es-MX"));
        cargarDatos();
      } else {
        alert("Error al descargar CFDIs del SAT. Verifica la conexion.");
      }
    } catch {
      alert("Error de conexion con el servicio del SAT.");
    }
    setDescargandoCfdis(false);
  };

  const handleDescargarDeclaraciones = async () => {
    if (!satFechaInicio || !satFechaFin) {
      alert("Selecciona un rango de fechas.");
      return;
    }
    setDescargandoDeclaraciones(true);
    try {
      const res = await fetch(
        `/api/sat/descargar-declaraciones?empresaId=${empresaId}&fechaInicio=${satFechaInicio}&fechaFin=${satFechaFin}`
      );
      if (res.ok) {
        setUltimaSync(new Date().toLocaleString("es-MX"));
      } else {
        alert("Error al descargar declaraciones del SAT.");
      }
    } catch {
      alert("Error de conexion con el servicio del SAT.");
    }
    setDescargandoDeclaraciones(false);
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

      {/* Descarga del SAT */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-600" />
                Descargar del SAT
              </CardTitle>
              <CardDescription>
                Descarga CFDIs y declaraciones directamente del portal del SAT.
              </CardDescription>
            </div>
            {ultimaSync && (
              <Badge variant="outline" className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Ultima sincronizacion: {ultimaSync}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Fecha inicio
              </label>
              <Input
                type="date"
                value={satFechaInicio}
                onChange={(e) => setSatFechaInicio(e.target.value)}
                className="w-[170px]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Fecha fin
              </label>
              <Input
                type="date"
                value={satFechaFin}
                onChange={(e) => setSatFechaFin(e.target.value)}
                className="w-[170px]"
              />
            </div>
            <Button
              onClick={handleDescargarCfdis}
              disabled={descargandoCfdis}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {descargandoCfdis ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="mr-2 h-4 w-4" />
              )}
              Descargar CFDIs del SAT
            </Button>
            <Button
              variant="outline"
              onClick={handleDescargarDeclaraciones}
              disabled={descargandoDeclaraciones}
            >
              {descargandoDeclaraciones ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Descargar Declaraciones
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              La descarga puede tardar varios minutos dependiendo del volumen de CFDIs.
            </span>
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
