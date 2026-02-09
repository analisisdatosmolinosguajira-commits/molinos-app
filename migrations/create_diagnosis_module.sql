-- ============================================================================
-- DIAGNOSIS MODULE - COMPLETE SCHEMA MIGRATION
-- Mirrors Work Order structure with diagnosis-specific enhancements
-- ============================================================================

-- ============================================================================
-- 1. MAIN DIAGNOSIS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnosis (
    diagnosis_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Core Fields
    mill_id UUID REFERENCES mill(mill_id) ON DELETE SET NULL,
    crew_id UUID REFERENCES crew(crew_id) ON DELETE SET NULL,
    pump_id UUID REFERENCES pump(pump_id) ON DELETE SET NULL,
    
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
    created_by UUID REFERENCES auth.users(id),
    
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
        NEW.code := 'DX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('diagnosis_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS diagnosis_seq START 1;

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
    diagnosis_piece_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    piece_id UUID NOT NULL REFERENCES piece(piece_id) ON DELETE RESTRICT,
    quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, piece_id)
);

-- 2.2 Diagnosis Materials
CREATE TABLE IF NOT EXISTS diagnosis_material (
    diagnosis_material_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES material(material_id) ON DELETE RESTRICT,
    quantity_required DECIMAL(10,2) NOT NULL CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, material_id)
);

-- 2.3 Diagnosis Tool Reservations
CREATE TABLE IF NOT EXISTS diagnosis_tool_reservation (
    diagnosis_tool_reservation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES tool(tool_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, tool_id)
);

-- 2.4 Diagnosis Safety Requirements (EPP)
CREATE TABLE IF NOT EXISTS diagnosis_safety_requirement (
    diagnosis_safety_requirement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    safety_id UUID NOT NULL REFERENCES safety_equipment(safety_id) ON DELETE RESTRICT,
    quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(diagnosis_id, safety_id)
);

-- ============================================================================
-- 3. ENHANCED COMPONENT STATUS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnosis_component_status (
    diagnosis_component_status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diagnosis_id UUID NOT NULL REFERENCES diagnosis(diagnosis_id) ON DELETE CASCADE,
    component_id UUID NOT NULL REFERENCES mill_component(component_id) ON DELETE RESTRICT,
    
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
-- 4. UPDATE RESOURCE_REQUIREMENTS TABLE
-- ============================================================================
-- Ensure resource_requirements supports 'DIAGNOSIS' type
-- (Assuming it already exists from work_orders, just verify)
DO $$
BEGIN
    -- Check if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'resource_requirements') THEN
        -- Add check constraint if not already present
        ALTER TABLE resource_requirements DROP CONSTRAINT IF EXISTS valid_reference_type;
        ALTER TABLE resource_requirements ADD CONSTRAINT valid_reference_type 
            CHECK (reference_type IN ('WORK_ORDER', 'DIAGNOSIS'));
    END IF;
END $$;

-- ============================================================================
-- 5. TRIGGERS FOR RESOURCE CONSUMPTION
-- ============================================================================

-- 5.1 Trigger: Check and register resource requirements on INSERT
CREATE OR REPLACE FUNCTION check_diagnosis_resources_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Register all required resources
    -- Pieces
    INSERT INTO resource_requirements (reference_type, reference_id, resource_type, resource_id, quantity_required, status)
    SELECT 'DIAGNOSIS', NEW.diagnosis_id, 'PIECE', dp.piece_id, dp.quantity_required, 
           CASE WHEN COALESCE(p.current_stock, 0) >= dp.quantity_required THEN 'AVAILABLE' ELSE 'PENDING' END
    FROM diagnosis_piece dp
    LEFT JOIN piece p ON p.piece_id = dp.piece_id
    WHERE dp.diagnosis_id = NEW.diagnosis_id
    ON CONFLICT (reference_type, reference_id, resource_type, resource_id) DO UPDATE
        SET quantity_required = EXCLUDED.quantity_required, status = EXCLUDED.status;

    -- Materials
    INSERT INTO resource_requirements (reference_type, reference_id, resource_type, resource_id, quantity_required, status)
    SELECT 'DIAGNOSIS', NEW.diagnosis_id, 'MATERIAL', dm.material_id, dm.quantity_required,
           CASE WHEN COALESCE(m.current_stock, 0) >= dm.quantity_required THEN 'AVAILABLE' ELSE 'PENDING' END
    FROM diagnosis_material dm
    LEFT JOIN material m ON m.material_id = dm.material_id
    WHERE dm.diagnosis_id = NEW.diagnosis_id
    ON CONFLICT (reference_type, reference_id, resource_type, resource_id) DO UPDATE
        SET quantity_required = EXCLUDED.quantity_required, status = EXCLUDED.status;

    -- Tools
    INSERT INTO resource_requirements (reference_type, reference_id, resource_type, resource_id, quantity_required, status)
    SELECT 'DIAGNOSIS', NEW.diagnosis_id, 'TOOL', dt.tool_id, dt.quantity,
           CASE WHEN COALESCE(t.available_quantity, 0) >= dt.quantity THEN 'AVAILABLE' ELSE 'PENDING' END
    FROM diagnosis_tool_reservation dt
    LEFT JOIN tool t ON t.tool_id = dt.tool_id
    WHERE dt.diagnosis_id = NEW.diagnosis_id
    ON CONFLICT (reference_type, reference_id, resource_type, resource_id) DO UPDATE
        SET quantity_required = EXCLUDED.quantity_required, status = EXCLUDED.status;

    -- Safety Equipment
    INSERT INTO resource_requirements (reference_type, reference_id, resource_type, resource_id, quantity_required, status)
    SELECT 'DIAGNOSIS', NEW.diagnosis_id, 'SAFETY', ds.safety_id, ds.quantity_required,
           CASE WHEN COALESCE(s.current_stock, 0) >= ds.quantity_required THEN 'AVAILABLE' ELSE 'PENDING' END
    FROM diagnosis_safety_requirement ds
    LEFT JOIN safety_equipment s ON s.safety_id = ds.safety_id
    WHERE ds.diagnosis_id = NEW.diagnosis_id
    ON CONFLICT (reference_type, reference_id, resource_type, resource_id) DO UPDATE
        SET quantity_required = EXCLUDED.quantity_required, status = EXCLUDED.status;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_diagnosis_resources_trigger ON diagnosis;
CREATE TRIGGER check_diagnosis_resources_trigger
    AFTER INSERT OR UPDATE ON diagnosis
    FOR EACH ROW
    EXECUTE FUNCTION check_diagnosis_resources_on_insert();

-- 5.2 Trigger: Consume resources when diagnosis starts (PENDING -> IN_PROGRESS)
CREATE OR REPLACE FUNCTION consume_diagnosis_resources_on_start()
RETURNS TRIGGER AS $$
BEGIN
    -- Only consume if transitioning to IN_PROGRESS
    IF NEW.status = 'IN_PROGRESS' AND (OLD.status IS NULL OR OLD.status != 'IN_PROGRESS') THEN
        
        -- Consume pieces
        UPDATE piece SET current_stock = current_stock - dp.quantity_required
        FROM diagnosis_piece dp
        WHERE piece.piece_id = dp.piece_id AND dp.diagnosis_id = NEW.diagnosis_id;

        -- Record piece stock movements
        INSERT INTO piece_stock_movement (piece_id, movement_type, quantity, reference_type, reference_id, notes)
        SELECT dp.piece_id, 'RESERVED', -dp.quantity_required, 'DIAGNOSIS', NEW.diagnosis_id, 
               'Consumo por diagnóstico ' || NEW.code
        FROM diagnosis_piece dp
        WHERE dp.diagnosis_id = NEW.diagnosis_id;

        -- Consume materials
        UPDATE material SET current_stock = current_stock - dm.quantity_required
        FROM diagnosis_material dm
        WHERE material.material_id = dm.material_id AND dm.diagnosis_id = NEW.diagnosis_id;

        -- Record material stock movements
        INSERT INTO material_stock_movement (material_id, movement_type, quantity, reference_type, reference_id, notes)
        SELECT dm.material_id, 'RESERVED', -dm.quantity_required, 'DIAGNOSIS', NEW.diagnosis_id,
               'Consumo por diagnóstico ' || NEW.code
        FROM diagnosis_material dm
        WHERE dm.diagnosis_id = NEW.diagnosis_id;

        -- Assign tools to crew
        IF NEW.crew_id IS NOT NULL THEN
            INSERT INTO crew_tool_assignment (crew_id, tool_id, quantity, start_date, reference_type, reference_id)
            SELECT NEW.crew_id, dt.tool_id, dt.quantity, CURRENT_DATE, 'DIAGNOSIS', NEW.diagnosis_id
            FROM diagnosis_tool_reservation dt
            WHERE dt.diagnosis_id = NEW.diagnosis_id
            ON CONFLICT DO NOTHING;

            -- Update tool availability
            UPDATE tool SET available_quantity = available_quantity - dt.quantity
            FROM diagnosis_tool_reservation dt
            WHERE tool.tool_id = dt.tool_id AND dt.diagnosis_id = NEW.diagnosis_id;
        END IF;

        -- Assign safety equipment to crew
        IF NEW.crew_id IS NOT NULL THEN
            INSERT INTO crew_safety_equipment_assignment (crew_id, safety_id, quantity, start_date, reference_type, reference_id)
            SELECT NEW.crew_id, ds.safety_id, ds.quantity_required, CURRENT_DATE, 'DIAGNOSIS', NEW.diagnosis_id
            FROM diagnosis_safety_requirement ds
            WHERE ds.diagnosis_id = NEW.diagnosis_id
            ON CONFLICT DO NOTHING;

            -- Consume safety equipment
            UPDATE safety_equipment SET current_stock = current_stock - ds.quantity_required
            FROM diagnosis_safety_requirement ds
            WHERE safety_equipment.safety_id = ds.safety_id AND ds.diagnosis_id = NEW.diagnosis_id;
        END IF;

        -- Mark requirements as consumed
        UPDATE resource_requirements
        SET status = 'CONSUMED'
        WHERE reference_type = 'DIAGNOSIS' AND reference_id = NEW.diagnosis_id;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consume_diagnosis_resources_trigger ON diagnosis;
CREATE TRIGGER consume_diagnosis_resources_trigger
    AFTER UPDATE ON diagnosis
    FOR EACH ROW
    EXECUTE FUNCTION consume_diagnosis_resources_on_start();

-- 5.3 Trigger: Release resources when diagnosis completes
CREATE OR REPLACE FUNCTION release_diagnosis_resources_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only release if transitioning to COMPLETED or CANCELLED
    IF NEW.status IN ('COMPLETED', 'CANCELLED') AND OLD.status NOT IN ('COMPLETED', 'CANCELLED') THEN
        
        -- Release tools
        IF NEW.crew_id IS NOT NULL THEN
            -- Update tool assignments
            UPDATE crew_tool_assignment
            SET end_date = CURRENT_DATE
            WHERE crew_id = NEW.crew_id 
              AND reference_type = 'DIAGNOSIS' 
              AND reference_id = NEW.diagnosis_id
              AND end_date IS NULL;

            -- Return tools to stock
            UPDATE tool SET available_quantity = available_quantity + dt.quantity
            FROM diagnosis_tool_reservation dt
            WHERE tool.tool_id = dt.tool_id AND dt.diagnosis_id = NEW.diagnosis_id;
        END IF;

        -- Release safety equipment
        IF NEW.crew_id IS NOT NULL THEN
            -- Update safety assignments
            UPDATE crew_safety_equipment_assignment
            SET end_date = CURRENT_DATE
            WHERE crew_id = NEW.crew_id
              AND reference_type = 'DIAGNOSIS'
              AND reference_id = NEW.diagnosis_id
              AND end_date IS NULL;

            -- Return safety equipment to stock
            UPDATE safety_equipment SET current_stock = current_stock + ds.quantity_required
            FROM diagnosis_safety_requirement ds
            WHERE safety_equipment.safety_id = ds.safety_id AND ds.diagnosis_id = NEW.diagnosis_id;
        END IF;

        -- Mark requirements as released
        UPDATE resource_requirements
        SET status = 'RELEASED'
        WHERE reference_type = 'DIAGNOSIS' AND reference_id = NEW.diagnosis_id;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_diagnosis_resources_trigger ON diagnosis;
CREATE TRIGGER release_diagnosis_resources_trigger
    AFTER UPDATE ON diagnosis
    FOR EACH ROW
    EXECUTE FUNCTION release_diagnosis_resources_on_completion();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE diagnosis ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_piece ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_tool_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_safety_requirement ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_component_status ENABLE ROW LEVEL SECURITY;

-- Diagnosis policies
DROP POLICY IF EXISTS diagnosis_select_policy ON diagnosis;
CREATE POLICY diagnosis_select_policy ON diagnosis FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_insert_policy ON diagnosis;
CREATE POLICY diagnosis_insert_policy ON diagnosis FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS diagnosis_update_policy ON diagnosis;
CREATE POLICY diagnosis_update_policy ON diagnosis FOR UPDATE USING (true);

DROP POLICY IF EXISTS diagnosis_delete_policy ON diagnosis;
CREATE POLICY diagnosis_delete_policy ON diagnosis FOR DELETE USING (true);

-- Diagnosis Piece policies
DROP POLICY IF EXISTS diagnosis_piece_select_policy ON diagnosis_piece;
CREATE POLICY diagnosis_piece_select_policy ON diagnosis_piece FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_piece_insert_policy ON diagnosis_piece;
CREATE POLICY diagnosis_piece_insert_policy ON diagnosis_piece FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS diagnosis_piece_update_policy ON diagnosis_piece;
CREATE POLICY diagnosis_piece_update_policy ON diagnosis_piece FOR UPDATE USING (true);

DROP POLICY IF EXISTS diagnosis_piece_delete_policy ON diagnosis_piece;
CREATE POLICY diagnosis_piece_delete_policy ON diagnosis_piece FOR DELETE USING (true);

-- Diagnosis Material policies
DROP POLICY IF EXISTS diagnosis_material_select_policy ON diagnosis_material;
CREATE POLICY diagnosis_material_select_policy ON diagnosis_material FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_material_insert_policy ON diagnosis_material;
CREATE POLICY diagnosis_material_insert_policy ON diagnosis_material FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS diagnosis_material_update_policy ON diagnosis_material;
CREATE POLICY diagnosis_material_update_policy ON diagnosis_material FOR UPDATE USING (true);

DROP POLICY IF EXISTS diagnosis_material_delete_policy ON diagnosis_material;
CREATE POLICY diagnosis_material_delete_policy ON diagnosis_material FOR DELETE USING (true);

-- Diagnosis Tool Reservation policies
DROP POLICY IF EXISTS diagnosis_tool_reservation_select_policy ON diagnosis_tool_reservation;
CREATE POLICY diagnosis_tool_reservation_select_policy ON diagnosis_tool_reservation FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_tool_reservation_insert_policy ON diagnosis_tool_reservation;
CREATE POLICY diagnosis_tool_reservation_insert_policy ON diagnosis_tool_reservation FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS diagnosis_tool_reservation_update_policy ON diagnosis_tool_reservation;
CREATE POLICY diagnosis_tool_reservation_update_policy ON diagnosis_tool_reservation FOR UPDATE USING (true);

DROP POLICY IF EXISTS diagnosis_tool_reservation_delete_policy ON diagnosis_tool_reservation;
CREATE POLICY diagnosis_tool_reservation_delete_policy ON diagnosis_tool_reservation FOR DELETE USING (true);

-- Diagnosis Safety Requirement policies
DROP POLICY IF EXISTS diagnosis_safety_requirement_select_policy ON diagnosis_safety_requirement;
CREATE POLICY diagnosis_safety_requirement_select_policy ON diagnosis_safety_requirement FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_safety_requirement_insert_policy ON diagnosis_safety_requirement;
CREATE POLICY diagnosis_safety_requirement_insert_policy ON diagnosis_safety_requirement FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS diagnosis_safety_requirement_update_policy ON diagnosis_safety_requirement;
CREATE POLICY diagnosis_safety_requirement_update_policy ON diagnosis_safety_requirement FOR UPDATE USING (true);

DROP POLICY IF EXISTS diagnosis_safety_requirement_delete_policy ON diagnosis_safety_requirement;
CREATE POLICY diagnosis_safety_requirement_delete_policy ON diagnosis_safety_requirement FOR DELETE USING (true);

-- Diagnosis Component Status policies
DROP POLICY IF EXISTS diagnosis_component_status_select_policy ON diagnosis_component_status;
CREATE POLICY diagnosis_component_status_select_policy ON diagnosis_component_status FOR SELECT USING (true);

DROP POLICY IF EXISTS diagnosis_component_status_insert_policy ON diagnosis_component_status;
CREATE POLICY diagnosis_component_status_insert_policy ON diagnosis_component_status FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS diagnosis_component_status_update_policy ON diagnosis_component_status;
CREATE POLICY diagnosis_component_status_update_policy ON diagnosis_component_status FOR UPDATE USING (true);

DROP POLICY IF EXISTS diagnosis_component_status_delete_policy ON diagnosis_component_status;
CREATE POLICY diagnosis_component_status_delete_policy ON diagnosis_component_status FOR DELETE USING (true);

-- ============================================================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_diagnosis_status ON diagnosis(status);
CREATE INDEX IF NOT EXISTS idx_diagnosis_mill ON diagnosis(mill_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_crew ON diagnosis(crew_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_pump ON diagnosis(pump_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_type ON diagnosis(diagnosis_type);
CREATE INDEX IF NOT EXISTS idx_diagnosis_priority ON diagnosis(priority);
CREATE INDEX IF NOT EXISTS idx_diagnosis_date ON diagnosis(diagnosis_date);
CREATE INDEX IF NOT EXISTS idx_diagnosis_created ON diagnosis(created_at);

CREATE INDEX IF NOT EXISTS idx_diagnosis_piece_diagnosis ON diagnosis_piece(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_material_diagnosis ON diagnosis_material(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_tool_diagnosis ON diagnosis_tool_reservation(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_safety_diagnosis ON diagnosis_safety_requirement(diagnosis_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_component_diagnosis ON diagnosis_component_status(diagnosis_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration creates:
-- - 1 main diagnosis table
-- - 4 resource requirement tables (pieces, materials, tools, safety)
-- - 1 enhanced component status table with 8+ diagnostic metrics
-- - Automatic code generation
-- - Resource consumption/release triggers
-- - RLS policies for all tables
-- - Performance indexes
-- ============================================================================
