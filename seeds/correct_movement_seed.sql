
-- Limpieza profunda si es necesario (TENER CUIDADO EN PRODUCCIÓN)
-- DELETE FROM movement_person;
-- DELETE FROM movement_community;
-- DELETE FROM movement;

-- 1. Insertar Personas Clave
-- Ajuste: Agregar document_id obligatorio
INSERT INTO person (first_name, last_name, role, document_id) VALUES 
('Luis', 'Chofer', 'Conductor', '10001'),
('Maria', 'Tecnica', 'Técnico', '10002'),
('Juan', 'Social', 'Promotor', '10003')
ON CONFLICT DO NOTHING;

-- 2. Insertar una Comunidad de prueba
-- Ajuste: Remover municipality y department que no existen
INSERT INTO community (name) VALUES 
('Comunidad El Viento'),
('Comunidad San Jose')
ON CONFLICT (name) DO NOTHING; -- Asume que 'name' es unique o similar

-- 3. Insertar Cuadrilla
-- Ajuste: Remover 'type' que no existe
INSERT INTO crew (name) VALUES ('Cuadrilla Alpha') ON CONFLICT DO NOTHING;

-- 4. INSERT MOVEMENTS
-- objective in: 'inspeccion', 'diagnostico', 'concertacion', 'mixto'
INSERT INTO movement (start_date, end_date, objective, vehicle_info, notes) VALUES
(NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'inspeccion', 'Toyota Hilux PL-404', 'Ruta de inspección general Uribia'),
(NOW() - INTERVAL '1 day', NULL, 'diagnostico', 'Camioneta Ford F-150', 'Diagnóstico tecnico en molinos zona norte'),
(NOW(), NULL, 'concertacion', 'Renault Duster', 'Reunión con líderes comunitarios'),
(NOW() + INTERVAL '1 day', NULL, 'mixto', 'Moto Yamaha', 'Avanzada logística');

-- 5. RELACIONAR MOVIMIENTOS (Obteniendo IDs dinámicamente para evitar errores de hardcoding)
-- Relacionar el primer movimiento con Comunidad El Viento
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.objective = 'inspeccion' AND c.name = 'Comunidad El Viento'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Relacionar el segundo movimiento con Comunidad San Jose
INSERT INTO movement_community (movement_id, community_id)
SELECT m.movement_id, c.community_id
FROM movement m, community c
WHERE m.objective = 'diagnostico' AND c.name = 'Comunidad San Jose'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Relacionar Movimiento con Personas (Conductor)
INSERT INTO movement_person (movement_id, person_id, role)
SELECT m.movement_id, p.person_id, 'Conductor'
FROM movement m, person p
WHERE m.objective = 'inspeccion' AND p.first_name = 'Luis'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Relacionar Movimiento con Cuadrilla Y Persona (Técnico encargado)
INSERT INTO movement_person (movement_id, person_id, crew_id, role)
SELECT m.movement_id, p.person_id, cr.crew_id, 'Equipo Tecnico'
FROM movement m, crew cr, person p
WHERE m.objective = 'diagnostico' 
  AND cr.name = 'Cuadrilla Alpha'
  AND p.first_name = 'Maria'
LIMIT 1
ON CONFLICT DO NOTHING;

