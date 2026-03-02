-- Auth Phase 2 Migration: app_permission + secondary_role
-- Run this in Supabase SQL Editor

-- 1. Add secondary_role to user_profile
ALTER TABLE user_profile ADD COLUMN IF NOT EXISTS secondary_role TEXT DEFAULT NULL;

-- 2. Create app_permission table
CREATE TABLE IF NOT EXISTS app_permission (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  module TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  UNIQUE(role, module)
);

ALTER TABLE app_permission ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated" ON app_permission FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all for anon" ON app_permission FOR SELECT TO anon USING (true);

-- 3. Seed permissions (6 roles × 15 modules = 90 rows)

-- SUPERVISOR: CRUD on everything
INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('supervisor', 'dashboard', false, false, false),
  ('supervisor', 'jornadas', true, true, true),
  ('supervisor', 'ordenes_trabajo', true, true, true),
  ('supervisor', 'diagnosticos', true, true, true),
  ('supervisor', 'concertaciones', true, true, true),
  ('supervisor', 'cuadrillas', true, true, true),
  ('supervisor', 'sst', true, true, true),
  ('supervisor', 'comunidades', true, true, true),
  ('supervisor', 'molinos', true, true, true),
  ('supervisor', 'bombas', true, true, true),
  ('supervisor', 'inventario', true, true, true),
  ('supervisor', 'fabricacion', true, true, true),
  ('supervisor', 'reportes', true, true, true),
  ('supervisor', 'admin_operaciones', true, true, true),
  ('supervisor', 'perfil', false, true, false);

-- ING_LIDER
INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('ing_lider', 'dashboard', false, false, false),
  ('ing_lider', 'jornadas', true, true, true),
  ('ing_lider', 'ordenes_trabajo', true, true, true),
  ('ing_lider', 'diagnosticos', true, true, true),
  ('ing_lider', 'concertaciones', false, false, false),
  ('ing_lider', 'cuadrillas', true, true, true),
  ('ing_lider', 'sst', false, false, false),
  ('ing_lider', 'comunidades', false, false, false),
  ('ing_lider', 'molinos', true, true, true),
  ('ing_lider', 'bombas', true, true, true),
  ('ing_lider', 'inventario', false, false, false),
  ('ing_lider', 'fabricacion', true, true, true),
  ('ing_lider', 'reportes', true, true, false),
  ('ing_lider', 'admin_operaciones', false, false, false),
  ('ing_lider', 'perfil', false, true, false);

-- SOCIAL_LIDER
INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('social_lider', 'dashboard', false, false, false),
  ('social_lider', 'jornadas', true, true, true),
  ('social_lider', 'ordenes_trabajo', false, false, false),
  ('social_lider', 'diagnosticos', false, false, false),
  ('social_lider', 'concertaciones', true, true, true),
  ('social_lider', 'cuadrillas', true, true, false),
  ('social_lider', 'sst', true, true, true),
  ('social_lider', 'comunidades', true, true, true),
  ('social_lider', 'molinos', false, false, false),
  ('social_lider', 'bombas', false, false, false),
  ('social_lider', 'inventario', false, false, false),
  ('social_lider', 'fabricacion', false, false, false),
  ('social_lider', 'reportes', true, true, false),
  ('social_lider', 'admin_operaciones', false, false, false),
  ('social_lider', 'perfil', false, true, false);

-- INVENTARIO_LIDER
INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('inventario_lider', 'dashboard', false, false, false),
  ('inventario_lider', 'jornadas', false, false, false),
  ('inventario_lider', 'ordenes_trabajo', false, false, false),
  ('inventario_lider', 'diagnosticos', false, false, false),
  ('inventario_lider', 'concertaciones', false, false, false),
  ('inventario_lider', 'cuadrillas', false, false, false),
  ('inventario_lider', 'sst', false, false, false),
  ('inventario_lider', 'comunidades', false, false, false),
  ('inventario_lider', 'molinos', false, false, false),
  ('inventario_lider', 'bombas', false, false, false),
  ('inventario_lider', 'inventario', true, true, true),
  ('inventario_lider', 'fabricacion', true, true, true),
  ('inventario_lider', 'reportes', true, true, false),
  ('inventario_lider', 'admin_operaciones', false, false, false),
  ('inventario_lider', 'perfil', false, true, false);

-- LOGISTICA_LIDER
INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('logistica_lider', 'dashboard', false, false, false),
  ('logistica_lider', 'jornadas', true, true, true),
  ('logistica_lider', 'ordenes_trabajo', false, false, false),
  ('logistica_lider', 'diagnosticos', false, false, false),
  ('logistica_lider', 'concertaciones', false, false, false),
  ('logistica_lider', 'cuadrillas', true, true, false),
  ('logistica_lider', 'sst', false, false, false),
  ('logistica_lider', 'comunidades', false, false, false),
  ('logistica_lider', 'molinos', false, false, false),
  ('logistica_lider', 'bombas', false, false, false),
  ('logistica_lider', 'inventario', false, false, false),
  ('logistica_lider', 'fabricacion', false, false, false),
  ('logistica_lider', 'reportes', false, false, false),
  ('logistica_lider', 'admin_operaciones', false, false, false),
  ('logistica_lider', 'perfil', false, true, false);

-- OPERATIVO (general / default)
INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('operativo', 'dashboard', false, false, false),
  ('operativo', 'jornadas', false, false, false),
  ('operativo', 'ordenes_trabajo', false, false, false),
  ('operativo', 'diagnosticos', false, false, false),
  ('operativo', 'concertaciones', false, false, false),
  ('operativo', 'cuadrillas', false, false, false),
  ('operativo', 'sst', false, false, false),
  ('operativo', 'comunidades', false, false, false),
  ('operativo', 'molinos', false, false, false),
  ('operativo', 'bombas', false, false, false),
  ('operativo', 'inventario', false, false, false),
  ('operativo', 'fabricacion', false, false, false),
  ('operativo', 'reportes', false, false, false),
  ('operativo', 'admin_operaciones', false, false, false),
  ('operativo', 'perfil', false, true, false);
