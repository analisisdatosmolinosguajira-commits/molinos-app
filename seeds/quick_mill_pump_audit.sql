-- Get exact column names for mill_pump table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'mill_pump'
ORDER BY ordinal_position;
