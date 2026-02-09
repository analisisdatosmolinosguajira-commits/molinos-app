-- Create table for Work Order Material Consumption
CREATE TABLE IF NOT EXISTS public.work_order_material (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER NOT NULL REFERENCES public.work_order(work_order_id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES public.material(material_id) ON DELETE RESTRICT,
    quantity_used NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.work_order_material ENABLE ROW LEVEL SECURITY;

-- Add Permissions (Assuming public access for now as per other tables, or specific roles if needed)
-- Detailed policies can be added later, for now we ensure basic access
CREATE POLICY "Enable all for work_order_material" ON public.work_order_material
FOR ALL USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON public.work_order_material TO anon;
GRANT ALL ON public.work_order_material TO authenticated;
GRANT ALL ON public.work_order_material TO service_role;
