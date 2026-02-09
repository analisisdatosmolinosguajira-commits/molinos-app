-- Grant permissions to authenticated users on movement tables
GRANT INSERT, UPDATE, DELETE, SELECT ON piece_stock_movement TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON material_stock_movement TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON tool_stock_movement TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON piece_stock TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON material_stock TO authenticated;
GRANT INSERT, UPDATE, DELETE, SELECT ON tool_stock TO authenticated;

-- Also ensure sequences are granted if needed (though usually auto-handled)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
