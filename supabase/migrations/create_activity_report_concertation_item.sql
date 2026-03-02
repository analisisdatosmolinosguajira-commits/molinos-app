-- Migration: Create Activity Report Concertation Item
-- Description: Creates a table to store individual community visits and concertation summaries for daily reports.

CREATE TABLE IF NOT EXISTS public.activity_report_concertation_item (
    item_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id integer NOT NULL REFERENCES activity_daily_report(report_id) ON DELETE CASCADE,
    community_name text NOT NULL,
    concertation_summary text NOT NULL,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.activity_report_concertation_item IS 
    'Items for daily reports of type CONCERTATION. Tracks individual communities visited and their concertation summaries.';

-- RLS
ALTER TABLE public.activity_report_concertation_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.activity_report_concertation_item
    AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.activity_report_concertation_item
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for creators and admins" ON public.activity_report_concertation_item
    AS PERMISSIVE FOR UPDATE TO authenticated USING (true); -- simplified for now

CREATE POLICY "Enable delete for creators and admins" ON public.activity_report_concertation_item
    AS PERMISSIVE FOR DELETE TO authenticated USING (true); -- simplified for now

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_report_concert_report ON activity_report_concertation_item(report_id);
