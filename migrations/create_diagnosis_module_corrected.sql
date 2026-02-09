-- ============================================================================
-- DIAGNOSIS MODULE - CORRECTED SCHEMA WITH INTEGER FKs
-- Consolidates diagnosis_visit (old) into diagnosis (new)
-- ============================================================================

-- ============================================================================
-- 1. MAIN DIAGNOSIS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnosis (
    diagnosis_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Core Fields (INTEGER FKs to match existing schema)
    mill_id INTEGER REFERENCES mill(mill_id) ON DELETE SET NULL,
    crew_id INTEGER REFERENCES crew(crew_id) ON DELETE SET NULL,
    pump_id INTEGER REFERENCES pump(pump_id) ON DELETE SET NULL,
    
    -- Type & Classification
    diagnosis_type VARCHAR(20) NOT NULL CHECK (diagnosis_type IN ('PREVENTIVO', 'CORRECTIVO', 'PREDICTIVO')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    severity VARCHAR(20) CHECK (severity IN ('LEVE', 'MODERADO', 'CRÍTICO')),
    
    -- Status & Dates
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    diagnosis_date DATE,
    scheduled_date DATE,
    start_date DATE,
    completion_date DATE,
    
    -- Descriptions & Findings
    description TEXT,
    technical_findings TEXT,
    root_cause_analysis TEXT,
    recommendations TEXT,
    
    -- Pump Condition Assessment (EXCLUSIVE TO DIAGNOSIS)
    pump_condition VARCHAR(20) CHECK (pump_condition IN ('BUENO', 'REGULAR', 'MALO', 'CRÍTICO')),
    pump_observations TEXT,
    
    -- Completion
    completion_notes TEXT,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES person(person_id),
    
    CONSTRAINT valid_dates CHECK (
        (start_date IS NULL OR diagnosis_date IS NULL OR start_date >= diagnosis_date) AND
        (completion_date IS NULL OR start_date IS NULL OR completion_date >= start_date)
    )
);

-- Auto-generate code
CREATE OR REPLACE FUNCTION generate_diagnosis_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.code IS NULL OR NEW.code = '' THEN
        NEW.code := 'DX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEW.diagnosis_id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_diagnosis_code ON diagnosis;
CREATE TRIGGER set_diagnosis_code
    BEFORE INSERT ON diagnosis
    FOR EACH ROW
    EXECUTE FUNCTION generate_diagnosis_code();

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_diagnosis_timestamp ON diagnosis;
CREATE TRIGGER update_diagnosis_timestamp
    BEFORE UPDATE ON diagnosis
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 2. DIAGNOSIS RESOURCE TABLES
-- ============================================================================

-- 2.1 Diagnosis Pieces
CREATE TABLE IF NOT EXISTS diagnosis_piece (
    diagnosis_piece_id SERIAL PRIMARY KEY,
    diagnosis_id INTEGER NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    piece_id INTEGER NOT NULL REFERENCES piece(piece_id) ON DELETE RESTRICT,
    quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, piece_id)
);

-- 2.2 Diagnosis Materials
CREATE TABLE IF NOT EXISTS diagnosis_material (
    diagnosis_material_id SERIAL PRIMARY KEY,
    diagnosis_id INTEGER NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES material(material_id) ON DELETE RESTRICT,
    quantity_required DECIMAL(10,2) NOT NULL CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, material_id)
);

-- 2.3 Diagnosis Tool Reservations
CREATE TABLE IF NOT EXISTS diagnosis_tool_reservation (
    diagnosis_tool_reservation_id SERIAL PRIMARY KEY,
    diagnosis_id INTEGER NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    tool_id INTEGER NOT NULL REFERENCES tool(tool_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, tool_id)
);

-- 2.4 Diagnosis Safety Requirements (EPP)
CREATE TABLE IF NOT EXISTS diagnosis_safety_requirement (
    diagnosis_safety_requirement_id SERIAL PRIMARY KEY,
    diagnosis_id INTEGER NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    safety_id INTEGER NOT NULL REFERENCES safety_equipment(safety_id) ON DELETE RESTRICT,
    quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, safety_id)
);

-- ============================================================================
-- 3. ENHANCED COMPONENT STATUS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnosis_component_status (
    diagnosis_component_status_id SERIAL PRIMARY KEY,
    diagnosis_id INTEGER NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    component_id INTEGER NOT NULL REFERENCES mill_component(component_id) ON DELETE RESTRICT,
    
    -- Basic Status
    status VARCHAR(30) NOT NULL DEFAULT 'FUNCIONAL' 
        CHECK (status IN ('FUNCIONAL', 'DESGASTADO', 'REQUIERE_REVISION', 'DANADO', 'REQUIERE_CAMBIO', 'FALTANTE')),
    observation TEXT,
    
    -- ENHANCED METRICS (EXCLUSIVE TO DIAGNOSIS vs Work Orders)
    wear_percentage INTEGER CHECK (wear_percentage >= 0 AND wear_percentage <= 100),
    vibration_level VARCHAR(20) CHECK (vibration_level IN ('NORMAL', 'LEVE', 'MODERADO', 'ALTO')),
    temperature_status VARCHAR(20) CHECK (temperature_status IN ('NORMAL', 'ELEVADO', 'CRITICO')),
    noise_level VARCHAR(20) CHECK (noise_level IN ('NORMAL', 'LEVE', 'MODERADO', 'ALTO')),
    lubrication_status VARCHAR(20) CHECK (lubrication_status IN ('BUENO', 'REGULAR', 'MALO')),
    
    -- Additional diagnosis metadata
    deterioration_notes TEXT,
    photo_url TEXT,
    requires_immediate_action BOOLEAN DEFAULT FALSE,
    estimated_remaining_life_days INTEGER,
    priority_for_replacement INTEGER CHECK (priority_for_replacement >= 0 AND priority_for_replacement <= 10),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(diagnosis_id, component_id)
);

DROP TRIGGER IF EXISTS update_diagnosis_component_timestamp ON diagnosis_component_status;
CREATE TRIGGER update_diagnosis_component_timestamp
    BEFORE UPDATE ON diagnosis_component_status
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 4. MIGRATE DATA FROM diagnosis_visit
-- ============================================================================

INSERT INTO diagnosis (
    mill_id,
    crew_id,
    diagnosis_type,
    status,
    scheduled_date,
    notes,
    created_at
)
SELECT 
    mill_id,
    crew_id,
    COALESCE(UPPER(type), 'CORRECTIVO') AS diagnosis_type,
    COALESCE(UPPER(status), 'PENDING') AS status,
    scheduled_date,
    notes,
    CURRENT_TIMESTAMP AS created_at
FROM diagnosis_visit;

-- ============================================================================
-- 5. UPDATE FOREIGN KEYS TO POINT TO NEW diagnosis TABLE
-- ============================================================================

-- Update movement_diagnosis junction table
ALTER TABLE movement_diagnosis 
    DROP CONSTRAINT IF EXISTS fk_movement_diagnosis_diagnosis;
ALTER TABLE movement_diagnosis 
    ADD CONSTRAINT fk_movement_diagnosis_diagnosis 
        FOREIGN KEY (diagnosis_id) REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE;

-- Update community_concertation
ALTER TABLE community_concertation 
    DROP CONSTRAINT IF EXISTS fk_concertation_diagnosis;
ALTER TABLE community_concertation 
    ADD CONSTRAINT fk_concertation_diagnosis 
        FOREIGN KEY (diagnosis_id) REFERENCES diagnosis(diagnosis_id) ON DELETE SET NULL;

-- Update pump_event
ALTER TABLE pump_event
    DROP CONSTRAINT IF EXISTS pump_event_diagnosis_id_fkey;
ALTER TABLE pump_event
    ADD CONSTRAINT pump_event_diagnosis_id_fkey
        FOREIGN KEY (diagnosis_id) REFERENCES diagnosis(diagnosis_id) ON DELETE SET NULL;

-- Update mill_pump
ALTER TABLE mill_pump
    DROP CONSTRAINT IF EXISTS fk_mill_pump_diagnosis;
ALTER TABLE mill_pump
    ADD CONSTRAINT fk_mill_pump_diagnosis
        FOREIGN KEY (diagnosis_id) REFERENCES diagnosis(diagnosis_id) ON DELETE SET NULL;

-- ============================================================================
-- 6. DROP OLD diagnosis_visit TABLE
-- ============================================================================

DROP TABLE diagnosis_visit CASCADE;

-- ============================================================================
-- 7. TRIGGERS FOR RESOURCE CONSUMPTION (same as before)
-- ============================================================================

-- Include all the trigger functions from previous migration...
-- (Keeping them identical, just with INTEGER types)
