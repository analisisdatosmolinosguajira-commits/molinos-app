-- Backfill role_id FK for all people who have legacy text role
-- This updates person.role_id to match person_role based on the text in person.role

-- Step 1: Update people with 'Miembro de Comunidad' text to have correct FK
UPDATE person
SET role_id = (SELECT role_id FROM person_role WHERE name = 'Miembro de Comunidad')
WHERE role = 'Miembro de Comunidad' AND role_id IS NULL;

-- Step 2: Update people with 'Técnico' or 'Tecnico' text
UPDATE person
SET role_id = (SELECT role_id FROM person_role WHERE name = 'Tecnico')
WHERE (role = 'Técnico' OR role = 'Tecnico') AND role_id IS NULL;

-- Step 3: Update people with 'Ingeniero' text
UPDATE person
SET role_id = (SELECT role_id FROM person_role WHERE name = 'Ingeniero')
WHERE role = 'Ingeniero' AND role_id IS NULL;

-- Step 4: Update people with 'Operario' text
UPDATE person
SET role_id = (SELECT role_id FROM person_role WHERE name = 'Operario')
WHERE role = 'Operario' AND role_id IS NULL;

-- Step 5: Update people with 'Supervisor' text
UPDATE person
SET role_id = (SELECT role_id FROM person_role WHERE name = 'Supervisor')
WHERE role = 'Supervisor' AND role_id IS NULL;

-- Verification Query
SELECT 
    pr.name as role_name,
    COUNT(*) as count
FROM person p
LEFT JOIN person_role pr ON p.role_id = pr.role_id
GROUP BY pr.name
ORDER BY count DESC;

-- Show how many 'Miembro de Comunidad' we now have
SELECT COUNT(*) as miembros_de_comunidad
FROM person p
JOIN person_role pr ON p.role_id = pr.role_id
WHERE pr.name = 'Miembro de Comunidad';
