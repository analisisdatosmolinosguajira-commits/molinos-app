-- Add SST Líder role permissions
-- CRUD on SST, read-only on everything else

INSERT INTO app_permission (role, module, can_create, can_update, can_delete) VALUES
  ('sst_lider', 'dashboard', false, false, false),
  ('sst_lider', 'jornadas', false, false, false),
  ('sst_lider', 'ordenes_trabajo', false, false, false),
  ('sst_lider', 'diagnosticos', false, false, false),
  ('sst_lider', 'concertaciones', false, false, false),
  ('sst_lider', 'cuadrillas', false, false, false),
  ('sst_lider', 'sst', true, true, true),
  ('sst_lider', 'comunidades', false, false, false),
  ('sst_lider', 'molinos', false, false, false),
  ('sst_lider', 'bombas', false, false, false),
  ('sst_lider', 'inventario', false, false, false),
  ('sst_lider', 'fabricacion', false, false, false),
  ('sst_lider', 'reportes', false, false, false),
  ('sst_lider', 'admin_operaciones', false, false, false),
  ('sst_lider', 'perfil', false, true, false);
