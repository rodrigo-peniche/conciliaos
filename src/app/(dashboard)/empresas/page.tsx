"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEmpresaStore } from "@/hooks/use-empresa";

export default function EmpresasPage() {
  const { empresas } = useEmpresaStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
          <p className="text-muted-foreground">
            Gestiona las empresas de tu despacho.
          </p>
        </div>
        <Link href="/empresas/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Empresa
          </Button>
        </Link>
      </div>

      {empresas.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No hay empresas registradas</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Registra tu primera empresa para comenzar.
          </p>
          <Link href="/empresas/nueva">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar empresa
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {empresas.map((empresa) => (
            <Card key={empresa.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {empresa.nombre_comercial || empresa.razon_social}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {empresa.rfc}
                  </p>
                </div>
                <Badge
                  variant={empresa.activo ? "default" : "secondary"}
                >
                  {empresa.activo ? "Activa" : "Inactiva"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Régimen:</span>
                    <span>{empresa.regimen_codigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">C.P.:</span>
                    <span>{empresa.codigo_postal}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/empresas/${empresa.id}`}>
                    <Button variant="outline" className="w-full" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ver empresa
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
