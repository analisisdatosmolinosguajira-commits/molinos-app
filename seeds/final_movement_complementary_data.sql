
-- Script Final de Datos Complementarios para Movement
-- Basado en el esquema compilado y validado.

-- ==========================================
-- 1. DATOS MAESTROS Y DEPENDENCIAS (Referenced Data)
-- ==========================================

-- A. COMUNIDADES (Solo campo name validado)
INSERT INTO community (name) VALUES 
('Comunidad El Viento'),
('Comunidad San Jose'),
('Comunidad La Guajira Central')
ON CONFLICT (name) DO NOTHING;

-- B. PERSONAS (first_name, last_name, role, document_id - NOT NULL)
INSERT INTO person (first_name, last_name, role, document_id) VALUES 
('Carlos', 'Tecnico', 'Técnico', 'DOC-001'),
('Ana', 'Logistica', 'Coordinador', 'DOC-002'),
('Pedro', 'Chofer', 'Conductor', 'DOC-003')
ON CONFLICT DO NOTHING;

-- C. CUADRILLAS (Solo campo name validado)
INSERT INTO crew (name) VALUES 
('Cuadrilla Alpha'),
('Cuadrilla Beta')
ON CONFLICT DO NOTHING;

-- D. MOLINOS (Usando community_name en lugar de ID)
INSERT INTO mill (code, name, community_name, status) VALUES 
('M-500', 'Molino Norte', 'Comunidad El Viento', 'Active'),
('M-501', 'Molino Sur', 'Comunidad San Jose', 'Inefficient')
ON CONFLICT (code) DO NOTHING;

-- E. WORK ORDERS (Para Inspecciones/Reparaciones)
INSERT INTO work_order (code, description, status, mill_id, priority)
SELECT 'WO-GEN-001', 'Mantenimiento General', 'PENDING', m.mill_id, 'MEDIUM'
FROM mill m WHERE m.code = 'M-500'
ON CONFLICT DO NOTHING;

-- F. DIAGNOSTICOS
INSERT INTO diagnosis_visit (visit_date, status, mill_id, notes)
SELECT NOW(), 'COMPLETED', m.mill_id, 'Diagnóstico de eficiencia baja'
FROM mill m WHERE m.code = 'M-501'
ON CONFLICT DO NOTHING;

-- G. CONCERTACIONES
INSERT INTO community_concertation (meeting_date, status, community_id, topic)
SELECT NOW(), 'ACTIVA', c.community_id, 'Acuerdo de uso de agua'
FROM community c WHERE c.name = 'Comunidad San Jose'
ON CONFLICT DO NOTHING;

-- H. MANUFACTURING ORDERS
INSERT INTO manufacturing_order (code, status, start_date)
VALUES ('MO-FAB-100', 'IN_PROGRESS', NOW())
ON CONFLICT DO NOTHING;


-- ==========================================
-- 2. MOVIMIENTOS (Constraint: objective IN ('inspeccion', 'diagnostico', 'concertacion', 'mixto'))
-- ==========================================

INSERT INTO movement (start_date, end_date, objective, vehicle_info, notes) VALUES
(NOW(), NULL, 'inspeccion', 'Camioneta 4x4 PL-999', 'Inspección técnica anual'),
(NOW() - INTERVAL '1 day', NOW(), 'diagnostico', 'Moto XTZ-250', 'Visita rápida por reporte de fallo'),
(NOW() + INTERVAL '2 days', NULL, 'concertacion', 'Duster', 'Reunión semestral'),
(NOW(), NULL, 'mixto', 'Camión de Carga', 'Transporte de repuestos y personal')
ON CONFLICT DO NOTHING; -- Asumiendo serial, no habrá conflicto real a menos que se fuerce ID


-- ==========================================
-- 3. TABLAS COMPLEMENTARIAS (Relation Links)
-- ==========================================

-- A. MOVEMENT_COMMUNITY (Relacionar movimientos con comunidades)
-- Relacionar 'inspeccion' con 'Comunidad El Viento'
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.objective = 'inspeccion' AND m.vehicle_info = 'Camioneta 4x4 PL-999'
  AND c.name = 'Comunidad El Viento'
ON CONFLICT DO NOTHING;

-- B. MOVEMENT_PERSON (Asignar personal y cuadrillas)
-- Asignar Chofer a la inspección
INSERT INTO movement_person (movement_id, person_id, role)
SELECT m.movement_id, p.person_id, 'Conductor'
FROM movement m, person p
WHERE m.objective = 'inspeccion' AND m.vehicle_info = 'Camioneta 4x4 PL-999'
  AND p.first_name = 'Pedro'
ON CONFLICT DO NOTHING;

-- Asignar Técnico (Carlos) y Cuadrilla (Alpha) al diagnóstico
INSERT INTO movement_person (movement_id, person_id, crew_id, role)
SELECT m.movement_id, p.person_id, cr.crew_id, 'Lider Tecnico'
FROM movement m, crew cr, person p
WHERE m.objective = 'diagnostico' AND m.vehicle_info = 'Moto XTZ-250'
  AND cr.name = 'Cuadrilla Alpha' AND p.first_name = 'Carlos'
ON CONFLICT DO NOTHING;

-- C. MOVEMENT_WORK_ORDER
INSERT INTO movement_work_order (movement_id, work_order_id)
SELECT m.movement_id, w.work_order_id
FROM movement m, work_order w
WHERE m.objective = 'inspeccion' AND m.vehicle_info = 'Camioneta 4x4 PL-999'
  AND w.code = 'WO-GEN-001'
ON CONFLICT DO NOTHING;

-- D. MOVEMENT_DIAGNOSIS
INSERT INTO movement_diagnosis (movement_id, diagnosis_id)
SELECT m.movement_id, d.diagnosis_id
FROM movement m, diagnosis_visit d
WHERE m.objective = 'diagnostico' AND m.vehicle_info = 'Moto XTZ-250'
  AND d.notes = 'Diagnóstico de eficiencia baja'
ON CONFLICT DO NOTHING;

-- E. MOVEMENT_CONCERTATION
INSERT INTO movement_concertation (movement_id, concertation_id)
SELECT m.movement_id, c.concertation_id
FROM movement m, community_concertation c
WHERE m.objective = 'concertacion' 
  AND c.topic = 'Acuerdo de uso de agua'
ON CONFLICT DO NOTHING;

-- F. MOVEMENT_MANUFACTURING_ORDER
INSERT INTO movement_manufacturing_order (movement_id, mo_id)
SELECT m.movement_id, mo.mo_id
FROM movement m, manufacturing_order mo
WHERE m.objective = 'mixto' AND m.vehicle_info = 'Camión de Carga'
  AND mo.code = 'MO-FAB-100'
ON CONFLICT DO NOTHING;

-- G. MOVEMENT_GPS_POINT (Tracking data)
INSERT INTO movement_gps_point (movement_id, latitude, longitude, recorded_at)
SELECT m.movement_id, 11.5, -72.8, NOW()
FROM movement m 
WHERE m.objective = 'inspeccion' AND m.vehicle_info = 'Camioneta 4x4 PL-999';
