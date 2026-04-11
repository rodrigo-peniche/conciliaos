-- ============================================================
-- ConciliaOS — Fix RLS Policies
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Eliminar política existente si existe
DROP POLICY IF EXISTS tenant_isolation ON empresas;
DROP POLICY IF EXISTS empresas_select ON empresas;
DROP POLICY IF EXISTS empresas_insert ON empresas;
DROP POLICY IF EXISTS empresas_update ON empresas;
DROP POLICY IF EXISTS empresas_delete ON empresas;

-- Políticas para empresas: el usuario autenticado puede CRUD sus propias empresas
-- usando auth.uid() como tenant_id
CREATE POLICY empresas_select ON empresas
  FOR SELECT USING (tenant_id = auth.uid());

CREATE POLICY empresas_insert ON empresas
  FOR INSERT WITH CHECK (tenant_id = auth.uid());

CREATE POLICY empresas_update ON empresas
  FOR UPDATE USING (tenant_id = auth.uid());

CREATE POLICY empresas_delete ON empresas
  FOR DELETE USING (tenant_id = auth.uid());

-- ============================================================
-- Políticas para cfdis (a través de empresa)
-- ============================================================
DROP POLICY IF EXISTS cfdis_select ON cfdis;
DROP POLICY IF EXISTS cfdis_insert ON cfdis;
DROP POLICY IF EXISTS cfdis_update ON cfdis;

CREATE POLICY cfdis_select ON cfdis
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY cfdis_insert ON cfdis
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY cfdis_update ON cfdis
  FOR UPDATE USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

-- ============================================================
-- Políticas para movimientos_bancarios
-- ============================================================
DROP POLICY IF EXISTS movimientos_select ON movimientos_bancarios;
DROP POLICY IF EXISTS movimientos_insert ON movimientos_bancarios;
DROP POLICY IF EXISTS movimientos_update ON movimientos_bancarios;

CREATE POLICY movimientos_select ON movimientos_bancarios
  FOR SELECT USING (
    cuenta_id IN (
      SELECT cb.id FROM cuentas_bancarias cb
      JOIN empresas e ON cb.empresa_id = e.id
      WHERE e.tenant_id = auth.uid()
    )
  );

CREATE POLICY movimientos_insert ON movimientos_bancarios
  FOR INSERT WITH CHECK (
    cuenta_id IN (
      SELECT cb.id FROM cuentas_bancarias cb
      JOIN empresas e ON cb.empresa_id = e.id
      WHERE e.tenant_id = auth.uid()
    )
  );

CREATE POLICY movimientos_update ON movimientos_bancarios
  FOR UPDATE USING (
    cuenta_id IN (
      SELECT cb.id FROM cuentas_bancarias cb
      JOIN empresas e ON cb.empresa_id = e.id
      WHERE e.tenant_id = auth.uid()
    )
  );

-- ============================================================
-- Políticas para contratos
-- ============================================================
DROP POLICY IF EXISTS contratos_select ON contratos;
DROP POLICY IF EXISTS contratos_insert ON contratos;
DROP POLICY IF EXISTS contratos_update ON contratos;

CREATE POLICY contratos_select ON contratos
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY contratos_insert ON contratos
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY contratos_update ON contratos
  FOR UPDATE USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

-- ============================================================
-- Políticas para documentos
-- ============================================================
DROP POLICY IF EXISTS documentos_select ON documentos;
DROP POLICY IF EXISTS documentos_insert ON documentos;

CREATE POLICY documentos_select ON documentos
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY documentos_insert ON documentos
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

-- ============================================================
-- Políticas para cuentas_bancarias
-- ============================================================
ALTER TABLE cuentas_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cuentas_select ON cuentas_bancarias;
DROP POLICY IF EXISTS cuentas_insert ON cuentas_bancarias;
DROP POLICY IF EXISTS cuentas_update ON cuentas_bancarias;

CREATE POLICY cuentas_select ON cuentas_bancarias
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY cuentas_insert ON cuentas_bancarias
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY cuentas_update ON cuentas_bancarias
  FOR UPDATE USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

-- ============================================================
-- Políticas para conciliaciones y partidas
-- ============================================================
ALTER TABLE conciliaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conciliaciones_select ON conciliaciones;
DROP POLICY IF EXISTS conciliaciones_insert ON conciliaciones;
DROP POLICY IF EXISTS conciliaciones_update ON conciliaciones;

CREATE POLICY conciliaciones_select ON conciliaciones
  FOR SELECT USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY conciliaciones_insert ON conciliaciones
  FOR INSERT WITH CHECK (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );

CREATE POLICY conciliaciones_update ON conciliaciones
  FOR UPDATE USING (
    empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
  );
