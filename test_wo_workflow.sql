-- Test Data for Work Order Workflow Testing
-- This creates 5 different scenarios to test all features

-- First, let's ensure we have some stock to work with
-- Update stock levels for testing
UPDATE piece_stock SET current_stock = 50 WHERE piece_id IN (1, 2, 3, 4);
UPDATE material_stock SET quantity_available = 100 WHERE material_id IN (1, 2, 3, 4);
UPDATE tool_stock SET quantity_available = 10 WHERE tool_id IN (1, 2, 3);

-- ====================================================================================
-- TEST CASE 1: PENDING WO with SUFFICIENT STOCK (Can Start)
-- ====================================================================================
INSERT INTO work_order (
    mill_id, crew_id, type, priority, status, 
    description, notes, scheduled_date
) VALUES (
    1, 17, 'preventivo', 'MEDIUM', 'PENDING',
    'Test 1: Mantenimiento Preventivo - Stock Suficiente',
    'Este WO tiene todos los recursos disponibles y debería mostrar botón "Iniciar Orden"',
    CURRENT_DATE + INTERVAL '5 days'
) RETURNING work_order_id;

-- Get the ID (in real usage, you'd capture this)
-- For simplicity, we'll use a subquery approach
DO $$
DECLARE
    wo_id bigint;
BEGIN
    SELECT work_order_id INTO wo_id FROM work_order 
    WHERE description = 'Test 1: Mantenimiento Preventivo - Stock Suficiente' 
    ORDER BY created_at DESC LIMIT 1;

    -- Add pieces (sufficient stock)
    INSERT INTO work_order_piece (work_order_id, piece_id, quantity_used)
    VALUES 
        (wo_id, 1, 5),
        (wo_id, 2, 3);

    -- Add materials (sufficient stock)
    INSERT INTO work_order_material (work_order_id, material_id, quantity_used)
    VALUES 
        (wo_id, 1, 10),
        (wo_id, 2, 5);

    -- Add tools
    INSERT INTO work_order_tool_reservation (work_order_id, tool_id, quantity)
    VALUES 
        (wo_id, 1, 2);

    -- Add safety equipment
    INSERT INTO work_order_safety_requirement (work_order_id, safety_id, quantity_required)
    VALUES 
        (wo_id, 1, 2),
        (wo_id, 2, 2);
END $$;

-- ====================================================================================
-- TEST CASE 2: PENDING WO with INSUFFICIENT STOCK (Cannot Start)
-- ====================================================================================
INSERT INTO work_order (
    mill_id, crew_id, type, priority, status, 
    description, notes, scheduled_date
) VALUES (
    1, 17, 'correctivo', 'HIGH', 'PENDING',
    'Test 2: Reparación Urgente - Stock Insuficiente',
    'Este WO requiere más stock del disponible. Debería mostrar advertencia de recursos faltantes.',
    CURRENT_DATE + INTERVAL '2 days'
);

DO $$
DECLARE
    wo_id bigint;
BEGIN
    SELECT work_order_id INTO wo_id FROM work_order 
    WHERE description = 'Test 2: Reparación Urgente - Stock Insuficiente' 
    ORDER BY created_at DESC LIMIT 1;

    -- Add pieces (EXCESSIVE quantity - more than stock)
    INSERT INTO work_order_piece (work_order_id, piece_id, quantity_used)
    VALUES 
        (wo_id, 3, 100);  -- Stock only has 50

    -- Add materials (EXCESSIVE)
    INSERT INTO work_order_material (work_order_id, material_id, quantity_used)
    VALUES 
        (wo_id, 3, 150);  -- Stock only has 100

    -- This will trigger resource_requirements creation via trigger
    -- The UI should show red indicators and block "Iniciar Orden"
END $$;

-- ====================================================================================
-- TEST CASE 3: IN_PROGRESS WO with pump removal operation
-- ====================================================================================
INSERT INTO work_order (
    mill_id, crew_id, type, priority, status, 
    description, notes, scheduled_date, start_date,
    pump_id_to_remove, pump_installation_notes
) VALUES (
    1, 17, 'correctivo', 'CRITICAL', 'IN_PROGRESS',
    'Test 3: Remoción de Bomba Dañada',
    'WO en progreso con bomba a remover. Debería mostrar botón "Completar Orden"',
    CURRENT_DATE,
    CURRENT_DATE,
    (SELECT pump_id FROM pump WHERE status = 'instalada' LIMIT 1),
    'Bomba presenta fallas en el motor. Se removerá para reparación en taller.'
);

DO $$
DECLARE
    wo_id bigint;
BEGIN
    SELECT work_order_id INTO wo_id FROM work_order 
    WHERE description = 'Test 3: Remoción de Bomba Dañada' 
    ORDER BY created_at DESC LIMIT 1;

    -- Add some materials
    INSERT INTO work_order_material (work_order_id, material_id, quantity_used)
    VALUES (wo_id, 1, 5);

    -- Add component status (required for completion)
    INSERT INTO work_order_component_status (work_order_id, component_id, status, observation)
    SELECT 
        wo_id,
        component_id,
        'REQUIERE_REVISION',
        'Bomba presenta desgaste'
    FROM mill_has_component
    WHERE mill_id = 1
    LIMIT 2;
END $$;

-- ====================================================================================
-- TEST CASE 4: PENDING WO with pump installation operation
-- ====================================================================================
INSERT INTO work_order (
    mill_id, crew_id, type, priority, status, 
    description, notes, scheduled_date,
    pump_id_to_install, pump_installation_notes
) VALUES (
    1, 17, 'mejora', 'LOW', 'PENDING',
    'Test 4: Instalación de Bomba Nueva',
    'WO para instalar bomba desde almacén. Stock suficiente.',
    CURRENT_DATE + INTERVAL '7 days',
    (SELECT pump_id FROM pump WHERE status = 'almacenada' LIMIT 1),
    'Instalación de bomba nueva de almacén como mejora del sistema.'
);

DO $$
DECLARE
    wo_id bigint;
BEGIN
    SELECT work_order_id INTO wo_id FROM work_order 
    WHERE description = 'Test 4: Instalación de Bomba Nueva' 
    ORDER BY created_at DESC LIMIT 1;

    -- Minimal resources
    INSERT INTO work_order_material (work_order_id, material_id, quantity_used)
    VALUES (wo_id, 2, 3);

    INSERT INTO work_order_safety_requirement (work_order_id, safety_id, quantity_required)
    VALUES (wo_id, 1, 2);
END $$;

-- ====================================================================================
-- TEST CASE 5: COMPLETED WO (for reference)
-- ====================================================================================
INSERT INTO work_order (
    mill_id, crew_id, type, priority, status, 
    description, notes, scheduled_date, start_date, end_date
) VALUES (
    1, 17, 'preventivo', 'MEDIUM', 'COMPLETED',
    'Test 5: Mantenimiento Completado',
    'WO completada como referencia. No debería mostrar botones de transición.',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '9 days',
    CURRENT_DATE - INTERVAL '8 days'
);

DO $$
DECLARE
    wo_id bigint;
BEGIN
    SELECT work_order_id INTO wo_id FROM work_order 
    WHERE description = 'Test 5: Mantenimiento Completado' 
    ORDER BY created_at DESC LIMIT 1;

    -- Add historical data
    INSERT INTO work_order_piece (work_order_id, piece_id, quantity_used)
    VALUES (wo_id, 1, 2);

    INSERT INTO work_order_material (work_order_id, material_id, quantity_used)
    VALUES (wo_id, 1, 8);

    -- Add component status (already reported)
    INSERT INTO work_order_component_status (work_order_id, component_id, status, observation)
    SELECT 
        wo_id,
        component_id,
        'FUNCIONAL',
        'Revisado y funcional'
    FROM mill_has_component
    WHERE mill_id = 1
    LIMIT 2;
END $$;

-- Summary of test cases
SELECT 
    work_order_id,
    status,
    priority,
    description,
    CASE 
        WHEN pump_id_to_install IS NOT NULL THEN 'Sí (Instalar)'
        WHEN pump_id_to_remove IS NOT NULL THEN 'Sí (Remover)'
        ELSE 'No'
    END as pump_operation
FROM work_order
WHERE description LIKE 'Test %'
ORDER BY work_order_id;
