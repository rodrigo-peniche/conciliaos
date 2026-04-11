"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { KeyRound, ShieldCheck, Upload, CheckCircle2, Loader2, Building2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

export default function ConfiguracionEmpresaPage() {
  const params = useParams();
  const empresaId = params.id as string;

  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  // FIEL
  const [fielCerFile, setFielCerFile] = useState<File | null>(null);
  const [fielKeyFile, setFielKeyFile] = useState<File | null>(null);
  const [fielPassword, setFielPassword] = useState("");
  const [fielUploading, setFielUploading] = useState(false);
  const [fielResult, setFielResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .eq("id", empresaId)
        .single();
      if (data) setEmpresa(data as unknown as Empresa);
      setLoading(false);
    }
    load();
  }, [empresaId]);

  const handleFielUpload = async () => {
    if (!fielCerFile && !fielKeyFile && !fielPassword) {
      setFielResult("Selecciona al menos un archivo o ingresa la contraseña.");
      return;
    }
    setFielUploading(true);
    setFielResult(null);
    try {
      const formData = new FormData();
      formData.append("empresaId", empresaId);
      if (fielCerFile) formData.append("cer", fielCerFile);
      if (fielKeyFile) formData.append("key", fielKeyFile);
      if (fielPassword) formData.append("password", fielPassword);

      const res = await fetch("/api/sat/fiel/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setFielResult("e.firma configurada exitosamente.");
        setFielCerFile(null);
        setFielKeyFile(null);
        setFielPassword("");
        // Recargar empresa
        const supabase = createClient();
        const { data: empData } = await supabase.from("empresas").select("*").eq("id", empresaId).single();
        if (empData) setEmpresa(empData as unknown as Empresa);
      } else {
        setFielResult(`Error: ${data.error}`);
      }
    } catch {
      setFielResult("Error de conexión. Intenta de nuevo.");
    }
    setFielUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          {empresa?.razon_social || "Empresa"} — {empresa?.rfc}
        </p>
      </div>

      {/* Datos de la empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Datos Fiscales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">RFC</Label>
              <p className="font-mono font-medium">{empresa?.rfc}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Régimen Fiscal</Label>
              <p className="text-sm">{empresa?.regimen_fiscal}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Razón Social</Label>
              <p className="text-sm">{empresa?.razon_social}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Código Postal</Label>
              <p className="text-sm">{empresa?.codigo_postal}</p>
            </div>
            {empresa?.nombre_comercial && (
              <div>
                <Label className="text-xs text-muted-foreground">Nombre Comercial</Label>
                <p className="text-sm">{empresa.nombre_comercial}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* e.firma (FIEL) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            e.firma (FIEL)
          </CardTitle>
          <CardDescription>
            Configura tu e.firma para habilitar la descarga automática de CFDIs del SAT.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado actual */}
          {empresa?.efirma_cer_url && empresa?.efirma_key_url ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <ShieldCheck className="h-5 w-5" />
                <div>
                  <p className="font-semibold">e.firma activa</p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Certificado y llave privada configurados.
                    {empresa?.sat_sincronizado_at && (
                      <> Última sincronización: {new Date(empresa.sat_sincronizado_at).toLocaleString("es-MX")}</>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <p className="font-semibold">e.firma no configurada</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Sube tu certificado (.cer), llave privada (.key) y contraseña para conectar con el SAT.
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Las credenciales se cifran con AES-256 antes de almacenarse.</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Certificado (.cer)</Label>
              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                  fielCerFile ? "border-green-400 bg-green-50 dark:bg-green-950" : "hover:border-blue-400"
                }`}
                onClick={() => document.getElementById("cfg-cer")?.click()}
              >
                {fielCerFile ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-green-600 mb-1" />
                    <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-full">{fielCerFile.name}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">{empresa?.efirma_cer_url ? "Reemplazar .cer" : "Subir .cer"}</p>
                  </>
                )}
                <input id="cfg-cer" type="file" accept=".cer" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFielCerFile(e.target.files[0]); }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Llave privada (.key)</Label>
              <div
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                  fielKeyFile ? "border-green-400 bg-green-50 dark:bg-green-950" : "hover:border-blue-400"
                }`}
                onClick={() => document.getElementById("cfg-key")?.click()}
              >
                {fielKeyFile ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-green-600 mb-1" />
                    <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-full">{fielKeyFile.name}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <p className="text-sm text-muted-foreground">{empresa?.efirma_key_url ? "Reemplazar .key" : "Subir .key"}</p>
                  </>
                )}
                <input id="cfg-key" type="file" accept=".key" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFielKeyFile(e.target.files[0]); }} />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contraseña de la e.firma</Label>
            <Input type="password" placeholder="••••••••" value={fielPassword} onChange={(e) => setFielPassword(e.target.value)} />
          </div>

          <Button onClick={handleFielUpload} disabled={fielUploading} className="w-full">
            {fielUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {fielUploading ? "Subiendo..." : empresa?.efirma_cer_url ? "Actualizar e.firma" : "Guardar e.firma"}
          </Button>

          {fielResult && (
            <div className={`rounded-lg p-3 ${fielResult.startsWith("Error") ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"}`}>
              <span className="text-sm">{fielResult}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
