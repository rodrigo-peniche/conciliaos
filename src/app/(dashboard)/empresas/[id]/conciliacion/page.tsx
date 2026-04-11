"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftRight,
  Play,
  Loader2,
  CheckCircle2,
  Download,
  Landmark,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TablaMovimientos } from "@/components/conciliacion/tabla-movimientos";
import { TablaCfdis } from "@/components/conciliacion/tabla-cfdis";
import { PartidasConciliadas } from "@/components/conciliacion/partida-conciliada";
import { PanelDiferencias } from "@/components/conciliacion/panel-diferencias";
import {
  FiltrosConciliacion,
  type FiltrosConciliacionState,
} from "@/components/conciliacion/filtros-conciliacion";
import type { Database } from "@/lib/types/database.types";

type Movimiento = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];
type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
type Partida = Database["public"]["Tables"]["conciliacion_partidas"]["Row"];
type CuentaBancaria = Database["public"]["Tables"]["cuentas_bancarias"]["Row"];

export default function ConciliacionPage() {
  const params = useParams();
  const empresaId = params.id as string;
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);

  // Cargar cuentas bancarias
  useEffect(() => {
    const cargarCuentas = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("cuentas_bancarias")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("activa", true);
      if (data) {
        const ctas = data as unknown as CuentaBancaria[];
        setCuentas(ctas);
        if (ctas.length > 0) setCuentaId(ctas[0].id);
      }
    };
    cargarCuentas();
  }, [empresaId]);

  // State
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selYear, setSelYear] = useState(currentYear);
  const [selMonth, setSelMonth] = useState(currentMonth);
  const YEARS = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  const MONTHS_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Derivar periodo de año/mes
  const periodoInicio = `${selYear}-${String(selMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(selYear, selMonth + 1, 0).getDate();
  const periodoFin = `${selYear}-${String(selMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const [cuentaId, setCuentaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoMatchLoading, setAutoMatchLoading] = useState(false);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cfdis, setCfdis] = useState<Cfdi[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [conciliacionId, setConciliacionId] = useState<string | null>(null);

  // Selection state
  const [selectedMovId, setSelectedMovId] = useState<string | null>(null);
  const [selectedCfdiId, setSelectedCfdiId] = useState<string | null>(null);
  const [highlightMovIds, setHighlightMovIds] = useState<Set<string>>(new Set());
  const [highlightCfdiIds, setHighlightCfdiIds] = useState<Set<string>>(new Set());

  // Filtros
  const [filtrosMov, setFiltrosMov] = useState<FiltrosConciliacionState>({
    busqueda: "",
    estado: null,
    tipo: null,
    montoMin: "",
    montoMax: "",
  });
  const [filtrosCfdi, setFiltrosCfdi] = useState<FiltrosConciliacionState>({
    busqueda: "",
    estado: null,
    tipo: null,
    montoMin: "",
    montoMax: "",
  });

  // Resumen
  const totalMovimientos = movimientos.length;
  const conciliados = movimientos.filter(
    (m) => m.estado_conciliacion === "conciliado"
  ).length;
  const pendientes = totalMovimientos - conciliados;
  const matchesExactos = partidas.filter((p) => p.tipo === "match_exacto").length;
  const matchesFuzzy = partidas.filter((p) => p.tipo === "match_fuzzy").length;
  const porcentaje =
    totalMovimientos > 0 ? Math.round((conciliados / totalMovimientos) * 100) : 0;

  // Cargar datos del periodo
  const cargarDatos = async () => {
    console.log("cargarDatos llamado", { cuentaId, periodoInicio, periodoFin, empresaId });
    if (!cuentaId) {
      alert("Selecciona una cuenta bancaria.");
      return;
    }
    setLoading(true);
    try {
      const qp = new URLSearchParams({
        empresaId,
        cuentaId,
        periodoInicio,
        periodoFin,
      });
      const res = await fetch(`/api/conciliacion?${qp}`);
      const data = await res.json();
      if (data.error) {
        console.error("Error:", data.error);
        alert("Error: " + data.error);
      } else {
        setMovimientos(data.movimientos || []);
        setCfdis(data.cfdis || []);
        setPartidas(data.partidas || []);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      alert("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar auto-matching
  const ejecutarAutoMatch = async () => {
    if (!cuentaId) {
      alert("Selecciona una cuenta bancaria.");
      return;
    }
    setAutoMatchLoading(true);
    try {
      const res = await fetch("/api/conciliacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          cuentaId,
          periodoInicio,
          periodoFin,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        if (data.conciliacionId) {
          setConciliacionId(data.conciliacionId);
        }
        // Recargar datos
        await cargarDatos();
      }
    } catch (err) {
      console.error("Error en auto-match:", err);
      alert("Error de conexión.");
    } finally {
      setAutoMatchLoading(false);
    }
  };

  // Click en movimiento → resaltar CFDIs candidatos
  const handleSelectMov = (movId: string) => {
    setSelectedMovId(movId === selectedMovId ? null : movId);
    // Encontrar partidas que involucren este movimiento
    const cfdiIds = new Set(
      partidas
        .filter((p) => p.movimiento_id === movId)
        .map((p) => p.cfdi_id)
        .filter(Boolean) as string[]
    );
    setHighlightCfdiIds(cfdiIds);
    setHighlightMovIds(new Set());
  };

  // Click en CFDI → resaltar movimientos candidatos
  const handleSelectCfdi = (cfdiId: string) => {
    setSelectedCfdiId(cfdiId === selectedCfdiId ? null : cfdiId);
    const movIds = new Set(
      partidas
        .filter((p) => p.cfdi_id === cfdiId)
        .map((p) => p.movimiento_id)
        .filter(Boolean) as string[]
    );
    setHighlightMovIds(movIds);
    setHighlightCfdiIds(new Set());
  };

  // Drag & drop: conciliación manual
  const handleManualMatch = async (cfdiId: string, movimientoId: string) => {
    if (!conciliacionId) return;
    try {
      await fetch("/api/conciliacion/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conciliacionId, movimientoId, cfdiId }),
      });
      await cargarDatos();
    } catch (err) {
      console.error("Error en conciliación manual:", err);
    }
  };

  // Resolver partida fuzzy
  const handleResolverPartida = async (
    partidaId: string,
    accion: "aceptado" | "rechazado"
  ) => {
    try {
      await fetch("/api/conciliacion/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partidaId, accion }),
      });
      await cargarDatos();
    } catch (err) {
      console.error("Error resolviendo partida:", err);
    }
  };

  // Filtrar movimientos
  const movsFiltrados = movimientos.filter((m) => {
    if (filtrosMov.busqueda) {
      const q = filtrosMov.busqueda.toLowerCase();
      const match =
        m.descripcion?.toLowerCase().includes(q) ||
        m.rfc_contraparte?.toLowerCase().includes(q) ||
        m.referencia?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filtrosMov.estado && m.estado_conciliacion !== filtrosMov.estado) return false;
    if (filtrosMov.tipo && m.tipo !== filtrosMov.tipo) return false;
    return true;
  });

  // Filtrar CFDIs
  const cfdisFiltrados = cfdis.filter((c) => {
    if (filtrosCfdi.busqueda) {
      const q = filtrosCfdi.busqueda.toLowerCase();
      const match =
        c.uuid.toLowerCase().includes(q) ||
        c.emisor_nombre?.toLowerCase().includes(q) ||
        c.emisor_rfc.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filtrosCfdi.tipo && c.tipo !== filtrosCfdi.tipo) return false;
    return true;
  });

  const tieneData = movimientos.length > 0 || cfdis.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Conciliación Bancaria
          </h1>
          <p className="text-muted-foreground">
            Cruza movimientos bancarios con CFDIs del SAT.
          </p>
        </div>
        <div className="flex gap-2">
          {tieneData && (
            <>
              <Button
                onClick={ejecutarAutoMatch}
                disabled={autoMatchLoading}
              >
                {autoMatchLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Auto-conciliar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selector de cuenta y periodo */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Cuenta bancaria */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Landmark className="h-3 w-3" /> Cuenta bancaria
            </p>
            {cuentas.length > 0 ? (
              <Select value={cuentaId} onValueChange={setCuentaId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecciona una cuenta">
                    {(() => {
                      const sel = cuentas.find(c => c.id === cuentaId);
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
            ) : (
              <p className="text-xs text-muted-foreground">No hay cuentas bancarias. Agrega una en Cuentas Bancarias.</p>
            )}
          </div>
          <Separator />
          {/* Año */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Año</p>
            <div className="flex flex-wrap gap-2">
              {YEARS.map((year) => (
                <button
                  key={year}
                  onClick={() => setSelYear(year)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selYear === year
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border hover:bg-blue-50 dark:hover:bg-blue-950"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Mes</p>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS_LABELS.map((mes, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelMonth(idx)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selMonth === idx
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border hover:bg-blue-50 dark:hover:bg-blue-950"
                  }`}
                >
                  {mes}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={cargarDatos}
            disabled={loading || !cuentaId}
            size="sm"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArrowLeftRight className="mr-2 h-4 w-4" />
            )}
            Cargar {MONTHS_LABELS[selMonth]} {selYear}
          </Button>
        </CardContent>
      </Card>

      {/* Indicadores */}
      {tieneData && (
        <PanelDiferencias
          totalMovimientos={totalMovimientos}
          conciliados={conciliados}
          pendientes={pendientes}
          excepciones={0}
          matchesExactos={matchesExactos}
          matchesFuzzy={matchesFuzzy}
          porcentaje={porcentaje}
        />
      )}

      {/* Paneles lado a lado */}
      {tieneData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Panel izquierdo: Movimientos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Movimientos Bancarios
                <span className="text-xs font-normal text-muted-foreground">
                  {movsFiltrados.length} de {movimientos.length}
                </span>
              </CardTitle>
            </CardHeader>
            <FiltrosConciliacion
              filtros={filtrosMov}
              onChange={setFiltrosMov}
              lado="movimientos"
            />
            <CardContent className="p-0">
              <TablaMovimientos
                movimientos={movsFiltrados}
                selectedId={selectedMovId}
                highlightIds={highlightMovIds}
                onSelect={handleSelectMov}
                onDragStart={() => {}}
              />
            </CardContent>
          </Card>

          {/* Panel derecho: CFDIs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                CFDIs del SAT
                <span className="text-xs font-normal text-muted-foreground">
                  {cfdisFiltrados.length} de {cfdis.length}
                </span>
              </CardTitle>
            </CardHeader>
            <FiltrosConciliacion
              filtros={filtrosCfdi}
              onChange={setFiltrosCfdi}
              lado="cfdis"
            />
            <CardContent className="p-0">
              <TablaCfdis
                cfdis={cfdisFiltrados}
                selectedId={selectedCfdiId}
                highlightIds={highlightCfdiIds}
                onSelect={handleSelectCfdi}
                onDrop={handleManualMatch}
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <ArrowLeftRight className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            Selecciona un periodo para comenzar
          </h3>
          <p className="text-sm text-muted-foreground">
            Elige las fechas de inicio y fin para cargar movimientos y CFDIs.
          </p>
        </Card>
      )}

      {/* Panel inferior: Partidas conciliadas */}
      {partidas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              Partidas de conciliación ({partidas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <PartidasConciliadas
              partidas={partidas}
              onResolver={handleResolverPartida}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
