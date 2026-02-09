-- Inspect Triggers
-- Run this to see what triggers are actually active on the movement and resource tables.

SELECT 
    event_object_table as table_name,
    trigger_name
FROM 
    information_schema.triggers
WHERE 
    event_object_table IN (
        'work_order_piece', 
        'work_order_material', 
        'work_order_tool_reservation',
        'work_order_safety_requirement',
        'piece_stock_movement',
        'material_stock_movement',
        'tool_stock_movement',
        'safety_inventory_movement'
    )
ORDER BY 
    event_object_table, 
    trigger_name;
