-- =====================================================
-- DATABASE STRUCTURE AUDIT - MILLS & PUMPS MODULE
-- =====================================================
-- Execute this to get the EXACT column names and types
-- Run in Supabase SQL Editor

-- =====================================================
-- 1. MILL TABLE STRUCTURE
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mill'
ORDER BY ordinal_position;

-- =====================================================
-- 2. PUMP TABLE STRUCTURE
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pump'
ORDER BY ordinal_position;

-- =====================================================
-- 3. MILL_PUMP JUNCTION TABLE (CRITICAL!)
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'mill_pump'
ORDER BY ordinal_position;

-- =====================================================
-- 4. COMMUNITY TABLE
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'community'
ORDER BY ordinal_position;

-- =====================================================
-- 5. PUMP_EVENT TABLE (if exists)
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pump_event'
ORDER BY ordinal_position;

-- =====================================================
-- 6. ALL FOREIGN KEYS INVOLVING MILL
-- =====================================================
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'mill' OR ccu.table_name = 'mill')
  AND tc.table_schema = 'public';

-- =====================================================
-- 7. ALL FOREIGN KEYS INVOLVING PUMP
-- =====================================================
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (tc.table_name = 'pump' OR ccu.table_name = 'pump')
  AND tc.table_schema = 'public';

-- =====================================================
-- 8. SAMPLE DATA FROM MILL_PUMP (to see column names)
-- =====================================================
SELECT * FROM mill_pump LIMIT 1;

-- =====================================================
-- 9. ALL TABLES IN PUBLIC SCHEMA (to find related tables)
-- =====================================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND (
    table_name LIKE '%mill%' OR
    table_name LIKE '%pump%' OR
    table_name LIKE '%community%' OR
    table_name = 'work_order' OR
    table_name = 'manufacturing_order'
  )
ORDER BY table_name;
