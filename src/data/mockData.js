export const mockData = {
    stats: {
        otsAbiertas: 12,
        diagnosticosPendientes: 5,
        concertacionesActivas: 3,
        molinosOperativos: 45,
        molinosInactivos: 8,
        comunidadesImpactadas: 23,
        alertasCriticas: 3
    },
    mills: [
        { mill_id: 1, code: 'MOL-001', name: 'Molino Wayuu 1', status: 'operativo', latitude: 11.544, longitude: -72.907, community: 'Kasushi' },
        { mill_id: 2, code: 'MOL-002', name: 'Molino Ranchería', status: 'mantenimiento', latitude: 11.350, longitude: -72.850, community: 'Ranchería' },
        { mill_id: 3, code: 'MOL-003', name: 'Molino Norte', status: 'inactivo', latitude: 11.775, longitude: -72.445, community: 'Manaure' },
        { mill_id: 4, code: 'MOL-004', name: 'Molino Sur', status: 'operativo', latitude: 11.200, longitude: -72.500, community: 'Uribia' },
    ],
    work_orders: [ // Recent alerts
        { id: 101, type: 'correctivo', priority: 'critica', status: 'atrasada', mill_code: 'MOL-003', description: 'Eje principal partido', date: '2024-02-01' },
        { id: 102, type: 'preventivo', priority: 'alta', status: 'abierta', mill_code: 'MOL-002', description: 'Mantenimiento trimestral', date: '2024-02-05' },
        { id: 103, type: 'correctivo', priority: 'media', status: 'abierta', mill_code: 'MOL-001', description: 'Cambio de empaques', date: '2024-02-06' },
    ],
    movements: [ // Active visits
        { id: 501, crew: 'Cuadrilla Alpha', status: 'en_campo', location: 'Kasushi', check_in: '08:30 AM' },
        { id: 502, crew: 'Cuadrilla Beta', status: 'regreso', location: 'Manaure', check_in: '07:00 AM' }
    ],
    pumps: [
        { id: 'PUMP-001', model: 'Grundfos SP-12', serial: 'GF-2023-889', status: 'instalada', location: 'MOL-001', health: 'bueno' },
        { id: 'PUMP-002', model: 'SolarPump X5', serial: 'SP-2022-112', status: 'almacen', location: 'Bodega Central', health: 'nuevo' },
        { id: 'PUMP-003', model: 'Grundfos SP-12', serial: 'GF-2021-004', status: 'taller', location: 'Taller', health: 'reparacion' },
    ]
};
