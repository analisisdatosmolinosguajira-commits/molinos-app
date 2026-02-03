
-- Script de Depuración para Work Orders
-- 1. Verificar qué movements de inspección existen
-- 2. Verificar qué work orders pendientes existen
-- 3. Intentar el join manualmente para ver si cruzan
-- 4. Si cruzan, insertarlos.

DO $$
DECLARE
    found_movements INT;
    found_orders INT;
    matches INT;
    inserted INT;
BEGIN
    -- 1. Contar Movimientos Candidatos
    SELECT COUNT(*) INTO found_movements 
    FROM movement m
    WHERE m.objective = 'inspeccion'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123');
      
    RAISE NOTICE 'Movimientos de Inspección encontrados: %', found_movements;
    
    -- 2. Contar Work Orders Candidatas
    SELECT COUNT(*) INTO found_orders 
    FROM work_order w
    WHERE w.status = 'PENDING';
    
    RAISE NOTICE 'Work Orders Pendientes encontradas: %', found_orders;

    -- 3. Ver si cruzan (Producto Cartesiano Controlado)
    SELECT COUNT(*) INTO matches
    FROM movement m, work_order w
    WHERE m.objective = 'inspeccion'
      AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
      AND w.status = 'PENDING';
      
    RAISE NOTICE 'Coincidencias potenciales (Join): %', matches;

    -- 4. Insercion Forzada (Si hay coincidencias)
    IF matches > 0 THEN
        INSERT INTO movement_work_order (movement_id, work_order_id)
        SELECT m.movement_id, w.work_order_id
        FROM movement m, work_order w
        WHERE m.objective = 'inspeccion'
          AND (m.vehicle_info IS DISTINCT FROM 'Nissan Frontier - Placa CMD-123')
          AND w.status = 'PENDING'
          -- Asegurar que no insertamos duplicados
          AND NOT EXISTS (
              SELECT 1 FROM movement_work_order mw 
              WHERE mw.movement_id = m.movement_id AND mw.work_order_id = w.work_order_id
          )
        -- Limitar para no saturar 1 movimiento con todas las ordenes si hay pocos movimientos
        LIMIT 5; 
        
        GET DIAGNOSTICS inserted = ROW_COUNT;
        RAISE NOTICE 'Filas insertadas en movement_work_order: %', inserted;
    ELSE
        RAISE NOTICE 'No hubo coincidencias para insertar.';
    END IF;

END $$;
