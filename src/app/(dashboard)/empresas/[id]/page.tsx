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
