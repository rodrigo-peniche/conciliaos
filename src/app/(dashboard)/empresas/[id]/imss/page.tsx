"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2, HardHat, Users, FileText, ClipboardList, Clock } from "lucide-react";

export default function ImssInfonavitPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8" />
          IMSS / Infonavit
        </h1>
        <p className="text-muted-foreground">
          Conexion con el IMSS e Infonavit para consultar emisiones, movimientos afiliatorios y mas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* IMSS Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                IMSS
              </CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Proximamente
              </Badge>
            </div>
            <CardDescription>
              Instituto Mexicano del Seguro Social
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecta tu cuenta del IMSS para acceder automaticamente a:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Emisiones bimestrales (EMA/EBA)</p>
                  <p className="text-xs text-muted-foreground">
                    Consulta y descarga las emisiones del IMSS por bimestre.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Users className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Movimientos afiliatorios</p>
                  <p className="text-xs text-muted-foreground">
                    Altas, bajas y modificaciones de salario de trabajadores.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ClipboardList className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Determinacion de cuotas</p>
                  <p className="text-xs text-muted-foreground">
                    Calculo automatico de cuotas obrero-patronales.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-blue-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cedulas de liquidacion (SUA)</p>
                  <p className="text-xs text-muted-foreground">
                    Descarga de cedulas para pago de cuotas IMSS.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Infonavit Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <HardHat className="h-5 w-5" />
                Infonavit
              </CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Proximamente
              </Badge>
            </div>
            <CardDescription>
              Instituto del Fondo Nacional de la Vivienda para los Trabajadores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Conecta tu cuenta de Infonavit para acceder automaticamente a:
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Emisiones bimestrales</p>
                  <p className="text-xs text-muted-foreground">
                    Consulta las emisiones de Infonavit y amortizaciones de creditos.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Users className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Avisos de retencion</p>
                  <p className="text-xs text-muted-foreground">
                    Avisos de retencion y suspension de descuentos.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ClipboardList className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cedulas de determinacion</p>
                  <p className="text-xs text-muted-foreground">
                    Descarga de cedulas para pago de aportaciones patronales.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Constancias de no adeudo</p>
                  <p className="text-xs text-muted-foreground">
                    Genera y descarga constancias de situacion fiscal patronal.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
