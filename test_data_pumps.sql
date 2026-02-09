-- =====================================================
-- Datos Sintéticos: Bombas para Testing
-- =====================================================
-- Este archivo contiene 5 bombas de ejemplo para probar
-- la funcionalidad de instalación de bombas
-- =====================================================

-- First, let's check what pumps already exist
-- SELECT * FROM pump ORDER BY pump_id LIMIT 10;

-- Insert 5 synthetic pumps with almacenada status for testing
INSERT INTO pump (model, serial_number, origin, status, storage_location, created_at)
VALUES 
    -- Pump 1: Ready to install
    ('Bomba Manual Tipo A', 'BMA-2024-001', 'nueva', 'almacenada', 'Almacén Central - Riohacha', NOW()),
    
    -- Pump 2: Ready to install
    ('Bomba Manual Tipo B', 'BMB-2024-002', 'nueva', 'almacenada', 'Almacén Central - Riohacha', NOW()),
    
    -- Pump 3: Ready to install
    ('Bomba Manual Premium', 'BMP-2024-003', 'fabricada', 'almacenada', 'Taller de Fabricación', NOW()),
    
    -- Pump 4: Installed (for comparison)
    ('Bomba Manual Tipo A', 'BMA-2023-015', 'nueva', 'instalada', NULL, NOW() - INTERVAL '6 months'),
    
    -- Pump 5: Ready to install
    ('Bomba Manual Estándar', 'BME-2024-005', 'nueva', 'almacenada', 'Almacén Central - Riohacha', NOW())

ON CONFLICT DO NOTHING;

-- Verify the insertions
SELECT 
    pump_id,
    model,
    serial_number,
    status,
    storage_location,
    created_at
FROM pump
WHERE serial_number LIKE '%-2024-%' OR serial_number LIKE 'BMA-2023-015'
ORDER BY created_at DESC;

-- =====================================================
-- Expected Output:
-- =====================================================
-- You should see 5 pumps:
-- - 4 with status 'almacenada' (available for installation)
-- - 1 with status 'instalada' (for comparison)
--
-- These pumps can now be selected in the Install Pump modal
-- =====================================================
