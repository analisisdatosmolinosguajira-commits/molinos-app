-- Fix for Duplicates (Dropping Legacy Triggers)
-- Goal: Ensure only ONE trigger manages the lifecycle for each resource.

BEGIN;

-- 1. Tools: Drop Legacy Return/Manage Triggers
DROP TRIGGER IF EXISTS trg_return_tool_on_assignment_end ON crew_tool_assignment;
DROP TRIGGER IF EXISTS trg_manage_wo_tool_req ON work_order_tool_reservation;

-- 2. Safety: Drop Legacy Return/Manage Triggers
DROP TRIGGER IF EXISTS trg_return_safety_on_assignment_end ON crew_safety_equipment_assignment;
DROP TRIGGER IF EXISTS trg_manage_wo_safety_req ON work_order_safety_requirement;

-- 3. Validation: Legacy Triggers might also be redundant or conflicting, lets checking names
-- `trg_validate_dates_crew_tool` seems fine (likely just date checks), causing no stock changes.
-- `trg_validate_dates_crew_safety` seems fine.

-- 4. Re-Verify: Only `trg_tool_assignment_lifecycle` and `trg_sync_wo_tool_reservations` should remain for Tools.
-- (And equivalent for Safety).

COMMIT;
