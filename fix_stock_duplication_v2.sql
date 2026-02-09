-- Fix for Duplicate Stock Movements V2
-- Problem: 
-- Evidence suggests MULTIPLE sets of triggers are active:
-- 1. `trg_update_...` (Dropped in V1, but let's make sure)
-- 2. `trg_record_...` (From correct_inventory_logic.sql - likely active)
-- 3. `trg_sync_wo_...` (From live_stock_sync_triggers.sql - WE WANT TO KEEP THIS)

-- Since `trg_sync_wo_...` handles BOTH Stock Update AND Movement Logging, 
-- having `trg_record_...` active causes duplicate movements (and potentially double stock deduction if movements trigger updates).

BEGIN;

-- 1. DROP PIECE TRIGGERS (Redundant ones)
DROP TRIGGER IF EXISTS trg_update_piece_stock ON work_order_piece;
DROP FUNCTION IF EXISTS update_piece_stock_from_wo;

DROP TRIGGER IF EXISTS trg_record_piece_movement ON work_order_piece;
DROP FUNCTION IF EXISTS record_piece_movement_from_wo;

-- 2. DROP MATERIAL TRIGGERS
DROP TRIGGER IF EXISTS trg_update_material_stock ON work_order_material;
DROP FUNCTION IF EXISTS update_material_stock_from_wo;

DROP TRIGGER IF EXISTS trg_record_material_movement ON work_order_material;
DROP FUNCTION IF EXISTS record_material_movement_from_wo;

-- 3. DROP TOOL TRIGGERS
DROP TRIGGER IF EXISTS trg_update_tool_stock ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS update_tool_stock_from_wo;

DROP TRIGGER IF EXISTS trg_record_tool_movement ON work_order_tool_reservation;
DROP FUNCTION IF EXISTS record_tool_movement_from_wo;

COMMIT;

-- After this, ONLY `trg_sync_wo_piece_stock` (and friends) should be active.
-- They are defined in `migrations/live_stock_sync_triggers.sql` and `migrations/stock_reduction_triggers.sql` logic.
