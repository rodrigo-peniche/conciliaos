import type { Database } from "./database.types";

// Alias de tablas para uso rápido
export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Empresa = Database["public"]["Tables"]["empresas"]["Row"];
export type Usuario = Database["public"]["Tables"]["usuarios"]["Row"];
export type Cfdi = Database["public"]["Tables"]["cfdis"]["Row"];
export type MovimientoBancario = Database["public"]["Tables"]["movimientos_bancarios"]["Row"];
export type CuentaBancaria = Database["public"]["Tables"]["cuentas_bancarias"]["Row"];
export type Conciliacion = Database["public"]["Tables"]["conciliaciones"]["Row"];
export type Contrato = Database["public"]["Tables"]["contratos"]["Row"];
export type Tercero = Database["public"]["Tables"]["terceros"]["Row"];
export type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];

// Tipos de insert
export type EmpresaInsert = Database["public"]["Tables"]["empresas"]["Insert"];
export type CfdiInsert = Database["public"]["Tables"]["cfdis"]["Insert"];
export type MovimientoInsert = Database["public"]["Tables"]["movimientos_bancarios"]["Insert"];

// Roles del sistema
export type RolUsuario = Usuario["rol"];
export type PlanTenant = Tenant["plan"];
export type TipoCfdi = Cfdi["tipo"];
export type EstadoSat = Cfdi["estado_sat"];
export type EstadoConciliacion = MovimientoBancario["estado_conciliacion"];
export type TipoContrato = Contrato["tipo"];
export type EstadoContrato = Contrato["estado"];
export type EfosStatus = Tercero["efos_status"];

// Catálogo de regímenes fiscales SAT
export const REGIMENES_FISCALES = [
  { codigo: "601", descripcion: "General de Ley Personas Morales", tipo: "pm" },
  { codigo: "603", descripcion: "Personas Morales con Fines no Lucrativos", tipo: "pm" },
  { codigo: "605", descripcion: "Sueldos y Salarios e Ingresos Asimilados a Salarios", tipo: "pf" },
  { codigo: "606", descripcion: "Arrendamiento", tipo: "pf" },
  { codigo: "607", descripcion: "Régimen de Enajenación o Adquisición de Bienes", tipo: "pf" },
  { codigo: "608", descripcion: "Demás ingresos", tipo: "pf" },
  { codigo: "610", descripcion: "Residentes en el Extranjero sin Establecimiento Permanente en México", tipo: "ambos" },
  { codigo: "611", descripcion: "Ingresos por Dividendos (socios y accionistas)", tipo: "pf" },
  { codigo: "612", descripcion: "Personas Físicas con Actividades Empresariales y Profesionales", tipo: "pf" },
  { codigo: "614", descripcion: "Ingresos por intereses", tipo: "pf" },
  { codigo: "615", descripcion: "Régimen de los ingresos por obtención de premios", tipo: "pf" },
  { codigo: "616", descripcion: "Sin obligaciones fiscales", tipo: "ambos" },
  { codigo: "620", descripcion: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos", tipo: "pm" },
  { codigo: "621", descripcion: "Incorporación Fiscal", tipo: "pf" },
  { codigo: "622", descripcion: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras", tipo: "ambos" },
  { codigo: "623", descripcion: "Opcional para Grupos de Sociedades", tipo: "pm" },
  { codigo: "624", descripcion: "Coordinados", tipo: "pm" },
  { codigo: "625", descripcion: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas", tipo: "pf" },
  { codigo: "626", descripcion: "Régimen Simplificado de Confianza", tipo: "ambos" },
] as const;

// Catálogo de usos de CFDI
export const USOS_CFDI = [
  { codigo: "G01", descripcion: "Adquisición de mercancías" },
  { codigo: "G02", descripcion: "Devoluciones, descuentos o bonificaciones" },
  { codigo: "G03", descripcion: "Gastos en general" },
  { codigo: "I01", descripcion: "Construcciones" },
  { codigo: "I02", descripcion: "Mobiliario y equipo de oficina por inversiones" },
  { codigo: "I03", descripcion: "Equipo de transporte" },
  { codigo: "I04", descripcion: "Equipo de computo y accesorios" },
  { codigo: "I05", descripcion: "Dados, troqueles, moldes, matrices y herramental" },
  { codigo: "I06", descripcion: "Comunicaciones telefónicas" },
  { codigo: "I07", descripcion: "Comunicaciones satelitales" },
  { codigo: "I08", descripcion: "Otra maquinaria y equipo" },
  { codigo: "D01", descripcion: "Honorarios médicos, dentales y gastos hospitalarios" },
  { codigo: "D02", descripcion: "Gastos médicos por incapacidad o discapacidad" },
  { codigo: "D03", descripcion: "Gastos funerales" },
  { codigo: "D04", descripcion: "Donativos" },
  { codigo: "D05", descripcion: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)" },
  { codigo: "D06", descripcion: "Aportaciones voluntarias al SAR" },
  { codigo: "D07", descripcion: "Primas por seguros de gastos médicos" },
  { codigo: "D08", descripcion: "Gastos de transportación escolar obligatoria" },
  { codigo: "D09", descripcion: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones" },
  { codigo: "D10", descripcion: "Pagos por servicios educativos (colegiaturas)" },
  { codigo: "S01", descripcion: "Sin efectos fiscales" },
  { codigo: "CP01", descripcion: "Pagos" },
  { codigo: "CN01", descripcion: "Nómina" },
] as const;

// Tipos para el motor de conciliación
export interface MatchResult {
  movimientoId: string;
  cfdiId: string;
  score: number;
  tipo: "match_exacto" | "match_fuzzy" | "manual";
  diferenciaMonto: number;
  diferenciaDias: number;
}

// Tipos para deducibilidad
export interface ResultadoDeducibilidad {
  esDeducible: boolean;
  porcentaje: number;
  montoDeducible: number;
  montoNoDeducible: number;
  fundamentoLegal: string;
  razonamiento: string;
  documentosRecomendados: string[];
  alerta: string | null;
  requiereRevision: boolean;
}

// Movimiento normalizado para importación bancaria
export interface MovimientoNormalizado {
  fecha: Date;
  descripcion: string;
  referencia?: string;
  importe: number;
  tipo: "cargo" | "abono";
  saldo?: number;
  numOperacion?: string;
  rfcContraparte?: string;
  nombreContraparte?: string;
  hash: string;
}
