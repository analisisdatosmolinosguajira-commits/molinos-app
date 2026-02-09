
import { createClient } from '@supabase/supabase-js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const supabaseUrl = "https://cigrhwfvusnqgzcjcbav.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZ3Jod2Z2dXNucWd6Y2pjYmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NDAxODMsImV4cCI6MjA4NTMxNjE4M30.vb6ldaB-qr0weW6vcwNGBGOLHQCnVkBFC7X7pJa9ZhY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    console.log("Fetching community_role...");
    const { data, error } = await supabase
        .from('community_role')
        .select('*')
        .order('name');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Roles found:", data.length);
        console.log(data);
    }
}

checkRoles();
