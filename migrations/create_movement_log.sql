-- Migration: Create Movement Log Table
-- Description: Adds movement_log table for tracking daily events/outings within a multi-day trip
-- Dependencies: Requires movement table

CREATE TABLE IF NOT EXISTS public.movement_log (
    log_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    movement_id integer NOT NULL REFERENCES public.movement(movement_id) ON DELETE CASCADE,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    activity_type varchar(50) CHECK (activity_type IN ('SALIDA_CAMPO', 'PERNOCTA', 'RETORNO_CENTRO', 'INCIDENCIA', 'OTRO')),
    description text,
    incident_reported boolean DEFAULT false,
    incident_details text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.movement_log IS 
    'Daily logs for multi-day trips. Records field outings, overnight stays, and incidents.';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_movement_log_movement ON public.movement_log(movement_id);
CREATE INDEX IF NOT EXISTS idx_movement_log_date ON public.movement_log(log_date);
CREATE INDEX IF NOT EXISTS idx_movement_log_type ON public.movement_log(activity_type);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_movement_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_movement_log_updated_at
    BEFORE UPDATE ON public.movement_log
    FOR EACH ROW
    EXECUTE FUNCTION update_movement_log_updated_at();

-- RLS Policies (assuming standard project RLS)
ALTER TABLE public.movement_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for authenticated users" ON public.movement_log
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
