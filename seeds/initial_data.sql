
-- Seed Pumps
-- Constraints: origin in ('nueva', 'fabricada', 'reparada'), status in ('instalada', 'almacenada', 'en_reparacion', 'descartada')
INSERT INTO pump (serial_number, model, status, storage_location, origin) VALUES
('P-2024-001', 'Grundfos SQ Flex', 'almacenada', 'Almacén Central', 'nueva'),
('P-2024-002', 'Lorentz PS2-600', 'en_reparacion', 'Taller', 'reparada'),
('P-2024-003', 'Shurflo 9300', 'almacenada', 'Almacén Norte', 'nueva'),
('P-2024-004', 'SunPumps SDS-D', 'descartada', 'Descarte', 'fabricada'),
('P-2024-005', 'Grundfos SP', 'instalada', 'Molino La Esperanza', 'nueva')
ON CONFLICT (serial_number) DO NOTHING;

-- Seed Movements (Visitas / Desplazamientos)
INSERT INTO movement (origin, destination, reason, status, departure_time, vehicle_id, driver_id, description) VALUES
('Base Central', 'Comunidad El Viento', 'Traslado de Personal', 'COMPLETED', NOW() - INTERVAL '2 days', 'HILUX-01', 'Juan Perez', 'Visita de rutina'),
('Taller', 'Molino 4', 'Transporte de Materiales', 'COMPLETED', NOW() - INTERVAL '1 day', 'CAMION-02', 'Carlos Ruiz', 'Entrega de cemento'),
('Base Central', 'Comunidad San Jose', 'Emergencia', 'IN_PROGRESS', NOW(), 'HILUX-03', 'Maria Lopez', 'Reporte de falla critica'),
('Almacén', 'Taller', 'Traslado de Bomba', 'PENDING', NOW() + INTERVAL '1 day', 'HILUX-01', 'Juan Perez', 'Llevar bomba a reparación')
ON CONFLICT DO NOTHING;
