
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cigrhwfvusnqgzcjcbav.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-zlZfhGYWAkKk0im7Y8LZA_OOHGozkM';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pumps = [
    { serial_number: 'P-1001', model: 'Grundfos SP', storage_location: 'Almacén Central', status: 'IN_STOCK' },
    { serial_number: 'P-1002', model: 'Grundfos SQ', storage_location: 'Molino 3', status: 'INSTALLED' },
    { serial_number: 'P-1003', model: 'Lorentz PS2', storage_location: 'Taller', status: 'MAINTENANCE' },
    { serial_number: 'P-1004', model: 'Shurflo 9300', storage_location: 'Almacén Sur', status: 'AVAILABLE' },
    { serial_number: 'P-1005', model: 'SunPumps SDS', storage_location: 'Descarte', status: 'DAMAGED' },
];

async function seedPumps() {
    console.log('Seeding pumps...');
    try {
        const { data, error } = await supabase
            .from('pump')
            .upsert(pumps, { onConflict: 'serial_number' }) // Assuming serial_number is unique or we want to update
            .select();

        if (error) {
            console.error('Error seeding pumps:', error);
        } else {
            console.log('Successfully seeded pumps:', data);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

seedPumps();
