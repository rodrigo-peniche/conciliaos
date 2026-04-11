-- EJECUTAR EN SUPABASE SQL EDITOR
-- Agrega constraint UNIQUE en cfdis.uuid para que el upsert funcione

-- Primero eliminar duplicados si hay (mantener el más reciente)
DELETE FROM cfdis a
USING cfdis b
WHERE a.id < b.id AND a.uuid = b.uuid;

-- Agregar constraint unique
ALTER TABLE cfdis ADD CONSTRAINT cfdis_uuid_unique UNIQUE (uuid);
