import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarPDF } from "@/lib/contratos/pdf-builder";
import type { Database } from "@/lib/types/database.types";

type Contrato = Database["public"]["Tables"]["contratos"]["Row"];
type Empresa = Database["public"]["Tables"]["empresas"]["Row"];

/**
 * POST /api/contratos/pdf — Generar PDF de un contrato
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { contratoId } = await request.json();

    if (!contratoId) {
      return NextResponse.json(
        { error: "contratoId es requerido" },
        { status: 400 }
      );
    }

    // Obtener contrato
    const { data: contrato } = (await supabase
      .from("contratos" as never)
      .select("*")
      .eq("id", contratoId)
      .single()) as { data: Contrato | null };

    if (!contrato || !contrato.cuerpo_html) {
      return NextResponse.json(
        { error: "Contrato no encontrado o sin contenido" },
        { status: 404 }
      );
    }

    // Obtener empresa
    const { data: empresa } = (await supabase
      .from("empresas" as never)
      .select("*")
      .eq("id", contrato.empresa_id)
      .single()) as { data: Empresa | null };

    if (!empresa) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    const domicilio = empresa.domicilio_fiscal
      ? typeof empresa.domicilio_fiscal === "string"
        ? empresa.domicilio_fiscal
        : JSON.stringify(empresa.domicilio_fiscal)
      : empresa.codigo_postal;

    // Generar PDF
    const pdfBytes = await generarPDF({
      html: contrato.cuerpo_html,
      empresaNombre: empresa.razon_social,
      empresaRfc: empresa.rfc,
      empresaDomicilio: domicilio,
      titulo: contrato.nombre,
      numeroContrato: contrato.numero_contrato || undefined,
    });

    return new Response(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${contrato.nombre}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error en /api/contratos/pdf:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
