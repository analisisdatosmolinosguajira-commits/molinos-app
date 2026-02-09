import { createClient } from '@supabase/supabase-js';

// Helper to get env vars in both Vite (browser) and Node environments
const getEnv = (key) => {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
    }
    return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Faltan las credenciales de Supabase en el archivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
