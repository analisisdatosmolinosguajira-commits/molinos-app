
-- Script to Backfill Complementary Data for EXISTING Movements
-- Excludes the recently created 'Nissan Frontier' movement.
-- Ensures all older movements have communities, personnel, and tasks assigned.

-- 1. BACKFILL COMMUNITIES (Destinations)
-- Assign 'Comunidad El Viento' to all Inspection movements
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.objective = 'inspeccion'
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND c.name = 'Comunidad El Viento'
ON CONFLICT DO NOTHING;

-- Assign 'Comunidad San Jose' to all Diagnosis/Work Order movements
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.objective IN ('diagnostico', 'mixto')
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND c.name = 'Comunidad San Jose'
ON CONFLICT DO NOTHING;

-- Assign 'Comunidad La Guajira Central' to Social movements
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.objective = 'concertacion'
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND c.name = 'Comunidad La Guajira Central'
ON CONFLICT DO NOTHING;


-- 2. BACKFILL PERSONNEL (Crew & Drivers)
-- Assign 'Luis' (Conductor) to movements without a driver
INSERT INTO movement_person (movement_id, person_id, role)
SELECT m.movement_id, p.person_id, 'Conductor'
FROM movement m, person p
WHERE m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND p.first_name = 'Luis'
  AND NOT EXISTS (
      SELECT 1 FROM movement_person mp 
      WHERE mp.movement_id = m.movement_id AND mp.role = 'Conductor'
  )
ON CONFLICT DO NOTHING;

-- Assign 'Maria' (Tecnico) to Diagnosis movements without technical staff
INSERT INTO movement_person (movement_id, person_id, crew_id, role)
SELECT m.movement_id, p.person_id, cr.crew_id, 'Técnico de Campo'
FROM movement m, person p, crew cr
WHERE m.objective = 'diagnostico'
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND p.first_name = 'Maria'
  AND cr.name = 'Cuadrilla Alpha'
  AND NOT EXISTS (
      SELECT 1 FROM movement_person mp 
      WHERE mp.movement_id = m.movement_id AND mp.crew_id IS NOT NULL
  )
ON CONFLICT DO NOTHING;

-- Assign 'Juan' (Social) to Concertation movements
INSERT INTO movement_person (movement_id, person_id, role)
SELECT m.movement_id, p.person_id, 'Gestor Social'
FROM movement m, person p
WHERE m.objective = 'concertacion'
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND p.first_name = 'Juan'
  AND NOT EXISTS (
      SELECT 1 FROM movement_person mp 
      WHERE mp.movement_id = m.movement_id AND mp.person_id = p.person_id
  )
ON CONFLICT DO NOTHING;


-- 3. BACKFILL WORK ORDERS & DIAGNOSES (Tasks)
-- Link pending Work Orders to Inspection movements
INSERT INTO movement_work_order (movement_id, work_order_id)
SELECT m.movement_id, w.work_order_id
FROM movement m, work_order w
WHERE m.objective = 'inspeccion'
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND w.status = 'PENDING'
  AND NOT EXISTS (
      SELECT 1 FROM movement_work_order mw 
      WHERE mw.movement_id = m.movement_id
  )
LIMIT 5 -- Distribute among available movements
ON CONFLICT DO NOTHING;

-- Link Diagnoses to Diagnosis movements
INSERT INTO movement_diagnosis (movement_id, diagnosis_id)
SELECT m.movement_id, d.diagnosis_id
FROM movement m, diagnosis_visit d
WHERE m.objective = 'diagnostico'
  AND m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND NOT EXISTS (
      SELECT 1 FROM movement_diagnosis md 
      WHERE md.movement_id = m.movement_id
  )
LIMIT 5
ON CONFLICT DO NOTHING;


-- 4. BACKFILL GPS POINTS (Simulated Data)
-- Add a default start point for anyone missing GPS data
INSERT INTO movement_gps_point (movement_id, latitude, longitude, recorded_at)
SELECT m.movement_id, 11.2000, -72.5000, m.start_date
FROM movement m
WHERE m.vehicle_info != 'Nissan Frontier - Placa CMD-123'
  AND NOT EXISTS (
      SELECT 1 FROM movement_gps_point mg 
      WHERE mg.movement_id = m.movement_id
  );
