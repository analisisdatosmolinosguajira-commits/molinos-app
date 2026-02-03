-- Audit Script to Verify UI vs DB Counts
-- Run this in your Supabase SQL Editor to see the exact numbers.

DO $$
DECLARE
    active_movements INTEGER;
    closed_movements INTEGER;
    active_work_orders INTEGER;
    active_diagnoses INTEGER;
    active_concertations INTEGER;
BEGIN
    RAISE NOTICE '--- INICIO DE AUDITORIA ---';

    -- 1. Movimientos (Active = end_date IS NULL)
    SELECT COUNT(*) INTO active_movements FROM movement WHERE end_date IS NULL;
    SELECT COUNT(*) INTO closed_movements FROM movement WHERE end_date IS NOT NULL;
    
    RAISE NOTICE 'Movimientos Activos (Sin fecha cierre): %', active_movements;
    RAISE NOTICE 'Movimientos Cerrados (Con fecha cierre): %', closed_movements;

    -- 2. Ordenes de Trabajo (Active = status != 'COMPLETED')
    SELECT COUNT(*) INTO active_work_orders FROM work_order WHERE status != 'COMPLETED';
    RAISE NOTICE 'Ordenes de Trabajo Activas: %', active_work_orders;

    -- 3. Diagnosticos (Active = status != 'COMPLETED')
    SELECT COUNT(*) INTO active_diagnoses FROM diagnosis_visit WHERE status != 'COMPLETED';
    RAISE NOTICE 'Diagnosticos Activos: %', active_diagnoses;

    -- 4. Concertaciones (Active = status = 'ACTIVA')
    SELECT COUNT(*) INTO active_concertations FROM community_concertation WHERE status = 'ACTIVA';
    RAISE NOTICE 'Concertaciones Activas: %', active_concertations;

    RAISE NOTICE '-------------------------------------------';
    RAISE NOTICE 'TOTAL VISITAS ACTIVAS EN UI DEBERIAN SER: %', (active_movements + active_work_orders + active_diagnoses + active_concertations);
    RAISE NOTICE '--- FIN DE AUDITORIA ---';
END $$;
