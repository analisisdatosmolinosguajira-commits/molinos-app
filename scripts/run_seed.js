
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

console.log('Loading env from:', envPath);

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            if (key && value && !key.startsWith('#')) {
                process.env[key] = value;
            }
        }
    });
} else {
    console.warn('Warning: .env.local not found at', envPath);
}

// Import the seed function dynamically (or static since type=module)
// import { seedWorkOrders } from '../src/utils/seed_work_orders.js'; // REMOVED STATIC IMPORT

async function run() {
    try {
        const { seedWorkOrders } = await import('../src/utils/seed_work_orders.js');
        await seedWorkOrders();
        console.log('✅ Seeding script finished successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding script failed:', error);
        process.exit(1);
    }
}

run();
