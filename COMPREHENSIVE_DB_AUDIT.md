# Comprehensive Database Audit - Work Order System

## Audit Date: 2026-02-07

## Critical Issues Found and Fixed

### 1. ❌ Conflicting Triggers Referencing Wrong Tables

**Problem**: Triggers tried to insert into Manufacturing Order tables instead of Work Order tables
- `apply_safety_assignment()` → Tried to use `safety_inventory_movement` (MO table)
- `apply_tool_assignment()` → Tried to use wrong stock movement approach

**Root Cause**: 
- `safety_inventory_movement`, `mo_inventory_movement`, `mo_piece_inventory_movement` are for **Manufacturing Orders**
- Work Orders use: `piece_stock_movement`, `material_stock_movement`, `tool_stock_movement`
- NO separate table for EPP stock movements in Work Orders

**Solution**: ✅
- Disabled `trg_safety_assign` and `trg_safety_return`
- Disabled `trg_tool_assign` and `trg_tool_return`  
- Keep only simple decrement/increment triggers

### 2. ❌ Incorrect Trigger Event Type for Stock Return

**Problem**: `trg_increment_safety_stock` fired on DELETE instead of UPDATE
**Cause**: When assignment ends, we UPDATE `end_date`, not DELETE the row
**Solution**: ✅ Changed to fire on UPDATE when `end_date` changes from NULL

---

## Table Structures (Verified Correct)

### crew_tool_assignment
**Columns**: id, crew_id, tool_id, quantity, start_date, end_date
**Constraints**:
- PK: id
- FK: crew_id → crew
- FK: tool_id → tool
- NO check constraints on dates (handled by trigger)

**Triggers** (Final):
- `trg_decrement_tool_stock` ON INSERT → Decrements `tool_stock.quantity_available`
- `trg_increment_tool_stock` ON UPDATE (when end_date set) → Increments back
- `trg_validate_dates_crew_tool` BEFORE INSERT → Validates dates

### crew_safety_equipment_assignment  
**Columns**: id, crew_id, safety_id, quantity, start_date, end_date
**Constraints**:
- PK: id
- FK: crew_id → crew
- FK: safety_id → safety_equipment

**Triggers** (Final):
- `trg_decrement_safety_stock` ON INSERT → Decrements `safety_equipment_stock.quantity_available`
- `trg_increment_safety_stock` ON UPDATE (when end_date set) → Increments back
- `trg_validate_dates_crew_safety` BEFORE INSERT → Validates dates

### tool_stock
**Columns**: tool_id (PK), quantity_available, min_stock
**Constraints**:
- CHECK: quantity_available >= 0 AND min_stock >= 0
- FK: tool_id → tool

### safety_equipment_stock
**Columns**: safety_id (PK), quantity_available
**Constraints**:
- CHECK: quantity_available >= 0
- FK: safety_id → safety_equipment

---

## Function Audit

### consume_wo_resources_on_start()
**Purpose**: Consumes/Assigns resources when WO status → IN_PROGRESS

**Logic** (Verified Correct):
1. Check `resource_requirements` for PENDING items → Block if any
2. **Pieces**: INSERT into `piece_stock_movement` (type='USE')
3. **Materials**: INSERT into `material_stock_movement` (type='USE')  
4. **Tools**: INSERT into `crew_tool_assignment` → Trigger handles stock
5. **EPP**: INSERT into `crew_safety_equipment_assignment` → Trigger handles stock

**Column Names** (Fixed):
- ✅ Uses `safety_id` not `safety_equipment_id`
- ✅ Uses `start_date/end_date` not `assignment_date/return_date`

### close_assignments_on_ot_close()
**Purpose**: Releases tools/EPP when WO status → 'closed'
**Trigger**: ON work_order UPDATE
**Logic**: Sets `end_date = now()` for all assignments → Increment triggers fire

### close_epp_assignments_on_wo_close()
**Purpose**: Releases EPP when WO status → 'cerrada'  
**Note**: Duplicates `close_assignments_on_ot_close` but for different status value

---

## Stock Movement Tables (Work Orders vs Manufacturing Orders)

### Work Orders Use:
- `piece_stock_movement` (type: ENTRY, USE, ADJUSTMENT, etc.)
- `material_stock_movement` (type: ENTRY, USE, ADJUSTMENT, etc.)
- `tool_stock_movement` (type: ENTRY, USE, ADJUSTMENT, RETURN)
- NO separate EPP movement table - handled directly via `safety_equipment_stock`

### Manufacturing Orders Use:
- `mo_inventory_movement` (materials)
- `mo_piece_inventory_movement` (pieces)
- `safety_inventory_movement` (EPP)

**Critical**: Work Orders and Manufacturing Orders have SEPARATE stock tracking systems!

---

## Test Status

### Test 6, 7, 8 Data:
- ✅ All have mill_id=1, crew_id=13
- ✅ All have pieces, materials, tools, EPP configured
- ✅ Ready for testing

### Next Steps:
1. Reload UI (Ctrl+F5)
2. Test 6: Initiate WO → Verify tool/EPP assignment
3. Test 7: Complete WO → Verify resource release
4. Test 8: Cancel WO → Verify resource release
