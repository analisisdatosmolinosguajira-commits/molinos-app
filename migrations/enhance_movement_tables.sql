-- Migration: Enhance Movement Tables
-- Description: Adds structured vehicle management and enhances movement tracking
-- Dependencies: Requires movement, movement_person, person, and planned_activity tables to exist
-- WARNING: This migration renames movement.vehicle_info to vehicle_info_deprecated

-- ============================================================================
-- STEP 1: Add new columns to movement table for enhanced trip management
-- ============================================================================

ALTER TABLE public.movement 
    ADD COLUMN IF NOT EXISTS title varchar,
    ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'PLANIFICADO' 
        CHECK (status IN ('PLANIFICADO', 'EN_CURSO', 'COMPLETADO', 'CANCELADO')),
    ADD COLUMN IF NOT EXISTS trip_manager_id integer REFERENCES person(person_id),
    ADD COLUMN IF NOT EXISTS requires_overnight boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS was_successful boolean,
    ADD COLUMN IF NOT EXISTS issues_encountered text,
    ADD COLUMN IF NOT EXISTS trip_report_url varchar,
    ADD COLUMN IF NOT EXISTS related_activity_id integer REFERENCES planned_activity(activity_id);

COMMENT ON COLUMN public.movement.title IS 'Short descriptive title for the trip';
COMMENT ON COLUMN public.movement.status IS 'Current trip status (planned, in progress, completed, cancelled)';
COMMENT ON COLUMN public.movement.trip_manager_id IS 'Person responsible for trip logistics and coordination';
COMMENT ON COLUMN public.movement.requires_overnight IS 'Whether this trip requires overnight accommodation';
COMMENT ON COLUMN public.movement.was_successful IS 'Overall success outcome of the trip';
COMMENT ON COLUMN public.movement.trip_report_url IS 'URL to trip completion report document';
COMMENT ON COLUMN public.movement.related_activity_id IS 'Links to planned_activity if trip was created from planning';

-- ============================================================================
-- STEP 2: Add attendance tracking to movement_person
-- ============================================================================

ALTER TABLE public.movement_person
    ADD COLUMN IF NOT EXISTS confirmed_attendance boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS actual_attendance boolean,
    ADD COLUMN IF NOT EXISTS absence_reason text;

COMMENT ON COLUMN public.movement_person.confirmed_attendance IS 
    'Whether person confirmed they will attend during planning phase';
COMMENT ON COLUMN public.movement_person.actual_attendance IS 
    'Whether person actually attended the trip (null until trip starts)';
COMMENT ON COLUMN public.movement_person.absence_reason IS 
    'Reason for absence if confirmed but did not attend';

-- ============================================================================
-- STEP 3: Create vehicle table for fleet management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle (
    vehicle_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plate_number varchar UNIQUE NOT NULL,
    make varchar,
    model varchar,
    vehicle_type varchar,
    capacity_passengers integer,
    status varchar DEFAULT 'DISPONIBLE' 
        CHECK (status IN ('DISPONIBLE', 'EN_USO', 'MANTENIMIENTO', 'FUERA_DE_SERVICIO')),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.vehicle IS 
    'Fleet vehicle registry. Replaces the old vehicle_info text field with structured data.';

-- ============================================================================
-- STEP 4: Create movement_vehicle junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.movement_vehicle (
    movement_vehicle_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    movement_id integer NOT NULL REFERENCES movement(movement_id) ON DELETE CASCADE,
    vehicle_id integer NOT NULL REFERENCES vehicle(vehicle_id),
    driver_person_id integer REFERENCES person(person_id),
    departure_km integer,
    arrival_km integer,
    fuel_used_liters numeric(10,2),
    notes text,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.movement_vehicle IS 
    'Links vehicles to trips/movements. Supports multiple vehicles per trip. Tracks driver, odometer, fuel.';

-- ============================================================================
-- STEP 5: Migrate existing vehicle_info data to new structure
-- ============================================================================

DO $$
DECLARE
    movement_rec RECORD;
    new_vehicle_id integer;
    migration_count integer := 0;
BEGIN
    -- For each movement with vehicle_info, create a vehicle entry and link it
    FOR movement_rec IN 
        SELECT movement_id, vehicle_info 
        FROM movement 
        WHERE vehicle_info IS NOT NULL AND vehicle_info != ''
    LOOP
        -- Create a legacy vehicle record with the text info
        INSERT INTO vehicle (plate_number, make, notes, status)
        VALUES (
            'LEGACY-' || movement_rec.movement_id,
            'Migrado',
            'Migrado desde vehicle_info: ' || movement_rec.vehicle_info,
            'DISPONIBLE'
        )
        ON CONFLICT (plate_number) DO NOTHING
        RETURNING vehicle_id INTO new_vehicle_id;
        
        -- If conflict occurred (shouldn't happen), get the existing vehicle_id
        IF new_vehicle_id IS NULL THEN
            SELECT vehicle_id INTO new_vehicle_id
            FROM vehicle
            WHERE plate_number = 'LEGACY-' || movement_rec.movement_id;
        END IF;
        
        -- Link movement to vehicle
        INSERT INTO movement_vehicle (movement_id, vehicle_id, notes)
        VALUES (
            movement_rec.movement_id,
            new_vehicle_id,
            'Migrado automáticamente desde vehicle_info'
        )
        ON CONFLICT DO NOTHING;
        
        migration_count := migration_count + 1;
    END LOOP;
    
    IF migration_count > 0 THEN
        RAISE NOTICE 'Migrated % existing vehicle_info records to structured vehicle table', migration_count;
    ELSE
        RAISE NOTICE 'No existing vehicle_info data to migrate';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Deprecate vehicle_info column
-- ============================================================================

-- Check if column exists before renaming (idempotency)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movement' 
        AND column_name = 'vehicle_info'
    ) THEN
        ALTER TABLE public.movement 
            RENAME COLUMN vehicle_info TO vehicle_info_deprecated;
        
        RAISE NOTICE 'Renamed vehicle_info to vehicle_info_deprecated';
    ELSE
        RAISE NOTICE 'vehicle_info column already renamed or does not exist';
    END IF;
END $$;

-- Add warning comment to the deprecated column
COMMENT ON COLUMN public.movement.vehicle_info_deprecated IS 
    '❌ DEPRECATED: Use movement_vehicle junction table instead. 
    This column is kept for historical reference only. 
    All new vehicle assignments must use the vehicle and movement_vehicle tables.';

-- ============================================================================
-- STEP 7: Seed example vehicles for the fleet
-- ============================================================================

INSERT INTO vehicle (plate_number, make, model, vehicle_type, capacity_passengers, status) VALUES
    ('ABC-123', 'Toyota', 'Hilux', 'PICKUP', 5, 'DISPONIBLE'),
    ('DEF-456', 'Nissan', 'Frontier', 'PICKUP', 5, 'DISPONIBLE'),
    ('GHI-789', 'Chevrolet', 'NPR', 'TRUCK', 3, 'DISPONIBLE'),
    ('XYZ-001', 'Toyota', 'Land Cruiser', 'SUV', 7, 'DISPONIBLE')
ON CONFLICT (plate_number) DO NOTHING;

-- ============================================================================
-- STEP 8: Add indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_movement_status ON movement(status);
CREATE INDEX IF NOT EXISTS idx_movement_dates ON movement(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_movement_activity ON movement(related_activity_id);
CREATE INDEX IF NOT EXISTS idx_movement_manager ON movement(trip_manager_id);

CREATE INDEX IF NOT EXISTS idx_movement_person_attendance ON movement_person(actual_attendance);
CREATE INDEX IF NOT EXISTS idx_movement_person_confirmed ON movement_person(confirmed_attendance);

CREATE INDEX IF NOT EXISTS idx_movement_vehicle_movement ON movement_vehicle(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_vehicle_vehicle ON movement_vehicle(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_movement_vehicle_driver ON movement_vehicle(driver_person_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_status ON vehicle(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle(plate_number);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
DECLARE
    vehicle_count integer;
    movement_count integer;
BEGIN
    SELECT COUNT(*) INTO vehicle_count FROM vehicle;
    SELECT COUNT(*) INTO movement_count FROM movement;
    
    RAISE NOTICE '✅ Movement enhancement migration completed successfully!';
    RAISE NOTICE '📊 Statistics:';
    RAISE NOTICE '   - Total vehicles in fleet: %', vehicle_count;
    RAISE NOTICE '   - Total movements in system: %', movement_count;
    RAISE NOTICE '   - New columns added to movement: title, status, trip_manager_id, requires_overnight, etc.';
    RAISE NOTICE '   - New columns added to movement_person: confirmed_attendance, actual_attendance, absence_reason';
    RAISE NOTICE '   - New tables created: vehicle, movement_vehicle';
    RAISE NOTICE '⚠️  vehicle_info column has been deprecated and renamed to vehicle_info_deprecated';
END $$;
