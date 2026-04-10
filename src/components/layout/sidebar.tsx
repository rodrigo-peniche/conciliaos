"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEmpresaStore } from "@/hooks/use-empresa";
import {
  LayoutDashboard,
  Building2,
  FileText,
  ArrowLeftRight,
  FileCheck,
  ScrollText,
  BarChart3,
  MessageSquare,
  Settings,
  CreditCard,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const NAV_GENERAL = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Empresas",
    href: "/empresas",
    icon: Building2,
  },
];

const NAV_EMPRESA = [
  {
    label: "Dashboard",
    href: "",
    icon: LayoutDashboard,
  },
  {
    label: "CFDIs",
    href: "/cfdis",
    icon: FileText,
  },
  {
    label: "Conciliación",
    href: "/conciliacion",
    icon: ArrowLeftRight,
  },
  {
    label: "Cuentas Bancarias",
    href: "/cuentas",
    icon: CreditCard,
  },
  {
    label: "Contratos",
    href: "/contratos",
    icon: FileCheck,
  },
  {
    label: "Reportes",
    href: "/reportes",
    icon: BarChart3,
  },
  {
    label: "Chat Fiscal",
    href: "/chat",
    icon: MessageSquare,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { empresaActual } = useEmpresaStore();

  const empresaBase = empresaActual
    ? `//empresas/${empresaActual.id}`
    : null;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
          CO
        </div>
        <span className="text-lg font-bold">ConciliaOS</span>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        {/* Navegación general */}
        <div className="mb-6">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            General
          </p>
          <nav className="space-y-1">
            {NAV_GENERAL.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Navegación de empresa activa */}
        {empresaActual && empresaBase && (
          <div className="mb-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {empresaActual.nombre_comercial || empresaActual.razon_social}
            </p>
            <nav className="space-y-1">
              {NAV_EMPRESA.map((item) => {
                const fullHref = `${empresaBase}${item.href}`;
                const isActive =
                  item.href === ""
                    ? pathname === empresaBase
                    : pathname.startsWith(fullHref);

                return (
                  <Link
                    key={item.href}
                    href={fullHref}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </ScrollArea>

      {/* Footer del sidebar */}
      <div className="border-t p-3">
        <Link
          href="/configuracion"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Configuración
        </Link>
      </div>
    </aside>
  );
}
