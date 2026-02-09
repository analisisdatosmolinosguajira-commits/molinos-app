
import { MillService } from './src/services/mills.js';

async function test() {
    try {
        console.log("Fetching mills...");
        const mills = await MillService.getAllMills();
        const mil1 = mills.find(m => m.code === 'MIL-001');

        console.log("MIL-001 Data:");
        console.log(JSON.stringify(mil1, null, 2));

        if (mil1.active_pump) {
            console.log("Active Pump Found:", mil1.active_pump);
        } else {
            console.log("No Active Pump Found in Service Response.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
