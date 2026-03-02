-- Migration: Create project_goal table for Reports & Goals module
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_goal (
  goal_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  target_value INT NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'month',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default goals
INSERT INTO project_goal (name, metric_key, target_value, period) VALUES
  ('Intervenciones nuevas', 'new_interventions', 20, 'month'),
  ('OTs completadas', 'completed_work_orders', 30, 'month'),
  ('Piezas fabricadas', 'pieces_fabricated', 50, 'month'),
  ('Tipos de pieza distintos', 'distinct_piece_types', 10, 'year'),
  ('Bombas fabricadas', 'pumps_fabricated', 5, 'month'),
  ('Concertaciones realizadas', 'concertations', 10, 'month'),
  ('Diagnósticos realizados', 'diagnoses', 25, 'month'),
  ('Jornadas ejecutadas', 'journeys', 15, 'month');

-- Enable RLS
ALTER TABLE project_goal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON project_goal 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
