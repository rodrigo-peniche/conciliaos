export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          nombre: string;
          slug: string;
          plan: "starter" | "profesional" | "despacho" | "enterprise";
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          slug: string;
          plan?: "starter" | "profesional" | "despacho" | "enterprise";
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          slug?: string;
          plan?: "starter" | "profesional" | "despacho" | "enterprise";
          activo?: boolean;
          updated_at?: string;
        };
      };
      empresas: {
        Row: {
          id: string;
          tenant_id: string;
          razon_social: string;
          rfc: string;
          nombre_comercial: string | null;
          regimen_fiscal: string;
          regimen_codigo: string;
          objeto_social: string | null;
          actividades_sat: string[] | null;
          codigo_postal: string;
          domicilio_fiscal: Json | null;
          telefono: string | null;
          email_fiscal: string | null;
          cif_url: string | null;
          acta_constitutiva_url: string | null;
          logo_url: string | null;
          ciec_enc: string | null;
          efirma_cer_url: string | null;
          efirma_key_url: string | null;
          efirma_password_enc: string | null;
          sat_sincronizado_at: string | null;
          sat_situacion: string | null;
          sat_opiniones_at: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          razon_social: string;
          rfc: string;
          nombre_comercial?: string | null;
          regimen_fiscal: string;
          regimen_codigo: string;
          objeto_social?: string | null;
          actividades_sat?: string[] | null;
          codigo_postal: string;
          domicilio_fiscal?: Json | null;
          telefono?: string | null;
          email_fiscal?: string | null;
          cif_url?: string | null;
          acta_constitutiva_url?: string | null;
          logo_url?: string | null;
          ciec_enc?: string | null;
          efirma_cer_url?: string | null;
          efirma_key_url?: string | null;
          efirma_password_enc?: string | null;
          sat_sincronizado_at?: string | null;
          sat_situacion?: string | null;
          sat_opiniones_at?: string | null;
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          razon_social?: string;
          rfc?: string;
          nombre_comercial?: string | null;
          regimen_fiscal?: string;
          regimen_codigo?: string;
          objeto_social?: string | null;
          actividades_sat?: string[] | null;
          codigo_postal?: string;
          domicilio_fiscal?: Json | null;
          telefono?: string | null;
          email_fiscal?: string | null;
          activo?: boolean;
          updated_at?: string;
        };
      };
      usuarios: {
        Row: {
          id: string;
          tenant_id: string;
          auth_user_id: string | null;
          nombre: string;
          apellidos: string | null;
          email: string;
          telefono: string | null;
          rol: "super_admin" | "admin" | "contador" | "asistente" | "editor" | "visor";
          activo: boolean;
          ultimo_acceso_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          auth_user_id?: string | null;
          nombre: string;
          apellidos?: string | null;
          email: string;
          telefono?: string | null;
          rol: "super_admin" | "admin" | "contador" | "asistente" | "editor" | "visor";
          activo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          nombre?: string;
          apellidos?: string | null;
          email?: string;
          telefono?: string | null;
          rol?: "super_admin" | "admin" | "contador" | "asistente" | "editor" | "visor";
          activo?: boolean;
          updated_at?: string;
        };
      };
      cfdis: {
        Row: {
          id: string;
          empresa_id: string;
          uuid: string;
          tipo: "ingreso" | "egreso" | "traslado" | "nomina" | "pago";
          version: string;
          emisor_rfc: string;
          emisor_nombre: string | null;
          emisor_regimen: string | null;
          receptor_rfc: string;
          receptor_nombre: string | null;
          receptor_regimen: string | null;
          receptor_domicilio_fiscal: string | null;
          receptor_uso_cfdi: string | null;
          subtotal: number;
          descuento: number;
          total: number;
          moneda: string;
          tipo_cambio: number;
          total_mxn: number | null;
          iva_trasladado: number;
          iva_retenido: number;
          isr_retenido: number;
          ieps_trasladado: number;
          forma_pago: string | null;
          metodo_pago: string | null;
          condiciones_pago: string | null;
          tipo_relacion: string | null;
          fecha_emision: string;
          fecha_certificacion: string | null;
          fecha_timbrado: string | null;
          estado_sat: "vigente" | "cancelado" | "no_encontrado" | "por_verificar";
          estatus_cancelacion: string | null;
          fecha_cancelacion: string | null;
          motivo_cancelacion: string | null;
          direccion: "emitido" | "recibido" | null;
          efos_verificado: boolean;
          efos_resultado: string | null;
          efos_verificado_at: string | null;
          es_deducible: boolean | null;
          deducible_pct: number | null;
          deducible_monto: number | null;
          no_deducible_monto: number | null;
          deducibilidad_motivo: string | null;
          deducibilidad_ia_analisis: string | null;
          deducibilidad_revisada_at: string | null;
          deducibilidad_revisada_por: string | null;
          cuenta_contable_id: string | null;
          partida_presupuestal: string | null;
          xml_url: string | null;
          pdf_url: string | null;
          xml_raw: string | null;
          conciliado: boolean;
          conciliado_at: string | null;
          no_certificado_sat: string | null;
          no_certificado_emisor: string | null;
          sello_cfd: string | null;
          sello_sat: string | null;
          cadena_original: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          uuid: string;
          tipo: "ingreso" | "egreso" | "traslado" | "nomina" | "pago";
          version?: string;
          emisor_rfc: string;
          emisor_nombre?: string | null;
          emisor_regimen?: string | null;
          receptor_rfc: string;
          receptor_nombre?: string | null;
          receptor_regimen?: string | null;
          receptor_uso_cfdi?: string | null;
          subtotal?: number;
          descuento?: number;
          total?: number;
          moneda?: string;
          tipo_cambio?: number;
          fecha_emision: string;
          estado_sat?: "vigente" | "cancelado" | "no_encontrado" | "por_verificar";
          direccion?: "emitido" | "recibido" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          estado_sat?: "vigente" | "cancelado" | "no_encontrado" | "por_verificar";
          es_deducible?: boolean | null;
          deducible_pct?: number | null;
          conciliado?: boolean;
          conciliado_at?: string | null;
          updated_at?: string;
        };
      };
      movimientos_bancarios: {
        Row: {
          id: string;
          cuenta_id: string;
          empresa_id: string;
          fecha: string;
          fecha_valor: string | null;
          referencia: string | null;
          descripcion: string | null;
          concepto: string | null;
          importe: number;
          tipo: "cargo" | "abono" | null;
          saldo: number | null;
          moneda: string;
          num_operacion: string | null;
          clave_rastreo: string | null;
          rfc_contraparte: string | null;
          nombre_contraparte: string | null;
          estado_conciliacion: "pendiente" | "conciliado" | "revisado" | "ignorado" | "diferencia";
          cfdi_id: string | null;
          conciliacion_id: string | null;
          conciliado_at: string | null;
          conciliado_por: string | null;
          cuenta_contable_id: string | null;
          es_transferencia: boolean;
          cuenta_destino_id: string | null;
          archivo_origen: string | null;
          hash_dedup: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cuenta_id: string;
          empresa_id: string;
          fecha: string;
          referencia?: string | null;
          descripcion?: string | null;
          importe: number;
          tipo?: "cargo" | "abono" | null;
          saldo?: number | null;
          hash_dedup?: string | null;
          created_at?: string;
        };
        Update: {
          estado_conciliacion?: "pendiente" | "conciliado" | "revisado" | "ignorado" | "diferencia";
          cfdi_id?: string | null;
          conciliado_at?: string | null;
          updated_at?: string;
        };
      };
      cuentas_bancarias: {
        Row: {
          id: string;
          empresa_id: string;
          banco: string;
          clabe: string | null;
          numero_cuenta: string | null;
          alias: string | null;
          moneda: string;
          tipo: "cheques" | "ahorro" | "inversion" | "credito" | null;
          saldo_inicial: number;
          saldo_actual: number;
          saldo_conciliado: number;
          activa: boolean;
          ultima_importacion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          banco: string;
          clabe?: string | null;
          numero_cuenta?: string | null;
          alias?: string | null;
          moneda?: string;
          tipo?: "cheques" | "ahorro" | "inversion" | "credito" | null;
          saldo_inicial?: number;
          created_at?: string;
        };
        Update: {
          banco?: string;
          alias?: string | null;
          saldo_actual?: number;
          saldo_conciliado?: number;
          activa?: boolean;
          updated_at?: string;
        };
      };
      conciliaciones: {
        Row: {
          id: string;
          empresa_id: string;
          cuenta_id: string;
          periodo_inicio: string;
          periodo_fin: string;
          saldo_banco_inicio: number | null;
          saldo_banco_fin: number | null;
          saldo_libros_inicio: number | null;
          saldo_libros_fin: number | null;
          diferencia: number | null;
          estado: "en_proceso" | "en_revision" | "aprobada" | "cerrada";
          total_movimientos: number;
          conciliados: number;
          pendientes: number;
          excepciones: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          cuenta_id: string;
          periodo_inicio: string;
          periodo_fin: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          estado?: "en_proceso" | "en_revision" | "aprobada" | "cerrada";
          conciliados?: number;
          pendientes?: number;
          updated_at?: string;
        };
      };
      contratos: {
        Row: {
          id: string;
          empresa_id: string;
          tipo: "servicios" | "obra" | "suministro" | "arrendamiento" | "nda" | "honorarios" | "otro";
          subtipo: string | null;
          nombre: string;
          numero_contrato: string | null;
          contratante_rfc: string;
          contratante_nombre: string;
          contratado_rfc: string | null;
          contratado_nombre: string;
          monto: number | null;
          moneda: string;
          fecha_inicio: string | null;
          fecha_fin: string | null;
          estado: "borrador" | "revision" | "firmado" | "activo" | "vencido" | "cancelado";
          cuerpo_html: string | null;
          cuerpo_pdf_url: string | null;
          version: number;
          creado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          tipo: "servicios" | "obra" | "suministro" | "arrendamiento" | "nda" | "honorarios" | "otro";
          nombre: string;
          contratante_rfc: string;
          contratante_nombre: string;
          contratado_nombre: string;
          created_at?: string;
        };
        Update: {
          estado?: "borrador" | "revision" | "firmado" | "activo" | "vencido" | "cancelado";
          cuerpo_html?: string | null;
          updated_at?: string;
        };
      };
      terceros: {
        Row: {
          id: string;
          empresa_id: string;
          tipo: "proveedor" | "cliente" | "ambos";
          rfc: string;
          razon_social: string;
          nombre_comercial: string | null;
          regimen_fiscal: string | null;
          domicilio: Json | null;
          email: string | null;
          telefono: string | null;
          contacto_nombre: string | null;
          sat_validado: boolean;
          efos_status: "no_verificado" | "limpio" | "presunto" | "definitivo" | "desvirtuado" | "sentencia";
          total_facturas: number;
          total_facturado: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          tipo: "proveedor" | "cliente" | "ambos";
          rfc: string;
          razon_social: string;
          created_at?: string;
        };
        Update: {
          efos_status?: "no_verificado" | "limpio" | "presunto" | "definitivo" | "desvirtuado" | "sentencia";
          activo?: boolean;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          tenant_id: string | null;
          empresa_id: string | null;
          usuario_id: string | null;
          accion: string;
          tabla: string;
          registro_id: string | null;
          datos_anteriores: Json | null;
          datos_nuevos: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          empresa_id?: string | null;
          usuario_id?: string | null;
          accion: string;
          tabla: string;
          registro_id?: string | null;
          datos_anteriores?: Json | null;
          datos_nuevos?: Json | null;
          created_at?: string;
        };
        Update: never;
      };
      sat_sync_jobs: {
        Row: {
          id: string;
          empresa_id: string;
          tipo: "cfdi_emitidos" | "cfdi_recibidos" | "declaraciones" | "opiniones" | "efos" | null;
          estado: "pendiente" | "ejecutando" | "completado" | "error" | "cancelado";
          fecha_inicio_descarga: string | null;
          fecha_fin_descarga: string | null;
          total_encontrados: number | null;
          total_descargados: number | null;
          total_errores: number | null;
          error_detalle: string | null;
          iniciado_por: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          empresa_id: string;
          tipo?: "cfdi_emitidos" | "cfdi_recibidos" | "declaraciones" | "opiniones" | "efos" | null;
          estado?: "pendiente" | "ejecutando" | "completado" | "error" | "cancelado";
          fecha_inicio_descarga?: string | null;
          fecha_fin_descarga?: string | null;
          iniciado_por?: string | null;
          created_at?: string;
        };
        Update: {
          estado?: "pendiente" | "ejecutando" | "completado" | "error" | "cancelado";
          total_encontrados?: number | null;
          total_descargados?: number | null;
          total_errores?: number | null;
          error_detalle?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
        };
      };
    };
    Functions: {
      calcular_score_matching: {
        Args: {
          p_monto_mov: number;
          p_monto_cfdi: number;
          p_fecha_mov: string;
          p_fecha_cfdi: string;
          p_rfc_mov: string;
          p_rfc_cfdi: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
};
