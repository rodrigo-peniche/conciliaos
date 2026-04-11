import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import CryptoJS from "crypto-js";

export const maxDuration = 30;

const ENCRYPTION_KEY = process.env.FIEL_ENCRYPTION_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "conciliaos-fiel-key";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const empresaId = formData.get("empresaId") as string;
    const cerFile = formData.get("cer") as File | null;
    const keyFile = formData.get("key") as File | null;
    const password = formData.get("password") as string | null;

    if (!empresaId) {
      return NextResponse.json(
        { error: "empresaId es requerido" },
        { status: 400 }
      );
    }

    // Verify empresa belongs to user
    const { data: empresa } = await supabase
      .from("empresas")
      .select("id, tenant_id, rfc")
      .eq("id", empresaId)
      .single() as { data: { id: string; tenant_id: string; rfc: string } | null; error: unknown };

    if (!empresa || empresa.tenant_id !== user.id) {
      return NextResponse.json(
        { error: "Empresa no encontrada o sin permisos" },
        { status: 403 }
      );
    }

    const updates: Record<string, string | null> = {};

    // Upload .cer file to Supabase Storage
    if (cerFile) {
      const cerBytes = await cerFile.arrayBuffer();
      const cerPath = `fiel/${empresaId}/${empresa.rfc}.cer`;

      const { error: cerUploadError } = await supabase.storage
        .from("documentos")
        .upload(cerPath, cerBytes, {
          contentType: "application/x-x509-ca-cert",
          upsert: true,
        });

      if (cerUploadError) {
        console.error("Error uploading .cer:", cerUploadError);
        return NextResponse.json(
          { error: "Error al subir archivo .cer: " + cerUploadError.message },
          { status: 500 }
        );
      }

      updates.efirma_cer_url = cerPath;
    }

    // Upload .key file to Supabase Storage
    if (keyFile) {
      const keyBytes = await keyFile.arrayBuffer();
      const keyPath = `fiel/${empresaId}/${empresa.rfc}.key`;

      const { error: keyUploadError } = await supabase.storage
        .from("documentos")
        .upload(keyPath, keyBytes, {
          contentType: "application/octet-stream",
          upsert: true,
        });

      if (keyUploadError) {
        console.error("Error uploading .key:", keyUploadError);
        return NextResponse.json(
          { error: "Error al subir archivo .key: " + keyUploadError.message },
          { status: 500 }
        );
      }

      updates.efirma_key_url = keyPath;
    }

    // Encrypt password with AES-256
    if (password) {
      const encrypted = CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
      updates.efirma_password_enc = encrypted;
    }

    // Update empresa record
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("empresas")
        .update(updates as never)
        .eq("id", empresaId);

      if (updateError) {
        console.error("Error updating empresa:", updateError);
        return NextResponse.json(
          { error: "Error al actualizar empresa: " + (updateError as { message?: string }).message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: {
        cer: !!cerFile,
        key: !!keyFile,
        password: !!password,
      },
    });
  } catch (error) {
    console.error("Error en /api/sat/fiel/upload:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
