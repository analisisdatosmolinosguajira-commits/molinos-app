import { supabase } from '../services/supabase.js';
import { WorkOrderService } from '../services/work_orders.js';
import { MillService } from '../services/mills.js';
import { CrewService } from '../services/crews.js';

export async function seedWorkOrders() {
    console.log("🌱 Starting Work Order Seeding...");

    try {
        // 1. Fetch Reference Data
        const [mills, crews, inventory] = await Promise.all([
            MillService.getAllMills(),
            CrewService.getActiveCrews(),
            WorkOrderService.getInventoryOptions()
        ]);

        if (mills.length === 0) throw new Error("No mills found. Cannot seed.");
        if (crews.length === 0) throw new Error("No crews found. Cannot seed.");

        const pieces = inventory.pieces;
        const materials = inventory.materials;
        const tools = inventory.tools;
        const safety = inventory.safety;

        // 2. Define Scenarios
        const scenarios = [

            // Scenario 1: PENDING Preventive Maintenance
            {
                basicInfo: {
                    mill_id: mills[0].mill_id,
                    crew_id: null,
                    type: 'preventivo',
                    priority: 'MEDIUM',
                    status: 'PENDING',
                    description: 'Mantenimiento Preventivo Trimestral',
                    notes: 'Revisar alineación y lubricación general.',
                    scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] // +2 days
                },
                pieces: [],
                materials: [],
                tools: [],
                safety: [],
                components: []
            },

            // Scenario 2: IN_PROGRESS Corrective (Pump Issue)
            {
                basicInfo: {
                    mill_id: mills[1]?.mill_id || mills[0].mill_id,
                    crew_id: crews[0].crew_id,
                    type: 'correctivo',
                    priority: 'HIGH',
                    status: 'IN_PROGRESS',
                    description: 'Ruido anormal en bomba principal',
                    notes: 'Posible desgaste en rodamientos.',
                    scheduled_date: new Date().toISOString().split('T')[0]
                },
                pieces: pieces.slice(0, 1).map(p => ({ piece_id: p.piece_id, quantity_used: 1 })),
                materials: materials.slice(0, 1).map(m => ({ material_id: m.material_id, quantity_used: 0.5 })),
                tools: tools.slice(0, 2).map(t => ({ tool_id: t.tool_id, quantity: 1 })),
                safety: safety.slice(0, 2).map(s => ({ safety_id: s.safety_id, quantity_required: 1 })),
                components: []
            },

            // Scenario 3: COMPLETED Emergency (Blade Replacement)
            {
                basicInfo: {
                    mill_id: mills[2]?.mill_id || mills[0].mill_id,
                    crew_id: crews[0].crew_id,
                    type: 'emergencia',
                    priority: 'CRITICAL',
                    status: 'COMPLETED',
                    description: 'Rotura de aspa por vientos fuertes',
                    notes: 'Se reemplazó aspa y se verificó balanceo.',
                    scheduled_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] // -5 days
                },
                pieces: pieces.slice(1, 2).map(p => ({ piece_id: p.piece_id, quantity_used: 1 })),
                materials: materials.slice(1, 2).map(m => ({ material_id: m.material_id, quantity_used: 2.5 })),
                tools: tools.slice(0, 3).map(t => ({ tool_id: t.tool_id, quantity: 1 })),
                safety: safety.slice(0, 3).map(s => ({ safety_id: s.safety_id, quantity_required: 1 })),
                components: [
                    { component_id: 1, status: 'FUNCIONAL', observation: 'Reemplazada nueva' }, // Assuming IDs, but service handles fetch if needed. simpler loop below.
                ]
            },
            // Scenario 4: PENDING Optimization
            {
                basicInfo: {
                    mill_id: mills[0].mill_id,
                    crew_id: null,
                    type: 'mejora',
                    priority: 'LOW',
                    status: 'PENDING',
                    description: 'Instalación de sensor remoto',
                    notes: 'Pendiente llegada de equipo.',
                    scheduled_date: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0]
                },
                pieces: [],
                materials: [],
                tools: [],
                safety: [],
                components: []
            },
            // Scenario 5: IN_PROGRESS Diagnosis
            {
                basicInfo: {
                    mill_id: mills[1]?.mill_id || mills[0].mill_id,
                    crew_id: crews[1]?.crew_id || crews[0].crew_id,
                    type: 'preventivo',
                    priority: 'MEDIUM',
                    status: 'IN_PROGRESS',
                    description: 'Inspección Rutinaria de Torre',
                    notes: 'Verificar corrosión en estructura.',
                    scheduled_date: new Date().toISOString().split('T')[0]
                },
                pieces: [],
                materials: [],
                tools: tools.slice(2, 3).map(t => ({ tool_id: t.tool_id, quantity: 1 })),
                safety: safety.slice(0, 2).map(s => ({ safety_id: s.safety_id, quantity_required: 2 })),
                components: []
            }
        ];

        // 3. Create Work Orders
        const createdOrders = [];
        for (const [index, scenario] of scenarios.entries()) {
            console.log(`Creating Order ${index + 1}: ${scenario.basicInfo.description}`);

            // Special handling for components in scenario 3: fetch actual component IDs first
            if (scenario.components.length > 0) {
                const millComps = await WorkOrderService.getMillComponents(scenario.basicInfo.mill_id);
                if (millComps.length > 0) {
                    scenario.components = millComps.map(mc => ({
                        component_id: mc.component_id,
                        status: 'FUNCIONAL',
                        observation: 'Verificado post-reparación'
                    }));
                    // Mark one as replaced if needed
                    scenario.components[0].status = 'FUNCIONAL';
                    scenario.components[0].observation = 'Reemplazado nuevo';
                }
            }

            try {
                const order = await WorkOrderService.createWorkOrder(scenario);
                createdOrders.push(order);
                console.log(`✅ Order ${order.work_order_id} created.`);
            } catch (err) {
                console.error(`❌ Failed to create order ${index + 1}:`, err);
            }
        }

        console.log("🎉 Seeding Completed!", createdOrders);
        return createdOrders;

    } catch (error) {
        console.error("🔥 Seeding Failed:", error);
        throw error;
    }
}
