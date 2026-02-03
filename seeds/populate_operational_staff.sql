-- =====================================================
-- POPULATE OPERATIONAL STAFF DATA
-- Execute this MANUALLY in Supabase SQL Editor
-- =====================================================

BEGIN;

-- Clear any previous test data first
DELETE FROM person WHERE document_id IN (
    'V-11223344', 'V-22334455', 'V-33445566', 'V-44556677', 'V-55667788',
    'V-66778899', 'V-77889900', 'V-88990011', 'V-99001122',
    'V-10111213', 'V-11121314', 'V-12131415', 'V-13141516', 'V-14151617',
    'V-15161718', 'V-16171819', 'V-17181920', 'V-18192021'
);


-- Step 1: Insert new operational staff members with valid role_id

INSERT INTO person (first_name, last_name, document_id, phone, role_id, active, specialty)
VALUES 
('Alberto', 'Vega', 'V-11223344', '0414-1112233', 1, true, 'Reparación de Molinos'),
('Patricia', 'Mora', 'V-22334455', '0424-2223344', 1, true, 'Mantenimiento Eléctrico'),
('Ricardo', 'Duarte', 'V-33445566', '0412-3334455', 1, true, 'Sistemas Hidráulicos'),
('Sofia', 'Paredes', 'V-44556677', '0416-4445566', 1, true, 'Mecánica General'),
('Diego', 'Campos', 'V-55667788', '0426-5556677', 1, true, 'Electrónica');

-- INGENIEROS (role_id = 2) - 4 personas
INSERT INTO person (first_name, last_name, document_id, phone, role_id, active, specialty)
VALUES 
('Gabriel', 'Torres', 'V-66778899', '0414-6667788', 2, true, 'Ingeniería Mecánica'),
('Valentina', 'Suarez', 'V-77889900', '0424-7778899', 2, true, 'Ingeniería Eléctrica'),
('Andres', 'Rios', 'V-88990011', '0412-8889900', 2, true, 'Ingeniería Civil'),
('Camila', 'Ortiz', 'V-99001122', '0416-9990011', 2, true, 'Ingeniería Ambiental');

-- OPERARIOS (role_id = 3) - 5 personas
INSERT INTO person (first_name, last_name, document_id, phone, role_id, active, specialty)
VALUES 
('Fernando', 'Luna', 'V-10111213', '0414-1011121', 3, true, 'Asistente de Campo'),
('Isabella', 'Cruz', 'V-11121314', '0424-1112131', 3, true, 'Logística de Materiales'),
('Manuel', 'Vargas', 'V-12131415', '0412-1213141', 3, true, 'Conductor'),
('Daniela', 'Reyes', 'V-13141516', '0416-1314151', 3, true, 'Apoyo Operativo'),
('Santiago', 'Molina', 'V-14151617', '0426-1415161', 3, true, 'Almacenista');

-- SUPERVISORES (role_id = 4) - 4 personas
INSERT INTO person (first_name, last_name, document_id, phone, role_id, active, specialty)
VALUES 
('Victoria', 'Herrera', 'V-15161718', '0414-1516171', 4, true, 'Supervisión de Obras'),
('Nicolas', 'Navarro', 'V-16171819', '0424-1617181', 4, true, 'Control de Calidad'),
('Mariana', 'Parra', 'V-17181920', '0412-1718192', 4, true, 'Coordinación Logística'),
('Alejandro', 'Medina', 'V-18192021', '0416-1819203', 4, true, 'Jefe de Equipo');

COMMIT;

-- Step 2: Verify the insertion
SELECT 
    pr.name as rol,
    COUNT(*) as cantidad
FROM person p
INNER JOIN person_role pr ON p.role_id = pr.role_id
WHERE pr.name != 'Miembro de Comunidad'
GROUP BY pr.name
ORDER BY pr.name;

-- Expected output:
-- Ingeniero: 4+
-- Operario: 5+
-- Supervisor: 4+
-- Tecnico: 5+
