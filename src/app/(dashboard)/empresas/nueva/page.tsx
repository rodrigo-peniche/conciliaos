"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  FileUp,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  X,
  FileText,
  Check,
  Pencil,
} from "lucide-react";
import { REGIMENES_FISCALES } from "@/lib/types/conciliaos.types";
import { validarRFC } from "@/lib/utils/rfc";

// Esquema de validación
const empresaSchema = z.object({
  rfc: z
    .string()
    .min(12, "RFC debe tener al menos 12 caracteres")
    .max(13, "RFC debe tener máximo 13 caracteres")
    .refine((val) => validarRFC(val).valido, {
      message: "RFC con formato inválido",
    }),
  razon_social: z.string().min(3, "Razón social es requerida"),
  nombre_comercial: z.string().optional(),
  regimen_codigo: z.string().min(1, "Selecciona un régimen fiscal"),
  codigo_postal: z
    .string()
    .length(5, "Código postal debe tener 5 dígitos")
    .regex(/^\d{5}$/, "Solo dígitos"),
  objeto_social: z.string().optional(),
});

type EmpresaForm = z.infer<typeof empresaSchema>;

const STEPS = [
  { id: 1, title: "Datos Fiscales", icon: Building2 },
  { id: 2, title: "CIF", icon: FileUp },
  { id: 3, title: "Credenciales SAT", icon: KeyRound },
  { id: 4, title: "Confirmación", icon: CheckCircle2 },
];

export default function NuevaEmpresaPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cifFile, setCifFile] = useState<File | null>(null);
  const [actasFiles, setActasFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractedObjeto, setExtractedObjeto] = useState<string | null>(null);
  const [objetoApproved, setObjetoApproved] = useState(false);
  const [editingObjeto, setEditingObjeto] = useState(false);
  const [cerFile, setCerFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      rfc: "",
      razon_social: "",
      nombre_comercial: "",
      regimen_codigo: "",
      codigo_postal: "",
      objeto_social: "",
    },
  });

  const formValues = watch();
  const rfcResult = formValues.rfc ? validarRFC(formValues.rfc) : null;

  async function nextStep() {
    if (currentStep === 1) {
      const valid = await trigger(["rfc", "razon_social", "regimen_codigo", "codigo_postal"]);
      if (!valid) return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }

  function prevStep() {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function handleActasUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setActasFiles((prev) => [...prev, ...Array.from(files)]);
      setExtractedObjeto(null);
      setObjetoApproved(false);
    }
  }

  function removeActaFile(index: number) {
    setActasFiles((prev) => prev.filter((_, i) => i !== index));
    setExtractedObjeto(null);
    setObjetoApproved(false);
  }

  async function extractObjetoSocial() {
    if (actasFiles.length === 0) return;
    setExtracting(true);
    setExtractedObjeto(null);
    setObjetoApproved(false);

    try {
      const formData = new FormData();
      actasFiles.forEach((file) => formData.append("files", file));

      const res = await fetch("/api/extracto-objeto-social", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.error) {
        setExtractedObjeto(`Error: ${data.error}`);
      } else {
        setExtractedObjeto(data.objetoSocial);
        setValue("objeto_social", data.objetoSocial);
      }
    } catch {
      setExtractedObjeto("Error al conectar con el servidor.");
    } finally {
      setExtracting(false);
    }
  }

  function approveObjeto() {
    setObjetoApproved(true);
    setEditingObjeto(false);
  }

  async function onSubmit(data: EmpresaForm) {
    setLoading(true);
    try {
      // TODO: Server action para crear empresa en Supabase
      console.log("Datos de empresa:", data);
      console.log("Archivo CIF:", cifFile);

      // Simular guardado
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // TODO: Redirigir al dashboard de la empresa creada
      router.push("/empresas");
    } catch (error) {
      console.error("Error al crear empresa:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Empresa</h1>
        <p className="text-muted-foreground">
          Registra una empresa para comenzar a gestionar su fiscalidad.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 ${
                currentStep >= step.id
                  ? "text-blue-600"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  currentStep > step.id
                    ? "bg-blue-600 text-white"
                    : currentStep === step.id
                    ? "border-2 border-blue-600 text-blue-600"
                    : "border-2 border-gray-300 text-gray-400"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span className="hidden text-sm font-medium sm:inline">
                {step.title}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mx-4 h-0.5 w-12 ${
                  currentStep > step.id ? "bg-blue-600" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <Progress value={(currentStep / 4) * 100} />

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* PASO 1: Datos Fiscales */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Datos Fiscales Básicos
              </CardTitle>
              <CardDescription>
                Ingresa los datos fiscales de la empresa a registrar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rfc">RFC *</Label>
                <Input
                  id="rfc"
                  placeholder="ABC123456XYZ"
                  {...register("rfc")}
                  className="uppercase"
                  maxLength={13}
                />
                {rfcResult && formValues.rfc.length >= 12 && (
                  <div className="flex items-center gap-2 text-sm">
                    {rfcResult.valido ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">
                          RFC válido — Persona{" "}
                          {rfcResult.tipo === "moral" ? "Moral" : "Física"}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">{rfcResult.error}</span>
                      </>
                    )}
                  </div>
                )}
                {errors.rfc && (
                  <p className="text-sm text-red-600">{errors.rfc.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="razon_social">Razón Social *</Label>
                <Input
                  id="razon_social"
                  placeholder="Mi Empresa S.A. de C.V."
                  {...register("razon_social")}
                />
                {errors.razon_social && (
                  <p className="text-sm text-red-600">
                    {errors.razon_social.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre_comercial">
                  Nombre Comercial (opcional)
                </Label>
                <Input
                  id="nombre_comercial"
                  placeholder="Mi Empresa"
                  {...register("nombre_comercial")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="regimen_codigo">Régimen Fiscal *</Label>
                <Select
                  value={formValues.regimen_codigo}
                  onValueChange={(value) => {
                    if (value) setValue("regimen_codigo", value, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un régimen" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMENES_FISCALES.map((regimen) => (
                      <SelectItem key={regimen.codigo} value={regimen.codigo}>
                        {regimen.codigo} — {regimen.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.regimen_codigo && (
                  <p className="text-sm text-red-600">
                    {errors.regimen_codigo.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="codigo_postal">Código Postal *</Label>
                <Input
                  id="codigo_postal"
                  placeholder="97000"
                  maxLength={5}
                  {...register("codigo_postal")}
                />
                {errors.codigo_postal && (
                  <p className="text-sm text-red-600">
                    {errors.codigo_postal.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PASO 2: CIF + Actas Constitutivas */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                Documentos de la Empresa
              </CardTitle>
              <CardDescription>
                Carga el CIF y las actas constitutivas para extraer el objeto
                social con IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* CIF Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Constancia de Situación Fiscal (CIF)
                </Label>
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-blue-400 cursor-pointer"
                  onClick={() =>
                    document.getElementById("cif-upload")?.click()
                  }
                >
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    {cifFile ? cifFile.name : "Haz clic para seleccionar"}
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, máx. 5MB</p>
                  <input
                    id="cif-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setCifFile(file);
                    }}
                  />
                </div>
                {cifFile && (
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">
                        Cargado: {cifFile.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Actas Constitutivas Upload */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">
                    Acta Constitutiva y Modificaciones
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sube el acta constitutiva y todas sus modificaciones. La IA
                    extraerá el objeto social vigente.
                  </p>
                </div>

                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-blue-400 cursor-pointer"
                  onClick={() =>
                    document.getElementById("actas-upload")?.click()
                  }
                >
                  <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Seleccionar PDFs de actas
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Puedes seleccionar varios archivos PDF
                  </p>
                  <input
                    id="actas-upload"
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={handleActasUpload}
                  />
                </div>

                {/* Lista de archivos subidos */}
                {actasFiles.length > 0 && (
                  <div className="space-y-2">
                    {actasFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border p-2.5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-red-500 shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeActaFile(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Botón extraer con IA */}
                    <Button
                      type="button"
                      onClick={extractObjetoSocial}
                      disabled={extracting}
                      className="w-full"
                    >
                      {extracting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {extracting
                        ? "Extrayendo objeto social..."
                        : "Extraer Objeto Social con IA"}
                    </Button>
                  </div>
                )}

                {/* Resultado de extracción */}
                {extractedObjeto && !extractedObjeto.startsWith("Error") && (
                  <div className="space-y-3">
                    <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                            Objeto Social Extraído por IA
                          </span>
                        </div>
                        {objetoApproved && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <Check className="mr-1 h-3 w-3" />
                            Aprobado
                          </Badge>
                        )}
                      </div>

                      {editingObjeto ? (
                        <Textarea
                          value={formValues.objeto_social || ""}
                          onChange={(e) =>
                            setValue("objeto_social", e.target.value)
                          }
                          rows={8}
                          className="bg-white dark:bg-gray-900"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {formValues.objeto_social}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!objetoApproved ? (
                        <>
                          <Button
                            type="button"
                            onClick={approveObjeto}
                            className="flex-1"
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Aprobar Objeto Social
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setEditingObjeto(!editingObjeto)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            {editingObjeto ? "Vista previa" : "Editar"}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setObjetoApproved(false);
                            setEditingObjeto(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Modificar
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Error de extracción */}
                {extractedObjeto && extractedObjeto.startsWith("Error") && (
                  <div className="rounded-lg bg-red-50 p-3 dark:bg-red-950">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">{extractedObjeto}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Objeto social manual (si no hay actas) */}
              {actasFiles.length === 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="objeto_social">
                      Objeto Social / Actividades Económicas (manual)
                    </Label>
                    <Textarea
                      id="objeto_social"
                      placeholder="Si no tienes acta constitutiva, describe las actividades principales..."
                      rows={4}
                      {...register("objeto_social")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este campo se usa para el análisis de deducibilidad con IA.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* PASO 3: Credenciales SAT */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Credenciales SAT
              </CardTitle>
              <CardDescription>
                Opcional en este momento. Configura las credenciales para la
                descarga automática de CFDIs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Seguridad de credenciales
                  </span>
                </div>
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Todas las credenciales se cifran con AES-256 antes de
                  almacenarse. Nunca se exponen en logs ni respuestas API.
                </p>
              </div>

              {/* e.firma */}
              <div className="space-y-4">
                <h3 className="font-semibold">e.firma (FIEL)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Certificado (.cer)</Label>
                    <div
                      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
                        cerFile
                          ? "border-green-400 bg-green-50 dark:bg-green-950"
                          : "hover:border-blue-400"
                      }`}
                      onClick={() =>
                        document.getElementById("cer-upload")?.click()
                      }
                    >
                      {cerFile ? (
                        <>
                          <CheckCircle2 className="mb-1 h-6 w-6 text-green-600" />
                          <p className="text-xs font-medium text-green-700 dark:text-green-300 truncate max-w-full">
                            {cerFile.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Archivo .cer
                          </p>
                        </>
                      )}
                      <input
                        id="cer-upload"
                        type="file"
                        accept=".cer"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setCerFile(file);
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Llave privada (.key)</Label>
                    <div
                      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors ${
                        keyFile
                          ? "border-green-400 bg-green-50 dark:bg-green-950"
                          : "hover:border-blue-400"
                      }`}
                      onClick={() =>
                        document.getElementById("key-upload")?.click()
                      }
                    >
                      {keyFile ? (
                        <>
                          <CheckCircle2 className="mb-1 h-6 w-6 text-green-600" />
                          <p className="text-xs font-medium text-green-700 dark:text-green-300 truncate max-w-full">
                            {keyFile.name}
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="mb-1 h-6 w-6 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Archivo .key
                          </p>
                        </>
                      )}
                      <input
                        id="key-upload"
                        type="file"
                        accept=".key"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setKeyFile(file);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contraseña de la e.firma</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>

              <Separator />

              {/* CIEC alternativa */}
              <div className="space-y-4">
                <h3 className="font-semibold">Alternativa: CIEC</h3>
                <div className="space-y-2">
                  <Label>Clave CIEC (8 caracteres)</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    maxLength={8}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Puedes configurar las credenciales después desde la
                configuración de la empresa.
              </p>
            </CardContent>
          </Card>
        )}

        {/* PASO 4: Confirmación */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Confirmar y Crear Empresa
              </CardTitle>
              <CardDescription>
                Verifica que los datos sean correctos antes de crear la empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">RFC:</span>
                  <span className="text-sm font-mono font-medium">
                    {formValues.rfc?.toUpperCase()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Razón Social:
                  </span>
                  <span className="text-sm font-medium">
                    {formValues.razon_social}
                  </span>
                </div>
                <Separator />
                {formValues.nombre_comercial && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Nombre Comercial:
                      </span>
                      <span className="text-sm">
                        {formValues.nombre_comercial}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Régimen Fiscal:
                  </span>
                  <Badge variant="outline">{formValues.regimen_codigo}</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Código Postal:
                  </span>
                  <span className="text-sm">{formValues.codigo_postal}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">CIF:</span>
                  <span className="text-sm">
                    {cifFile ? cifFile.name : "No cargado"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Credenciales SAT:
                  </span>
                  <Badge variant={cerFile && keyFile ? "default" : "secondary"}>
                    {cerFile && keyFile ? "e.firma cargada" : "Pendiente"}
                  </Badge>
                </div>
              </div>

              {formValues.objeto_social && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    Objeto Social:
                  </span>
                  <p className="text-sm rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
                    {formValues.objeto_social}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navegación */}
        <div className="flex items-center justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          {currentStep < 4 ? (
            <Button type="button" onClick={nextStep}>
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Empresa
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
