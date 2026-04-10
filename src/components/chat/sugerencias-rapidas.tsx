"use client";

import { Button } from "@/components/ui/button";
import {
  Receipt,
  FileSearch,
  Calendar,
  ShieldAlert,
  ArrowLeftRight,
} from "lucide-react";

interface Props {
  onSelect: (pregunta: string) => void;
}

const SUGERENCIAS = [
  {
    texto: "¿Esta factura es deducible?",
    icon: Receipt,
  },
  {
    texto: "¿Qué documentos me faltan?",
    icon: FileSearch,
  },
  {
    texto: "¿Cuándo es mi próxima declaración?",
    icon: Calendar,
  },
  {
    texto: "¿Tengo algún proveedor en EFOS?",
    icon: ShieldAlert,
  },
  {
    texto: "Explícame el estado de mi conciliación",
    icon: ArrowLeftRight,
  },
];

export function SugerenciasRapidas({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGERENCIAS.map((s) => (
        <Button
          key={s.texto}
          variant="outline"
          size="sm"
          className="text-xs gap-1.5"
          onClick={() => onSelect(s.texto)}
        >
          <s.icon className="h-3 w-3" />
          {s.texto}
        </Button>
      ))}
    </div>
  );
}
