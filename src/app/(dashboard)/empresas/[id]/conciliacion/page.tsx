"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeftRight,
  Play,
  Loader2,
  CheckCircle2,
  Download,
} from "lucide-react";
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

export default function ConciliacionPage() {
  const params = useParams();
  const empresaId = params.id as string;

  // State
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFin, setPeriodoFin] = useState("");
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
  const cargarDatos = useCallback(async () => {
    if (!periodoInicio || !periodoFin) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        empresaId,
        ...(cuentaId && { cuentaId }),
        periodoInicio,
        periodoFin,
      });
      const res = await fetch(`/api/conciliacion?${params}`);
      const data = await res.json();
      setMovimientos(data.movimientos || []);
      setCfdis(data.cfdis || []);
      setPartidas(data.partidas || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, cuentaId, periodoInicio, periodoFin]);

  // Ejecutar auto-matching
  const ejecutarAutoMatch = async () => {
    if (!periodoInicio || !periodoFin) return;
    setAutoMatchLoading(true);
    try {
      const res = await fetch("/api/conciliacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          cuentaId: cuentaId || empresaId, // fallback
          periodoInicio,
          periodoFin,
        }),
      });
      const data = await res.json();
      if (data.conciliacionId) {
        setConciliacionId(data.conciliacionId);
      }
      // Recargar datos
      await cargarDatos();
    } catch (err) {
      console.error("Error en auto-match:", err);
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

      {/* Selector de periodo */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Periodo inicio</Label>
              <Input
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="w-[160px] h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Periodo fin</Label>
              <Input
                type="date"
                value={periodoFin}
                onChange={(e) => setPeriodoFin(e.target.value)}
                className="w-[160px] h-9"
              />
            </div>
            <Button
              onClick={cargarDatos}
              disabled={loading || !periodoInicio || !periodoFin}
              size="sm"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftRight className="mr-2 h-4 w-4" />
              )}
              Cargar periodo
            </Button>
          </div>
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
