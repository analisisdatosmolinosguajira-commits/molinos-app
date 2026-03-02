import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Fetching activities...");
    const { data, error } = await supabase
        .from('planned_activity')
        .select(`
                *,
                activity_type (activity_type_id, name, description, requires_field_trip),
                responsible_person:person!responsible_person_id (person_id, first_name, last_name, document_id),
                assigned_crew:crew (
                    crew_id, 
                    name, 
                    active,
                    crew_member (
                        role_in_crew,
                        person (first_name, last_name)
                    )
                ),
                target_community:community (community_id, name, department, municipality),
                target_mill:mill (mill_id, code, name, community_name),
                related_movements:movement!movement_related_activity_id_fkey (
                    movement_id, start_date, end_date, objective, title,
                    completion_notes, notes
                ),
                created_by_person:person!created_by (person_id, first_name, last_name),
                related_work_order:work_order!work_order_related_activity_id_fkey (
                    work_order_id, code, status, description, 
                    mill:mill (code, name),
                    completion_notes, notes, pump_installation_notes
                ),
                related_diagnosis:diagnosis!diagnosis_related_activity_id_fkey (
                    diagnosis_id, code, status, diagnosis_date,
                    mill:mill (code, name),
                    technical_findings, completion_notes, notes, pump_observations
                ),
                related_concertation:community_concertation!community_concertation_related_activity_id_fkey (
                    concertation_id, status, meeting_date, code,
                    community:community (name),
                    closing_note, notes
                ),
                related_manufacturing:manufacturing_order!manufacturing_order_related_activity_id_fkey (
                    mo_id, status, notes, piece_id, quantity_planned,
                    piece:piece!piece_id (name)
                )
            `)
        .order('planned_start_week', { ascending: false });

    if (error) {
        console.error("ERROR:", error);
    } else {
        console.log("SUCCESS, found count:", data?.length);
    }
}

test();
