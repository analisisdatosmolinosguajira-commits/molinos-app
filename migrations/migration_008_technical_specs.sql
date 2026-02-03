-- Migration: Add technical_specs_url to mill table
-- Description: Adds a simple text column to store the link/URL to the technical sheet PDF.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mill' AND column_name = 'technical_specs_url') THEN
        ALTER TABLE public.mill ADD COLUMN technical_specs_url TEXT;
    END IF;
END $$;
