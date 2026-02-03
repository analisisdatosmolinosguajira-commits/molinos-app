
-- Populate ONLY Movement Complementary Tables (Relations)
-- Focus: Rich relationships (One movement -> Multiple Communities/People)

-- 1. Create a Complex Movement (The "Base" for our relations)
INSERT INTO movement (start_date, objective, vehicle_info, notes)
VALUES (NOW(), 'mixto', 'Nissan Frontier - Placa CMD-123', 'Ruta de Mantenimiento Integral Guajira Norte')
ON CONFLICT DO NOTHING;

-- 2. Populate movement_community (Multiparada: 3 Comunidades en una ruta)
-- Requires communities to exist. Linking existing ones.
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123'
  AND c.name IN ('Comunidad El Viento', 'Comunidad San Jose', 'Comunidad La Guajira Central')
ON CONFLICT DO NOTHING;

-- 3. Populate movement_person (Full Crew: Conductor + Técnico + Social)
-- Requires persons to exist.
INSERT INTO movement_person (movement_id, person_id, role, crew_id)
SELECT m.movement_id, p.person_id, 'Conductor', NULL
FROM movement m, person p
WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123' AND p.role = 'Conductor'
ON CONFLICT DO NOTHING;

INSERT INTO movement_person (movement_id, person_id, role, crew_id)
SELECT m.movement_id, p.person_id, 'Tecnico Principal', cr.crew_id
FROM movement m, person p, crew cr
WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123' 
  AND p.role = 'Técnico' 
  AND cr.name = 'Cuadrilla Alpha'
ON CONFLICT DO NOTHING;

INSERT INTO movement_person (movement_id, person_id, role, crew_id)
SELECT m.movement_id, p.person_id, 'Gestor Social', NULL
FROM movement m, person p
WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123' AND p.role = 'Coordinador'
ON CONFLICT DO NOTHING;

-- 4. Populate movement_work_order (Multiple Orders in one trip)
INSERT INTO movement_work_order (movement_id, work_order_id)
SELECT m.movement_id, w.work_order_id
FROM movement m, work_order w
WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123'
  AND w.status = 'PENDING'
LIMIT 2 -- Assign up to 2 pending orders
ON CONFLICT DO NOTHING;

-- 5. Populate movement_gps_point (Trace the route)
INSERT INTO movement_gps_point (movement_id, latitude, longitude, recorded_at)
SELECT m.movement_id, 11.3000, -72.1000, NOW() - INTERVAL '4 hours' FROM movement m WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123'
UNION ALL
SELECT m.movement_id, 11.3500, -72.1500, NOW() - INTERVAL '3 hours' FROM movement m WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123'
UNION ALL
SELECT m.movement_id, 11.4000, -72.2000, NOW() - INTERVAL '2 hours' FROM movement m WHERE m.vehicle_info = 'Nissan Frontier - Placa CMD-123';
