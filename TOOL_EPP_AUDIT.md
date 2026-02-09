# Tool and EPP Assignment System Audit

## Purpose
Comprehensive audit of existing tool and EPP assignment infrastructure to ensure compatibility before making changes.

## Tables Involved

### 1. work_order_tool_reservation
- Stores which tools are needed for a work order
- Columns: work_order_id, tool_id, quantity

### 2. work_order_safety_requirement  
- Stores which safety equipment (EPP) is needed for a work order
- Columns: work_order_id, safety_id, quantity_required

### 3. crew_tool_assignment
- Tracks actual assignment of tools to crews
- Columns: crew_id, tool_id, quantity, start_date, end_date
- end_date = NULL means currently assigned

### 4. crew_epp_assignment (if exists)
- Need to verify existence and structure

## Existing Triggers

### On work_order table:
- `trg_close_epp_on_wo_close` → `close_epp_assignments_on_wo_close()`
- `trg_close_ot` → `close_assignments_on_ot_close()`
- `work_order_pump_lifecycle` → `handle_pump_lifecycle_on_wo_close()`
- `trg_wo_start_consumption` → `consume_wo_resources_on_start()`
- `trg_release_resources_on_close` → `release_crew_resources_on_wo_close()` (newly created)

## Questions to Answer
1. Do existing triggers already handle tool/EPP assignment on WO start?
2. Do existing triggers already handle tool/EPP release on WO close?
3. Is there overlap with my newly created trigger?
4. What's the correct flow?

## Investigation Results
(To be filled after queries complete)
