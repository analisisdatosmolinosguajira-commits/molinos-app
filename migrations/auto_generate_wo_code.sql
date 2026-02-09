-- 1. Create Sequence for numeric part
CREATE SEQUENCE IF NOT EXISTS work_order_code_seq START 1;

-- 2. Create Function to generate code
CREATE OR REPLACE FUNCTION generate_work_order_code()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    seq_part TEXT;
    new_code TEXT;
BEGIN
    -- Get current year
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    -- Get next value from sequence and pad with zeros (e.g., 0001)
    seq_part := LPAD(NEXTVAL('work_order_code_seq')::TEXT, 4, '0');
    
    -- Format: OT-YYYY-XXXX
    new_code := 'OT-' || year_part || '-' || seq_part;
    
    -- Assign to NEW row
    NEW.code := new_code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS set_work_order_code ON public.work_order;

CREATE TRIGGER set_work_order_code
BEFORE INSERT ON public.work_order
FOR EACH ROW
WHEN (NEW.code IS NULL OR NEW.code = '')
EXECUTE FUNCTION generate_work_order_code();

-- 4. Optional: Backfill existing orders if needed (Commented out to be safe)
-- UPDATE public.work_order SET code = 'OT-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD(work_order_id::TEXT, 4, '0') WHERE code IS NULL OR code = '';
