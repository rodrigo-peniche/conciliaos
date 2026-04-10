"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Briefcase,
  Building2,
  Hammer,
  Package,
  Home,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import { EditorContrato } from "./editor-contrato";
import { PreviewPDF } from "./preview-pdf";
import type { TipoContrato } from "@/lib/contratos/generador";

interface Props {
  empresaId: string;
  empresaNombre: string;
  empresaRfc: string;
  empresaDomicilio: string;
  onComplete: () => void;
}

const TIPOS_CONTRATO: {
  tipo: TipoContrato;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    tipo: "servicios",
    label: "Servicios Profesionales",
    desc: "Consultoría, asesoría, desarrollo, diseño",
    icon: Briefcase,
  },
  {
    tipo: "obra",
    label: "Obra a Precio Alzado",
    desc: "Construcción, remodelación, instalación",
    icon: Hammer,
  },
  {
    tipo: "suministro",
    label: "Suministro de Bienes",
    desc: "Compra-venta de productos o materiales",
    icon: Package,
  },
  {
    tipo: "arrendamiento",
    label: "Arrendamiento",
    desc: "Renta de inmuebles, equipo o vehículos",
    icon: Home,
  },
  {
    tipo: "nda",
    label: "Confidencialidad (NDA)",
    desc: "Protección de información sensible",
    icon: ShieldCheck,
  },
];

export function WizardContrato({
  empresaId,
  empresaNombre,
  empresaRfc,
  empresaDomicilio,
  onComplete,
}: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [contratoId, setContratoId] = useState<string | null>(null);

  // Step 1: Tipo
  const [tipo, setTipo] = useState<TipoContrato | null>(null);

  // Step 2: Proveedor/Contratado
  const [contratadoNombre, setContratadoNombre] = useState("");
  const [contratadoRfc, setContratadoRfc] = useState("");
  const [contratadoDomicilio, setContratadoDomicilio] = useState("");

  // Step 3: Condiciones
  const [objetoContrato, setObjetoContrato] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [condicionesPago, setCondicionesPago] = useState("");

  // Step 4: Edición / Preview
  const [html, setHtml] = useState("");

  const generarConIA = async () => {
    if (!tipo) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId,
          tipo,
          contratanteNombre: empresaNombre,
          contratanteRfc: empresaRfc,
          contratanteDomicilio: empresaDomicilio,
          contratadoNombre,
          contratadoRfc,
          contratadoDomicilio,
          objetoContrato,
          monto: monto ? parseFloat(monto) : undefined,
          fechaInicio,
          fechaFin: fechaFin || undefined,
          condicionesPago: condicionesPago || undefined,
        }),
      });

      const data = await res.json();
      if (data.html) {
        setHtml(data.html);
        setContratoId(data.id);
        setStep(4);
      }
    } catch (err) {
      console.error("Error generando contrato:", err);
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return !!tipo;
    if (step === 2) return !!contratadoNombre && !!contratadoRfc;
    if (step === 3) return !!objetoContrato && !!fechaInicio;
    return true;
  };

  return (
    <div className="space-y-6">
      <Progress value={(step / 4) * 100} />

      {/* STEP 1: Tipo de contrato */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Tipo de contrato</h2>
            <p className="text-sm text-muted-foreground">
              Selecciona el tipo de contrato a generar
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {TIPOS_CONTRATO.map((t) => (
              <Card
                key={t.tipo}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  tipo === t.tipo
                    ? "ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-950"
                    : ""
                }`}
                onClick={() => setTipo(t.tipo)}
              >
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start gap-3">
                    <t.icon
                      className={`h-8 w-8 ${
                        tipo === t.tipo
                          ? "text-blue-600"
                          : "text-muted-foreground"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="text-xs text-muted-foreground">{t.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Proveedor */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos del contratado</CardTitle>
            <CardDescription>
              Ingresa los datos del proveedor o contraparte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razón social *</Label>
                <Input
                  value={contratadoNombre}
                  onChange={(e) => setContratadoNombre(e.target.value)}
                  placeholder="Nombre o razón social"
                />
              </div>
              <div className="space-y-2">
                <Label>RFC *</Label>
                <Input
                  value={contratadoRfc}
                  onChange={(e) => setContratadoRfc(e.target.value.toUpperCase())}
                  placeholder="RFC del contratado"
                  maxLength={13}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Domicilio</Label>
              <Input
                value={contratadoDomicilio}
                onChange={(e) => setContratadoDomicilio(e.target.value)}
                placeholder="Domicilio fiscal (opcional)"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Condiciones */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Condiciones del contrato</CardTitle>
            <CardDescription>
              Define el objeto, monto y vigencia del contrato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Objeto del contrato *</Label>
              <Textarea
                value={objetoContrato}
                onChange={(e) => setObjetoContrato(e.target.value)}
                placeholder="Describe el servicio, obra, bien o propósito del contrato..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Monto (MXN)</Label>
                <Input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha inicio *</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condiciones de pago</Label>
              <Input
                value={condicionesPago}
                onChange={(e) => setCondicionesPago(e.target.value)}
                placeholder="Ej: 50% anticipo, 50% contra entrega"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Editor + Preview */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Editar contrato</h3>
            <EditorContrato content={html} onChange={setHtml} />
          </div>
          <PreviewPDF contratoId={contratoId} html={html} />
        </div>
      )}

      {/* Navegación */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : step === 3 ? (
          <Button onClick={generarConIA} disabled={loading || !canAdvance()}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Generar con IA
          </Button>
        ) : (
          <Button onClick={onComplete}>
            <FileText className="mr-2 h-4 w-4" />
            Finalizar
          </Button>
        )}
      </div>
    </div>
  );
}
