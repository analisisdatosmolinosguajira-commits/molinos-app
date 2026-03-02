-- Migration: Create Activity Report Delivery Item
-- Description: Creates a table to store individual communities visited and material delivery outcome for daily reports.

CREATE TABLE IF NOT EXISTS public.activity_report_delivery_item (
    item_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    report_id integer NOT NULL REFERENCES activity_daily_report(report_id) ON DELETE CASCADE,
    community_id integer REFERENCES community(community_id), -- Optional strict link, or we just rely on name
    community_name text NOT NULL,
    is_successful boolean DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.activity_report_delivery_item IS 
    'Items for daily reports of type DELIVERY. Tracks individual deliveries per community for the day.';

-- RLS
ALTER TABLE public.activity_report_delivery_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.activity_report_delivery_item
    AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.activity_report_delivery_item
    AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for creators and admins" ON public.activity_report_delivery_item
    AS PERMISSIVE FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable delete for creators and admins" ON public.activity_report_delivery_item
    AS PERMISSIVE FOR DELETE TO authenticated USING (true);

-- Explicit ROLE grants
GRANT ALL ON TABLE public.activity_report_delivery_item TO authenticated;
GRANT ALL ON TABLE public.activity_report_delivery_item TO anon;
GRANT ALL ON TABLE public.activity_report_delivery_item TO service_role;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_report_delivery_report ON activity_report_delivery_item(report_id);
