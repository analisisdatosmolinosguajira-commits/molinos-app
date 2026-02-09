-- Create component_state_history view
CREATE OR REPLACE VIEW public.component_state_history AS
SELECT
    dcs.diagnosis_component_status_id as id,
    d.mill_id,
    dcs.component_id,
    mc.name as component_name,
    mc.code as component_code,
    dcs.status as component_status,
    d.diagnosis_date as event_date,
    'DIAGNOSIS' as source_type,
    d.diagnosis_id as source_id,
    d.diagnosis_type,
    dcs.observation as observation,
    dcs.observation as notes -- Alias for compatibility if needed
FROM
    diagnosis_component_status dcs
    JOIN diagnosis d ON dcs.diagnosis_id = d.diagnosis_id
    JOIN mill_component mc ON dcs.component_id = mc.component_id;

-- Grant permissions (standard for public views in this project)
GRANT SELECT ON public.component_state_history TO authenticated;
GRANT SELECT ON public.component_state_history TO anon;
GRANT SELECT ON public.component_state_history TO service_role;
