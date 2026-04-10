"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

export interface FiltrosConciliacionState {
  busqueda: string;
  estado: string | null;
  tipo: string | null;
  montoMin: string;
  montoMax: string;
}

interface Props {
  filtros: FiltrosConciliacionState;
  onChange: (filtros: FiltrosConciliacionState) => void;
  lado: "movimientos" | "cfdis";
}

const ESTADOS_MOV = [
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  { value: "conciliado", label: "Conciliado", color: "bg-green-100 text-green-800" },
  { value: "diferencia", label: "Diferencia", color: "bg-red-100 text-red-800" },
];

const TIPOS_MOV = [
  { value: "cargo", label: "Cargo" },
  { value: "abono", label: "Abono" },
];

const TIPOS_CFDI = [
  { value: "ingreso", label: "Ingreso" },
  { value: "egreso", label: "Egreso" },
  { value: "pago", label: "Pago" },
];

export function FiltrosConciliacion({ filtros, onChange, lado }: Props) {
  const tipos = lado === "movimientos" ? TIPOS_MOV : TIPOS_CFDI;
  const tieneFilros = filtros.busqueda || filtros.estado || filtros.tipo || filtros.montoMin || filtros.montoMax;

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-muted/30">
      <div className="relative flex-1 min-w-[150px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={lado === "movimientos" ? "Buscar descripción, RFC..." : "Buscar UUID, emisor..."}
          value={filtros.busqueda}
          onChange={(e) => onChange({ ...filtros, busqueda: e.target.value })}
          className="pl-8 h-8 text-xs"
        />
      </div>

      <div className="flex gap-1">
        {ESTADOS_MOV.map((e) => (
          <Badge
            key={e.value}
            variant={filtros.estado === e.value ? "default" : "outline"}
            className="cursor-pointer text-xs px-2 py-0.5"
            onClick={() =>
              onChange({
                ...filtros,
                estado: filtros.estado === e.value ? null : e.value,
              })
            }
          >
            {e.label}
          </Badge>
        ))}
      </div>

      <div className="flex gap-1">
        {tipos.map((t) => (
          <Badge
            key={t.value}
            variant={filtros.tipo === t.value ? "default" : "outline"}
            className="cursor-pointer text-xs px-2 py-0.5"
            onClick={() =>
              onChange({
                ...filtros,
                tipo: filtros.tipo === t.value ? null : t.value,
              })
            }
          >
            {t.label}
          </Badge>
        ))}
      </div>

      {tieneFilros && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() =>
            onChange({ busqueda: "", estado: null, tipo: null, montoMin: "", montoMax: "" })
          }
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
