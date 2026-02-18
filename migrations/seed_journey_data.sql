-- 1. Fix Constraints
ALTER TABLE public.movement DROP CONSTRAINT IF EXISTS chk_movement_objective;
ALTER TABLE public.movement ADD CONSTRAINT chk_movement_objective 
    CHECK (objective::text = ANY (ARRAY['inspeccion'::text, 'diagnostico'::text, 'concertacion'::text, 'mixto'::text, 'logistica'::text, 'reparacion'::text]));

-- 2. Seed Data
-- Ensure Vehicles Exist
INSERT INTO public.vehicle (plate_number, make, model, vehicle_type, capacity_passengers, status)
VALUES 
    ('QWE-123', 'Toyota', 'Hilux', 'CAMIONETA', 4, 'DISPONIBLE'),
    ('ASD-456', 'Nissan', 'Frontier', 'CAMIONETA', 4, 'EN_USO'),
    ('ZXC-789', 'Renault', 'Duster', 'CAMIONETA', 4, 'MANTENIMIENTO'),
    ('RTY-567', 'Chevrolet', 'N300', 'VAN', 7, 'DISPONIBLE'),
    ('UIO-890', 'Toyota', 'Prado', 'CAMIONETA', 5, 'DISPONIBLE')
ON CONFLICT (plate_number) DO NOTHING;

-- Create Movements
-- Case A: Active Logistic Trip (In Progress)
INSERT INTO public.movement (
    objective, start_date, end_date, status, title, notes, requires_overnight, trip_manager_id
) VALUES (
    'logistica', 
    CURRENT_DATE - 2, 
    CURRENT_DATE + 2, 
    'EN_CURSO', -- Fixed to matches constraint
    'Distribución EPP Zona Alta',
    'Ruta de entrega de equipos de protección personal en comunidades de la zona alta.',
    true,
    NULL
);

-- Case B: Planned Technical Visit
INSERT INTO public.movement (
    objective, start_date, end_date, status, title, notes, requires_overnight
) VALUES (
    'diagnostico', 
    CURRENT_DATE + 3, 
    CURRENT_DATE + 5,
    'PLANIFICADO',
    'Visitas Diagnóstico Uribia',
    'Evaluación de molinos reportados con fallas en Uribia.',
    true
);

-- Case C: Completed Trip
INSERT INTO public.movement (
    objective, start_date, end_date, status, title, notes, requires_overnight, was_successful
) VALUES (
    'concertacion', 
    CURRENT_DATE - 10,
    CURRENT_DATE - 8,
    'COMPLETADO',
    'Acuerdos Jebiwan',
    'Reunión de concertación y firma de actas. Se lograron firmar todos los acuerdos.',
    false,
    true
);

-- Case D: Cancelled Trip
INSERT INTO public.movement (
    objective, start_date, end_date, status, title, notes, requires_overnight
) VALUES (
    'reparacion',
    CURRENT_DATE - 5,
    CURRENT_DATE - 5,
    'CANCELADO',
    'Reparación Emergencia',
    'Cancelado por condiciones climáticas.',
    false
);

-- Logistica Trip 2
INSERT INTO public.movement (
    objective, start_date, end_date, status, title, notes, requires_overnight
) VALUES (
    'logistica', 
    CURRENT_DATE + 7,
    CURRENT_DATE + 8,
    'PLANIFICADO',
    'Transporte Materiales Nazaret',
    'Llevar cemento y varilla para base de tanque.',
    true
);

-- 3. Assignments & Logs (For the Active Trip - Case A)
DO $$
DECLARE
    active_mov_id integer;
    vehicle_id_val integer;
BEGIN
    SELECT movement_id INTO active_mov_id FROM public.movement WHERE title = 'Distribución EPP Zona Alta' LIMIT 1;
    SELECT vehicle_id INTO vehicle_id_val FROM public.vehicle WHERE plate_number = 'ASD-456' LIMIT 1;

    -- Assign Vehicle
    IF active_mov_id IS NOT NULL AND vehicle_id_val IS NOT NULL THEN
        INSERT INTO public.movement_vehicle (movement_id, vehicle_id, departure_km)
        VALUES (active_mov_id, vehicle_id_val, 15000);
    END IF;

    -- Add Logs
    IF active_mov_id IS NOT NULL THEN
        INSERT INTO public.movement_log (movement_id, log_date, activity_type, description, incident_reported)
        VALUES 
        (active_mov_id, CURRENT_DATE - 2, 'SALIDA_CAMPO', 'Salida del centro de operaciones con carga completa.', false),
        (active_mov_id, CURRENT_DATE - 1, 'PERNOCTA', 'Pernocta en comunidad Nazaret sin novedades.', false),
        (active_mov_id, CURRENT_DATE, 'INCIDENCIA', 'Pinchazo en vía a Siapana. Reparado en sitio.', true);
    END IF;
END $$;
