-- Migration: Create failure_report table
-- Description: Creates a dedicated table for reporting failures/incidents separate from work orders.

CREATE TABLE IF NOT EXISTS public.failure_report (
    report_id SERIAL PRIMARY KEY,
    mill_id INTEGER NOT NULL REFERENCES public.mill(mill_id),
    reported_by_name VARCHAR(100),
    description TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    status VARCHAR(20) CHECK (status IN ('PENDIENTE', 'REVISADO', 'EN_PROCESO', 'RESUELTO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.failure_report ENABLE ROW LEVEL SECURITY;

-- Policy in dev mode (allow all)
CREATE POLICY "Enable all access for dev" ON public.failure_report
    FOR ALL USING (true) WITH CHECK (true);
