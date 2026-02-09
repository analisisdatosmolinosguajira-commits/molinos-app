-- Inspect Assignment Triggers
SELECT 
    event_object_table as table_name,
    trigger_name
FROM 
    information_schema.triggers
WHERE 
    event_object_table IN (
        'crew_tool_assignment', 
        'crew_safety_equipment_assignment'
    )
ORDER BY 
    event_object_table, 
    trigger_name;
