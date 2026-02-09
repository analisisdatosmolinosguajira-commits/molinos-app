-- Fix for Duplicate Stock Movements
-- Problem: 
-- Two sets of triggers were active:
-- 1. `trg_update_...` (Direct update, legacy)
-- 2. `trg_sync_wo_...` (Update + Movement Log, new)
-- This caused stock to be deducted twice when adding items to a WO, and returned twice (or once + once) when removing.

-- Solution:
-- Drop the legacy "direct update" triggers and their functions.
-- Keep the `trg_sync_wo_...` triggers which handle both stock update and movement logging.

BEGIN;

-- 1. Drop Piece Triggers
DROP TRIGGER IF EXISTS trg_update_piece_stock ON work_order_piece;
DROP FUNCTION IF EXISTS update_piece_stock_from_wo;

-- 2. Drop Material Triggers
DROP TRIGGER IF EXISTS trg_update_material_stock ON work_order_material;
DROP FUNCTION IF EXISTS update_material_stock_from_wo;

-- 3. Drop Tool Triggers
DROP TRIGGER IF EXISTS trg_update_tool_stock ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS update_tool_stock_from_wo;

COMMIT;

-- Verification Query (Optional - Run separately)
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement 
-- FROM information_schema.triggers 
-- WHERE event_object_table IN ('work_order_piece', 'work_order_material', 'work_order_tool_reservation');
