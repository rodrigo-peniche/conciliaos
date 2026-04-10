"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatMXN } from "@/lib/utils/currency";
import { PanelDeducibilidad } from "./panel-deducibilidad";
import type { Database } from "@/lib/types/database.types";

type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];

interface Props {
  cfdi: Cfdi | null;
  empresaId: string;
  open: boolean;
  onClose: () => void;
}

export function ModalDetalleCfdi({ cfdi, empresaId, open, onClose }: Props) {
  if (!cfdi) return null;

  const estadoBadge: Record<
    string,
    { variant: "default" | "destructive" | "secondary" | "outline"; label: string }
  > = {
    vigente: { variant: "default", label: "Vigente" },
    cancelado: { variant: "destructive", label: "Cancelado" },
    no_encontrado: { variant: "secondary", label: "No encontrado" },
    por_verificar: { variant: "outline", label: "Por verificar" },
  };

  const estado = estadoBadge[cfdi.estado_sat] || estadoBadge.por_verificar;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5" />
            Detalle del CFDI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* UUID y estado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {cfdi.uuid}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => navigator.clipboard.writeText(cfdi.uuid)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <Badge variant={estado.variant}>{estado.label}</Badge>
          </div>

          <Separator />

          {/* Datos principales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Emisor</p>
              <p className="text-sm font-medium">
                {cfdi.emisor_nombre || "N/A"}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                {cfdi.emisor_rfc}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receptor</p>
              <p className="text-sm font-medium">
                {cfdi.receptor_nombre || "N/A"}
              </p>
              <p className="text-xs font-mono text-muted-foreground">
                {cfdi.receptor_rfc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <Badge variant="outline" className="mt-1">
                {cfdi.tipo}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fecha emisión</p>
              <p className="text-sm">
                {new Date(cfdi.fecha_emision).toLocaleDateString("es-MX")}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uso CFDI</p>
              <p className="text-sm">{cfdi.receptor_uso_cfdi || "N/A"}</p>
            </div>
          </div>

          <Separator />

          {/* Montos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border p-2">
              <p className="text-[10px] text-muted-foreground">Subtotal</p>
              <p className="text-sm font-mono">{formatMXN(cfdi.subtotal)}</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[10px] text-muted-foreground">IVA</p>
              <p className="text-sm font-mono">
                {formatMXN(cfdi.iva_trasladado)}
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[10px] text-muted-foreground">Retenciones</p>
              <p className="text-sm font-mono">
                {formatMXN(cfdi.iva_retenido + cfdi.isr_retenido)}
              </p>
            </div>
            <div className="rounded-lg border p-2 bg-muted/50">
              <p className="text-[10px] text-muted-foreground">Total</p>
              <p className="text-sm font-bold">{formatMXN(cfdi.total)}</p>
            </div>
          </div>

          {/* Conciliación */}
          <div className="flex items-center gap-2">
            {cfdi.conciliado ? (
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Conciliado</span>
                {cfdi.conciliado_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(cfdi.conciliado_at).toLocaleDateString("es-MX")}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <XCircle className="h-4 w-4" />
                <span className="text-xs">No conciliado</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Panel de deducibilidad */}
          <PanelDeducibilidad
            cfdiId={cfdi.id}
            empresaId={empresaId}
            total={cfdi.total}
            esDeducible={cfdi.es_deducible}
            porcentaje={cfdi.deducible_pct}
            motivo={cfdi.deducibilidad_motivo}
            iaAnalisis={cfdi.deducibilidad_ia_analisis}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
