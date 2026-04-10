"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileWarning, Upload, Sparkles } from "lucide-react";
import type { DocumentoFaltante } from "@/lib/validacion/documentos-faltantes";

interface Props {
  documentos: DocumentoFaltante[];
}

const importanciaBadge: Record<
  string,
  { variant: "destructive" | "secondary" | "outline"; label: string }
> = {
  alta: { variant: "destructive", label: "Alta" },
  media: { variant: "secondary", label: "Media" },
  baja: { variant: "outline", label: "Baja" },
};

export function ListaDocumentosFaltantes({ documentos }: Props) {
  if (documentos.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Documentación completa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-600" />
          Documentos Faltantes ({documentos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documentos.map((doc, idx) => {
          const imp = importanciaBadge[doc.importancia];
          return (
            <div key={idx} className="rounded-lg border p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">{doc.nombre}</p>
                <Badge variant={imp.variant} className="text-[10px]">
                  {imp.label}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">{doc.porQue}</p>
              <p className="text-[10px] text-blue-600">{doc.comoObtener}</p>
              <div className="flex gap-2 mt-1">
                {doc.generableEnConciliaOS ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Generar en ConciliaOS
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Adjuntar
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
