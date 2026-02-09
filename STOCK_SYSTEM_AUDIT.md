# Stock System Comprehensive Audit

## Current Error
```
many_not_null violates check constraint 'chk_tool_stock_non_negative'
```

This indicates tool stock is going negative when starting a work order.

## Issues to Investigate

### 1. Constraint Conflicts
- Multiple type constraints on same tables (old vs new)
- Check constraints that may be too restrictive

### 2. Trigger Execution Order
- Multiple triggers on stock_movement tables may conflict
- BEFORE vs AFTER trigger timing issues

### 3. Function Logic
- apply_*_stock_movement vs update_*_stock_after_movement duplication
- CASE statements that don't handle all type values
- SECURITY DEFINER settings

### 4. Missing Stock Rows
- Tools may not have stock rows initialized
- Safety equipment stock not handled

## Action Plan
1. Identify ALL triggers and their execution order
2. Identify ALL constraints and their definitions
3. Review ALL function definitions
4. Consolidate to ONE trigger per table
5. Ensure ALL type values are handled
6. Initialize ALL stock rows
