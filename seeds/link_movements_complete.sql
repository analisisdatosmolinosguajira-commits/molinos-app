
-- Script para poblar tablas complementarias de 'movement'
-- Asumiendo que ya existen los Movements creados anteriormente (inspeccion, diagnostico, concertacion, mixto)

-- 1. ASEGURAR DATOS REFERENCIADOS (Dependencias)
-- 1. ENSURE DEPENDENCIES (Insert if not exist)
-- Mill: Usar community_name en lugar de community_id segun servicio
INSERT INTO mill (code, name, community_name, status)
VALUES ('M-101', 'Molino Viento Fuerte', 'Comunidad El Viento', 'Active')
ON CONFLICT (code) DO NOTHING; -- Asumiendo code es unique

-- Insertar Work Order
INSERT INTO work_order (code, description, status, mill_id, priority)
SELECT 'WO-2024-001', 'Reparación de eje principal', 'PENDING', m.mill_id, 'HIGH'
FROM mill m WHERE m.code = 'M-101'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insertar Diagnosis
INSERT INTO diagnosis_visit (visit_date, status, mill_id, notes)
SELECT NOW(), 'COMPLETED', m.mill_id, 'Diagnóstico preliminar realizado'
FROM mill m WHERE m.code = 'M-101'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insertar Concertation
INSERT INTO community_concertation (meeting_date, status, community_id, topic)
SELECT NOW(), 'ACTIVA', c.community_id, 'Acuerdo de mantenimiento anual'
FROM community c WHERE c.name = 'Comunidad San Jose'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insertar Manufacturing Order
INSERT INTO manufacturing_order (code, status, start_date)
VALUES ('MO-2024-500', 'IN_PROGRESS', NOW())
ON CONFLICT DO NOTHING;


-- 2. ENLAZAR TABLAS COMPLEMENTARIAS (Usando subqueries para IDs dinámicos)

-- A. Movement <-> Work Order (Enlazar movimiento 'inspeccion' con la WO)
INSERT INTO movement_work_order (movement_id, work_order_id)
SELECT m.movement_id, w.work_order_id
FROM movement m, work_order w
WHERE m.objective = 'inspeccion' AND w.code = 'WO-2024-001'
ON CONFLICT DO NOTHING;

-- B. Movement <-> Diagnosis (Enlazar movimiento 'diagnostico' con el Diagnosis)
INSERT INTO movement_diagnosis (movement_id, diagnosis_id)
SELECT m.movement_id, d.diagnosis_id
FROM movement m, diagnosis_visit d
WHERE m.objective = 'diagnostico' AND d.notes LIKE '%Diagnóstico preliminar%'
LIMIT 1
ON CONFLICT DO NOTHING;

-- C. Movement <-> Concertation (Enlazar movimiento 'concertacion' con la Concertation)
INSERT INTO movement_concertation (movement_id, concertation_id)
SELECT m.movement_id, c.concertation_id
FROM movement m, community_concertation c
WHERE m.objective = 'concertacion' AND c.topic LIKE '%Acuerdo%'
ON CONFLICT DO NOTHING;

-- D. Movement <-> Manufacturing Order (Enlazar movimiento 'mixto' con MO)
INSERT INTO movement_manufacturing_order (movement_id, mo_id)
SELECT m.movement_id, mo.mo_id
FROM movement m, manufacturing_order mo
WHERE m.objective = 'mixto' AND mo.code = 'MO-2024-500'
ON CONFLICT DO NOTHING;

-- E. Movement <-> GPS Points (Simular ruta para 'inspeccion')
INSERT INTO movement_gps_point (movement_id, latitude, longitude, recorded_at)
SELECT m.movement_id, 11.234567, -72.567890, NOW() - INTERVAL '2 hours'
FROM movement m WHERE m.objective = 'inspeccion'
UNION ALL
SELECT m.movement_id, 11.235567, -72.568890, NOW() - INTERVAL '1 hour'
FROM movement m WHERE m.objective = 'inspeccion'
UNION ALL
SELECT m.movement_id, 11.236567, -72.569890, NOW()
FROM movement m WHERE m.objective = 'inspeccion';

-- F. Movement <-> Person (Asegurar más personal en 'mixto')
INSERT INTO movement_person (movement_id, person_id, role)
SELECT m.movement_id, p.person_id, 'Logistico'
FROM movement m, person p
WHERE m.objective = 'mixto' AND p.first_name = 'Juan'
ON CONFLICT DO NOTHING;

