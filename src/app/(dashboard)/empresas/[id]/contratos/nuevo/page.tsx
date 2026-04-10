"use client";

import { useParams, useRouter } from "next/navigation";
import { WizardContrato } from "@/components/contratos/wizard-contrato";
import { useEmpresaStore } from "@/hooks/use-empresa";

export default function NuevoContratoPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const { empresaActual } = useEmpresaStore();

  const domicilio = empresaActual?.domicilio_fiscal
    ? typeof empresaActual.domicilio_fiscal === "string"
      ? empresaActual.domicilio_fiscal
      : JSON.stringify(empresaActual.domicilio_fiscal)
    : empresaActual?.codigo_postal || "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuevo Contrato</h1>
        <p className="text-muted-foreground">
          Genera un contrato profesional con inteligencia artificial.
        </p>
      </div>

      <WizardContrato
        empresaId={empresaId}
        empresaNombre={empresaActual?.razon_social || ""}
        empresaRfc={empresaActual?.rfc || ""}
        empresaDomicilio={domicilio}
        onComplete={() => router.push(`/empresas/${empresaId}/contratos`)}
      />
    </div>
  );
}
