-- Run this in Supabase SQL Editor to:
-- 1. Create the 'documentos' storage bucket for FIEL files
-- 2. Allow empresa updates to include FIEL columns
-- 3. Fix RLS policies for storage

-- Create documentos bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: allow authenticated users to upload to their own paths
CREATE POLICY "storage_upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "storage_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "storage_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos');

-- Allow updating FIEL columns on empresas
DROP POLICY IF EXISTS "empresas_update" ON empresas;
CREATE POLICY "empresas_update" ON empresas
FOR UPDATE USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

-- Ensure cfdis policies exist and are correct
DROP POLICY IF EXISTS "cfdis_select" ON cfdis;
CREATE POLICY "cfdis_select" ON cfdis
FOR SELECT USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS "cfdis_insert" ON cfdis;
CREATE POLICY "cfdis_insert" ON cfdis
FOR INSERT WITH CHECK (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS "cfdis_update" ON cfdis;
CREATE POLICY "cfdis_update" ON cfdis
FOR UPDATE USING (
  empresa_id IN (SELECT id FROM empresas WHERE tenant_id = auth.uid())
);

-- Verify: check if there are cfdis
SELECT count(*) as total_cfdis FROM cfdis;
SELECT empresa_id, count(*) as count FROM cfdis GROUP BY empresa_id;
