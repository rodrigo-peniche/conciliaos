-- ============================================================
-- ConciliaOS — Crear tablas de conciliación
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================================

-- Tabla de conciliaciones
CREATE TABLE IF NOT EXISTS conciliaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  cuenta_id UUID NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  saldo_banco_inicio NUMERIC DEFAULT 0,
  saldo_banco_fin NUMERIC DEFAULT 0,
  saldo_libros_inicio NUMERIC DEFAULT 0,
  saldo_libros_fin NUMERIC DEFAULT 0,
  diferencia NUMERIC DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso', 'en_revision', 'aprobada', 'cerrada')),
  total_movimientos INTEGER NOT NULL DEFAULT 0,
  conciliados INTEGER NOT NULL DEFAULT 0,
  pendientes INTEGER NOT NULL DEFAULT 0,
  excepciones INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de partidas de conciliación
CREATE TABLE IF NOT EXISTS conciliacion_partidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conciliacion_id UUID NOT NULL REFERENCES conciliaciones(id) ON DELETE CASCADE,
  movimiento_id UUID,
  cfdi_id UUID,
  tipo TEXT NOT NULL CHECK (tipo IN ('match_exacto', 'match_fuzzy', 'manual', 'sin_cfdi', 'sin_movimiento', 'diferencia')),
  score_matching NUMERIC DEFAULT 0,
  diferencia_monto NUMERIC NOT NULL DEFAULT 0,
  diferencia_dias INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aceptado', 'rechazado', 'excepcion')),
  nota TEXT,
  revisado_por UUID,
  revisado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agregar columnas a movimientos_bancarios si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_bancarios' AND column_name = 'cfdi_id') THEN
    ALTER TABLE movimientos_bancarios ADD COLUMN cfdi_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_bancarios' AND column_name = 'conciliacion_id') THEN
    ALTER TABLE movimientos_bancarios ADD COLUMN conciliacion_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_bancarios' AND column_name = 'conciliado_at') THEN
    ALTER TABLE movimientos_bancarios ADD COLUMN conciliado_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'movimientos_bancarios' AND column_name = 'conciliado_por') THEN
    ALTER TABLE movimientos_bancarios ADD COLUMN conciliado_por UUID;
  END IF;
END $$;

-- Agregar columnas a cfdis si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cfdis' AND column_name = 'conciliado') THEN
    ALTER TABLE cfdis ADD COLUMN conciliado BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cfdis' AND column_name = 'conciliado_at') THEN
    ALTER TABLE cfdis ADD COLUMN conciliado_at TIMESTAMPTZ;
  END IF;
END $$;

-- RLS
ALTER TABLE conciliaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE conciliacion_partidas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conciliaciones_select ON conciliaciones;
DROP POLICY IF EXISTS conciliaciones_insert ON conciliaciones;
DROP POLICY IF EXISTS conciliaciones_update ON conciliaciones;

CREATE POLICY conciliaciones_select ON conciliaciones FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY conciliaciones_insert ON conciliaciones FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY conciliaciones_update ON conciliaciones FOR UPDATE USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS conciliacion_partidas_select ON conciliacion_partidas;
DROP POLICY IF EXISTS conciliacion_partidas_insert ON conciliacion_partidas;
DROP POLICY IF EXISTS conciliacion_partidas_update ON conciliacion_partidas;

CREATE POLICY conciliacion_partidas_select ON conciliacion_partidas FOR SELECT USING (
  conciliacion_id IN (SELECT id FROM conciliaciones WHERE empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid()))
);
CREATE POLICY conciliacion_partidas_insert ON conciliacion_partidas FOR INSERT WITH CHECK (
  conciliacion_id IN (SELECT id FROM conciliaciones WHERE empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid()))
);
CREATE POLICY conciliacion_partidas_update ON conciliacion_partidas FOR UPDATE USING (
  conciliacion_id IN (SELECT id FROM conciliaciones WHERE empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid()))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_conciliaciones_empresa ON conciliaciones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_conciliaciones_periodo ON conciliaciones(periodo_inicio, periodo_fin);
CREATE INDEX IF NOT EXISTS idx_partidas_conciliacion ON conciliacion_partidas(conciliacion_id);
CREATE INDEX IF NOT EXISTS idx_partidas_movimiento ON conciliacion_partidas(movimiento_id);
CREATE INDEX IF NOT EXISTS idx_partidas_cfdi ON conciliacion_partidas(cfdi_id);
