-- ============================================================
-- ConciliaOS — Script completo de corrección
-- EJECUTAR EN SUPABASE SQL EDITOR (todo junto)
-- ============================================================

-- ============================================================
-- 1. UNIQUE constraint en cfdis.uuid (para que upsert funcione)
-- ============================================================
-- Eliminar duplicados si hay (mantener el más reciente)
DELETE FROM cfdis a USING cfdis b WHERE a.id < b.id AND a.uuid = b.uuid;

-- Agregar constraint unique (ignorar si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cfdis_uuid_unique') THEN
    ALTER TABLE cfdis ADD CONSTRAINT cfdis_uuid_unique UNIQUE (uuid);
  END IF;
END $$;

-- ============================================================
-- 2. Storage bucket para archivos FIEL
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "storage_upload" ON storage.objects;
CREATE POLICY "storage_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos');

DROP POLICY IF EXISTS "storage_select" ON storage.objects;
CREATE POLICY "storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos');

DROP POLICY IF EXISTS "storage_update" ON storage.objects;
CREATE POLICY "storage_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos');

-- ============================================================
-- 3. RLS Policies — tenants
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_select ON tenants;
DROP POLICY IF EXISTS tenants_insert ON tenants;
DROP POLICY IF EXISTS tenants_update ON tenants;

CREATE POLICY tenants_select ON tenants FOR SELECT USING (id = auth.uid());
CREATE POLICY tenants_insert ON tenants FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY tenants_update ON tenants FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- 4. RLS Policies — empresas
-- ============================================================
DROP POLICY IF EXISTS tenant_isolation ON empresas;
DROP POLICY IF EXISTS empresas_select ON empresas;
DROP POLICY IF EXISTS empresas_insert ON empresas;
DROP POLICY IF EXISTS empresas_update ON empresas;
DROP POLICY IF EXISTS empresas_delete ON empresas;

CREATE POLICY empresas_select ON empresas FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY empresas_insert ON empresas FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY empresas_update ON empresas FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY empresas_delete ON empresas FOR DELETE USING (tenant_id = auth.uid());

-- ============================================================
-- 5. RLS Policies — cfdis
-- ============================================================
ALTER TABLE cfdis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cfdis_select ON cfdis;
DROP POLICY IF EXISTS cfdis_insert ON cfdis;
DROP POLICY IF EXISTS cfdis_update ON cfdis;

CREATE POLICY cfdis_select ON cfdis FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY cfdis_insert ON cfdis FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY cfdis_update ON cfdis FOR UPDATE USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

-- ============================================================
-- 6. RLS Policies — cuentas_bancarias
-- ============================================================
ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cuentas_select ON cuentas_bancarias;
DROP POLICY IF EXISTS cuentas_insert ON cuentas_bancarias;
DROP POLICY IF EXISTS cuentas_update ON cuentas_bancarias;

CREATE POLICY cuentas_select ON cuentas_bancarias FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY cuentas_insert ON cuentas_bancarias FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY cuentas_update ON cuentas_bancarias FOR UPDATE USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

-- ============================================================
-- 7. RLS Policies — movimientos_bancarios
-- ============================================================
DROP POLICY IF EXISTS movimientos_select ON movimientos_bancarios;
DROP POLICY IF EXISTS movimientos_insert ON movimientos_bancarios;
DROP POLICY IF EXISTS movimientos_update ON movimientos_bancarios;

CREATE POLICY movimientos_select ON movimientos_bancarios FOR SELECT USING (
  cuenta_id IN (SELECT cb.id FROM cuentas_bancarias cb JOIN empresas e ON cb.empresa_id = e.id WHERE e.tenant_id = auth.uid())
);
CREATE POLICY movimientos_insert ON movimientos_bancarios FOR INSERT WITH CHECK (
  cuenta_id IN (SELECT cb.id FROM cuentas_bancarias cb JOIN empresas e ON cb.empresa_id = e.id WHERE e.tenant_id = auth.uid())
);
CREATE POLICY movimientos_update ON movimientos_bancarios FOR UPDATE USING (
  cuenta_id IN (SELECT cb.id FROM cuentas_bancarias cb JOIN empresas e ON cb.empresa_id = e.id WHERE e.tenant_id = auth.uid())
);

-- ============================================================
-- 8. RLS Policies — contratos
-- ============================================================
DROP POLICY IF EXISTS contratos_select ON contratos;
DROP POLICY IF EXISTS contratos_insert ON contratos;
DROP POLICY IF EXISTS contratos_update ON contratos;

CREATE POLICY contratos_select ON contratos FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY contratos_insert ON contratos FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY contratos_update ON contratos FOR UPDATE USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

-- ============================================================
-- 9. RLS Policies — documentos
-- ============================================================
DROP POLICY IF EXISTS documentos_select ON documentos;
DROP POLICY IF EXISTS documentos_insert ON documentos;

CREATE POLICY documentos_select ON documentos FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);
CREATE POLICY documentos_insert ON documentos FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

-- ============================================================
-- 10. RLS Policies — conciliaciones
-- ============================================================
ALTER TABLE conciliaciones ENABLE ROW LEVEL SECURITY;

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

-- ============================================================
-- Verificación final
-- ============================================================
SELECT 'CFDIs totales:' as info, count(*) as total FROM cfdis;
SELECT 'CFDIs por empresa:' as info, empresa_id, count(*) as total FROM cfdis GROUP BY empresa_id;
SELECT 'Empresas:' as info, count(*) as total FROM empresas;
