-- Migration: Create Planned Activities Schema
-- Description: Creates tables for activity planning, crew scheduling, and resource requirements
-- Dependencies: Requires person, crew, community, mill, work_order, diagnosis, 
--               community_concertation, and manufacturing_order tables to exist

-- ============================================================================
-- ACTIVITY TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_type (
    activity_type_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name varchar NOT NULL UNIQUE,
    description text,
    requires_field_trip boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.activity_type IS 
    'Classification of planned activities (diagnosis, concertation, repair, social search, fabrication, etc.)';

-- ============================================================================
-- PLANNED ACTIVITIES (Main Planning Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.planned_activity (
    activity_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activity_type_id integer REFERENCES activity_type(activity_type_id),
    title varchar NOT NULL,
    description text,
    priority varchar CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    status varchar DEFAULT 'PLANIFICADA' CHECK (status IN ('PLANIFICADA', 'ASIGNADA', 'EN_EJECUCION', 'COMPLETADA', 'CANCELADA')),
    
    -- Planning details
    responsible_person_id integer REFERENCES person(person_id),
    assigned_crew_id integer REFERENCES crew(crew_id),
    planned_start_week date,
    planned_end_week date,
    estimated_duration_days integer,
    
    -- Location/Target
    target_community_id integer REFERENCES community(community_id),
    target_mill_id integer REFERENCES mill(mill_id),
    target_location_notes text,
    
    -- Execution tracking
    actual_start_date date,
    actual_end_date date,
    completion_notes text,
    
    -- Link to movement (when trip is created for this activity)
    related_movement_id integer REFERENCES movement(movement_id),
    
    -- Relationships with executed work
    related_work_order_id integer REFERENCES work_order(work_order_id),
    related_diagnosis_id integer REFERENCES diagnosis(diagnosis_id),
    related_concertation_id integer REFERENCES community_concertation(concertation_id),
    related_manufacturing_order_id integer REFERENCES manufacturing_order(mo_id),
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer REFERENCES person(person_id)
);

COMMENT ON TABLE public.planned_activity IS 
    'Planned activities for field operations and workshop. Links to movements and execution modules.';

-- ============================================================================
-- WEEKLY CREW ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.weekly_crew_assignment (
    assignment_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activity_id integer NOT NULL REFERENCES planned_activity(activity_id) ON DELETE CASCADE,
    crew_id integer NOT NULL REFERENCES crew(crew_id),
    week_start_date date NOT NULL,
    week_end_date date NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.weekly_crew_assignment IS 
    'Temporary weekly crew assignments for specific planned activities. Supplements permanent crew_member assignments.';

-- ============================================================================
-- ACTIVITY RESOURCE REQUIREMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_resource_requirement (
    requirement_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activity_id integer NOT NULL REFERENCES planned_activity(activity_id) ON DELETE CASCADE,
    resource_type varchar NOT NULL CHECK (resource_type IN ('material', 'tool', 'safety_equipment', 'piece', 'vehicle')),
    resource_id integer,
    resource_name varchar,
    quantity_needed integer,
    notes text,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.activity_resource_requirement IS 
    'Planning-phase resource needs tracking. Different from actual consumption tracked in work_order tables.';

-- ============================================================================
-- ACTIVITY COMMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_comment (
    comment_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    activity_id integer NOT NULL REFERENCES planned_activity(activity_id) ON DELETE CASCADE,
    person_id integer REFERENCES person(person_id),
    comment_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.activity_comment IS 
    'Comments and notes on planned activities for team communication during planning phase.';

-- ============================================================================
-- SEED INITIAL ACTIVITY TYPES
-- ============================================================================

INSERT INTO activity_type (name, description, requires_field_trip) VALUES
    ('Diagnóstico', 'Visita técnica para diagnóstico de molino', true),
    ('Concertación', 'Reunión con comunidad para concertar trabajo', true),
    ('Reparación/Mantenimiento', 'Ejecución de orden de trabajo en campo', true),
    ('Búsqueda de Comunidades', 'Visita social para identificar necesidades', true),
    ('Fabricación de Piezas', 'Fabricación en taller', false),
    ('Mecanizado', 'Trabajo de mecanizado en taller', false),
    ('Mixto (Social + Técnico)', 'Actividad combinada', true),
    ('Inspección General', 'Inspección de campo general', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_planned_activity_status ON planned_activity(status);
CREATE INDEX IF NOT EXISTS idx_planned_activity_week ON planned_activity(planned_start_week);
CREATE INDEX IF NOT EXISTS idx_planned_activity_responsible ON planned_activity(responsible_person_id);
CREATE INDEX IF NOT EXISTS idx_planned_activity_crew ON planned_activity(assigned_crew_id);
CREATE INDEX IF NOT EXISTS idx_planned_activity_movement ON planned_activity(related_movement_id);

CREATE INDEX IF NOT EXISTS idx_weekly_crew_week ON weekly_crew_assignment(week_start_date, week_end_date);
CREATE INDEX IF NOT EXISTS idx_activity_resource_type ON activity_resource_requirement(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_comment_activity ON activity_comment(activity_id);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Planned activities schema created successfully!';
    RAISE NOTICE 'Tables created: activity_type, planned_activity, weekly_crew_assignment, activity_resource_requirement, activity_comment';
    RAISE NOTICE 'Seeded % activity types', (SELECT COUNT(*) FROM activity_type);
END $$;
