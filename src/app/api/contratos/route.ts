import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generarContrato, type DatosContrato } from "@/lib/contratos/generador";
import { generarPDF } from "@/lib/contratos/pdf-builder";
import type { Database } from "@/lib/types/database.types";

type ContratoInsert = Database["public"]["Tables"]["contratos"]["Insert"];
type Contrato = Database["public"]["Tables"]["contratos"]["Row"];

/**
 * POST /api/contratos — Generar un contrato nuevo con IA
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

    const body: DatosContrato & { empresaId: string } = await request.json();

    if (!body.empresaId || !body.tipo || !body.objetoContrato) {
      return NextResponse.json(
        { error: "empresaId, tipo y objetoContrato son requeridos" },
        { status: 400 }
      );
    }

    // Generar HTML del contrato
    const html = await generarContrato(body);

    // Guardar en BD
    const insertData: ContratoInsert = {
      empresa_id: body.empresaId,
      tipo: body.tipo,
      nombre: `Contrato de ${body.tipo} — ${body.contratadoNombre}`,
      contratante_rfc: body.contratanteRfc,
      contratante_nombre: body.contratanteNombre,
      contratado_nombre: body.contratadoNombre,
    };

    const { data: contrato, error } = (await supabase
      .from("contratos" as never)
      .insert(insertData as never)
      .select()
      .single()) as { data: Contrato | null; error: unknown };

    if (error || !contrato) {
      console.error("Error al guardar contrato:", error);
      return NextResponse.json(
        { error: "Error al guardar contrato" },
        { status: 500 }
      );
    }

    // Actualizar con el HTML generado
    await supabase
      .from("contratos" as never)
      .update({
        cuerpo_html: html,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", contrato.id);

    return NextResponse.json({
      id: contrato.id,
      html,
      nombre: contrato.nombre,
    });
  } catch (error) {
    console.error("Error en /api/contratos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contratos?empresaId=... — Listar contratos de una empresa
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get("empresaId");

    if (!empresaId) {
      return NextResponse.json(
        { error: "empresaId es requerido" },
        { status: 400 }
      );
    }

    const { data: contratos } = (await supabase
      .from("contratos" as never)
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })) as { data: Contrato[] | null };

    return NextResponse.json({ contratos: contratos || [] });
  } catch (error) {
    console.error("Error en GET /api/contratos:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
