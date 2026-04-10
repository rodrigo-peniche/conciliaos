import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FileText,
  ArrowLeftRight,
  ShieldCheck,
  ScrollText,
  BarChart3,
  Bot,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Descarga Masiva SAT",
    description:
      "Conecta con el SAT y descarga CFDIs emitidos y recibidos automáticamente.",
  },
  {
    icon: ArrowLeftRight,
    title: "Conciliación Automática",
    description:
      "Cruza movimientos bancarios contra CFDIs con matching inteligente.",
  },
  {
    icon: ShieldCheck,
    title: "Motor de Deducibilidad",
    description:
      "Clasifica gastos como deducibles o no deducibles con fundamento legal.",
  },
  {
    icon: ScrollText,
    title: "Contratos con IA",
    description:
      "Genera contratos legales automáticamente para tus proveedores.",
  },
  {
    icon: BarChart3,
    title: "Reportes Fiscales",
    description: "DIOT, cédula IVA, ISR provisional y balance general en un clic.",
  },
  {
    icon: Bot,
    title: "Chat Fiscal IA",
    description:
      "Consulta normativa fiscal y obtén respuestas con fundamento legal.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              CO
            </div>
            <span className="text-xl font-bold">ConciliaOS</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </Link>
            <Link href="/register">
              <Button>Crear cuenta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Conciliación fiscal
          <br />
          <span className="text-blue-600">automatizada para México</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          ConciliaOS automatiza el cruce de movimientos bancarios contra CFDIs
          del SAT, determina deducibilidad y genera entregables contables con
          inteligencia artificial.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg" className="text-lg px-8">
              Comenzar gratis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Ver demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-gray-50 dark:bg-gray-950 py-24">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-bold mb-12">
            Todo lo que necesitas para tu fiscalidad
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-background p-6 hover:shadow-md transition-shadow"
              >
                <feature.icon className="mb-4 h-10 w-10 text-blue-600" />
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          &copy; 2026 ConciliaOS. Conciliación fiscal automatizada para México.
        </div>
      </footer>
    </div>
  );
}
