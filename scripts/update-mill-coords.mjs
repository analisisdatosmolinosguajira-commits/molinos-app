/**
 * Script to update mill coordinates to rural/indigenous zones across La Guajira
 * Run: node --env-file=.env.local scripts/update-mill-coords.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Rural/indigenous zones across northern La Guajira
// Spread across rancherías, veredas, and resguardos wayúu
const RURAL_ZONES = [
    // --- Alta Guajira (Uribia - zona indígena dispersa) ---
    { lat: 12.0500, lng: -71.9800, zone: 'Alta Guajira - Nazareth' },
    { lat: 12.1200, lng: -71.8500, zone: 'Alta Guajira - Puerto Estrella' },
    { lat: 12.2000, lng: -72.0500, zone: 'Alta Guajira - Bahía Hondita' },
    { lat: 12.0800, lng: -72.1200, zone: 'Alta Guajira - Castilletes' },
    { lat: 11.9500, lng: -71.7800, zone: 'Alta Guajira - Cabo de la Vela' },
    { lat: 11.9800, lng: -71.9000, zone: 'Ranchería Jasaichi' },
    { lat: 12.1500, lng: -71.9500, zone: 'Ranchería Porshina' },
    { lat: 12.0200, lng: -72.0000, zone: 'Ranchería Warpana' },
    { lat: 11.9200, lng: -71.8300, zone: 'Ranchería Arutkajui' },
    { lat: 12.0600, lng: -71.7500, zone: 'Ranchería Shimarain' },

    // --- Media Guajira rural (entre Uribia y Manaure) ---
    { lat: 11.8500, lng: -72.2000, zone: 'Resguardo Wayúu Jalaala' },
    { lat: 11.8200, lng: -72.3500, zone: 'Ranchería Kamusuchiwo' },
    { lat: 11.7800, lng: -72.1500, zone: 'Ranchería Kasutain' },
    { lat: 11.8800, lng: -72.1000, zone: 'Ranchería Paradero' },
    { lat: 11.8000, lng: -72.5000, zone: 'Zona rural Manaure norte' },
    { lat: 11.7300, lng: -72.1800, zone: 'Ranchería Wanashirra' },
    { lat: 11.8600, lng: -72.2800, zone: 'Ranchería Shapuurain' },
    { lat: 11.7500, lng: -72.3200, zone: 'Ranchería Jepira' },

    // --- Zona costera rural (Manaure - salinas) ---
    { lat: 11.7900, lng: -72.5800, zone: 'Salinas de Manaure - zona rural' },
    { lat: 11.8100, lng: -72.6200, zone: 'Musichi' },
    { lat: 11.7600, lng: -72.5300, zone: 'Ranchería Aremashain' },
    { lat: 11.8300, lng: -72.5500, zone: 'Zona rural costera Manaure' },

    // --- Zona rural Riohacha (sur y este) ---
    { lat: 11.4800, lng: -72.8500, zone: 'Ranchería Contadero' },
    { lat: 11.4200, lng: -72.7800, zone: 'Vereda Tomarrazón' },
    { lat: 11.5200, lng: -72.7000, zone: 'Zona rural Camarones' },
    { lat: 11.3800, lng: -72.8200, zone: 'Vereda Barbacoas' },
    { lat: 11.5600, lng: -72.7500, zone: 'Ranchería Carraipía norte' },
    { lat: 11.4500, lng: -72.6500, zone: 'Arroyo Limón' },
    { lat: 11.5000, lng: -72.8000, zone: 'Vereda Galán' },
    { lat: 11.3500, lng: -72.7500, zone: 'Zona rural sur Riohacha' },

    // --- Zona rural Maicao (resguardos) ---
    { lat: 11.3200, lng: -72.1500, zone: 'Resguardo Wayúu Lomamato' },
    { lat: 11.2800, lng: -72.3000, zone: 'Vereda Paraguachón rural' },
    { lat: 11.4500, lng: -72.1800, zone: 'Ranchería Jarerú' },
    { lat: 11.3500, lng: -72.0800, zone: 'Zona rural La Majayura' },
    { lat: 11.2500, lng: -72.2200, zone: 'Resguardo Zahino' },
    { lat: 11.4000, lng: -72.1000, zone: 'Ranchería Makuira sur' },
    { lat: 11.3000, lng: -72.1200, zone: 'Vereda El Llanito' },

    // --- Dispersos en territorio Wayúu amplio ---
    { lat: 11.6800, lng: -72.0500, zone: 'Sabana wayúu central' },
    { lat: 11.7200, lng: -71.9500, zone: 'Ranchería Etkojo' },
    { lat: 11.6500, lng: -72.4500, zone: 'Entre Manaure y Uribia' },
    { lat: 11.6000, lng: -72.2000, zone: 'Ranchería Tawaira' },
    { lat: 11.5500, lng: -72.3500, zone: 'Ranchería Ipapure' },
    { lat: 11.7000, lng: -72.6000, zone: 'Ranchería Cardón' },
    { lat: 11.6200, lng: -72.1000, zone: 'Ranchería Orroko' },
    { lat: 11.5800, lng: -72.5000, zone: 'Ranchería Urapari' },
    { lat: 11.9000, lng: -72.0500, zone: 'Ranchería Siapana' },
    { lat: 11.6500, lng: -71.9000, zone: 'Ranchería Pusheo' },
    { lat: 11.5200, lng: -72.1500, zone: 'Ranchería Mojaná' },
    { lat: 11.8500, lng: -71.8000, zone: 'Pilón de Azúcar rural' },
    { lat: 11.7800, lng: -72.6500, zone: 'Zona costera wayúu' },
];

async function main() {
    console.log('🔄 Fetching mills...');

    const { data: mills, error } = await supabase
        .from('mill')
        .select('mill_id, code, community_name')
        .order('code');

    if (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }

    console.log(`📍 Found ${mills.length} mills. Distributing across rural La Guajira...`);

    let updated = 0;
    for (let i = 0; i < mills.length; i++) {
        const mill = mills[i];
        const loc = RURAL_ZONES[i % RURAL_ZONES.length];

        // Add random offset ±0.015° (~1.5km) to scatter within zone
        const latOffset = (Math.random() - 0.5) * 0.03;
        const lngOffset = (Math.random() - 0.5) * 0.03;

        const { error: updateError } = await supabase
            .from('mill')
            .update({
                latitude: (loc.lat + latOffset).toFixed(6),
                longitude: (loc.lng + lngOffset).toFixed(6),
            })
            .eq('mill_id', mill.mill_id);

        if (updateError) {
            console.error(`  ❌ ${mill.code}: ${updateError.message}`);
        } else {
            console.log(`  ✅ ${mill.code} → ${loc.zone}`);
            updated++;
        }
    }

    console.log(`\n🎉 Updated ${updated}/${mills.length} mills across rural La Guajira.`);
    process.exit(0);
}

main();
