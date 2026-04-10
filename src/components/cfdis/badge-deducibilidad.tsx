"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface Props {
  esDeducible: boolean | null;
  porcentaje: number | null;
  size?: "sm" | "lg";
}

export function BadgeDeducibilidad({
  esDeducible,
  porcentaje,
  size = "sm",
}: Props) {
  if (esDeducible === null || porcentaje === null) {
    return (
      <Badge variant="outline" className={size === "lg" ? "text-sm px-3 py-1" : "text-[10px] px-1.5"}>
        Sin analizar
      </Badge>
    );
  }

  if (porcentaje === 100) {
    return (
      <Badge
        variant="default"
        className={`bg-green-600 ${size === "lg" ? "text-sm px-3 py-1 gap-1.5" : "text-[10px] px-1.5"}`}
      >
        {size === "lg" && <ShieldCheck className="h-4 w-4" />}
        DEDUCIBLE
      </Badge>
    );
  }

  if (porcentaje > 0) {
    return (
      <Badge
        variant="secondary"
        className={`bg-amber-100 text-amber-800 ${size === "lg" ? "text-sm px-3 py-1 gap-1.5" : "text-[10px] px-1.5"}`}
      >
        {size === "lg" && <ShieldAlert className="h-4 w-4" />}
        PARCIAL {porcentaje}%
      </Badge>
    );
  }

  return (
    <Badge
      variant="destructive"
      className={size === "lg" ? "text-sm px-3 py-1 gap-1.5" : "text-[10px] px-1.5"}
    >
      {size === "lg" && <ShieldX className="h-4 w-4" />}
      NO DEDUCIBLE
    </Badge>
  );
}
