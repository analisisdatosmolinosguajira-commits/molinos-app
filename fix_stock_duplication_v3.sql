-- Fix for Duplicate Stock Movements V3 (Final)
-- Problem: Duplicate stock deductions and/or movement logs for Resources (Pieces, Materials, Tools, Safety).
-- Cause: Concurrent active triggers for the same action.

BEGIN;

-- =================================================================
-- 1. PIECES
-- =================================================================
-- Drop Legacy Update
DROP TRIGGER IF EXISTS trg_update_piece_stock ON work_order_piece;
DROP FUNCTION IF EXISTS update_piece_stock_from_wo;
-- Drop Legacy Record
DROP TRIGGER IF EXISTS trg_record_piece_movement ON work_order_piece;
DROP FUNCTION IF EXISTS record_piece_movement_from_wo;

-- =================================================================
-- 2. MATERIALS
-- =================================================================
DROP TRIGGER IF EXISTS trg_update_material_stock ON work_order_material;
DROP FUNCTION IF EXISTS update_material_stock_from_wo;

DROP TRIGGER IF EXISTS trg_record_material_movement ON work_order_material;
DROP FUNCTION IF EXISTS record_material_movement_from_wo;

-- =================================================================
-- 3. TOOLS
-- =================================================================
-- Tools logic: 
-- WO -> Sync Trigger -> Assignment -> Assignment Trigger -> Stock Update.
-- Direct WO -> Stock Update triggers cause doubling.
DROP TRIGGER IF EXISTS trg_update_tool_stock ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS update_tool_stock_from_wo;

DROP TRIGGER IF EXISTS trg_record_tool_movement ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS record_tool_movement_from_wo;

-- =================================================================
-- 4. SAFETY EQUIPMENT (EPP)
-- =================================================================
-- Similar logic to Tools if Safety uses Assignments.
DROP TRIGGER IF EXISTS trg_update_safety_stock ON work_order_safety_requirement;
DROP FUNCTION IF EXISTS update_safety_stock_from_wo;

DROP TRIGGER IF EXISTS trg_record_safety_movement ON work_order_safety_requirement;
DROP FUNCTION IF EXISTS record_safety_movement_from_wo;

-- Also try alternative names for safety assignment triggers just in case
DROP TRIGGER IF EXISTS trg_update_safety_equipment_stock ON work_order_safety_requirement;
DROP TRIGGER IF EXISTS trg_record_safety_equipment_movement ON work_order_safety_requirement;

COMMIT;
