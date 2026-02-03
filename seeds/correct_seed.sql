
-- Limpiar datos existentes de prueba (Opcional, ten cuidado si ejecutas esto en producción)
-- TRUNCATE TABLE pump CASCADE;
-- TRUNCATE TABLE movement CASCADE;

-- Insertar Bombas (Pumps)
-- Campos obligatorios segun tabla: origin, status
-- Constraint origin: 'nueva', 'fabricada', 'reparada'
-- Constraint status: 'instalada', 'almacenada', 'en_reparacion', 'descartada'

INSERT INTO pump (serial_number, model, status, storage_location, origin, manufacture_date, notes) VALUES
('P-2024-001', 'Grundfos SQ Flex', 'almacenada', 'Almacén Central', 'nueva', '2023-01-15', 'Bomba lista para asignación'),
('P-2024-002', 'Lorentz PS2-600', 'en_reparacion', 'Taller', 'reparada', '2022-05-20', 'Falla en rodamiento principal'),
('P-2024-003', 'Shurflo 9300', 'almacenada', 'Almacén Norte', 'nueva', '2023-11-10', 'Compra reciente Lote #55'),
('P-2024-004', 'SunPumps SDS-D', 'descartada', 'Descarte', 'fabricada', '2020-03-12', 'Irreparable, carcasa rota'),
('P-2024-005', 'Grundfos SP', 'instalada', 'Molino La Esperanza', 'nueva', '2023-08-01', 'Instalada por cuadrilla A')
ON CONFLICT (serial_number) DO NOTHING;

-- Insertar Movimientos (Movements)
-- Asumiendo campos basados en intentos anteriores exitosos o no fallidos
INSERT INTO movement (origin, destination, reason, status, departure_time, vehicle_id, driver_id, description) VALUES
('Base Central', 'Comunidad El Viento', 'Traslado de Personal', 'COMPLETED', NOW() - INTERVAL '2 days', 'HILUX-01', 'Juan Perez', 'Visita de rutina'),
('Taller', 'Molino 4', 'Transporte de Materiales', 'COMPLETED', NOW() - INTERVAL '1 day', 'CAMION-02', 'Carlos Ruiz', 'Entrega de cemento'),
('Base Central', 'Comunidad San Jose', 'Emergencia', 'IN_PROGRESS', NOW(), 'HILUX-03', 'Maria Lopez', 'Reporte de falla critica'),
('Almacén', 'Taller', 'Traslado de Bomba', 'PENDING', NOW() + INTERVAL '1 day', 'HILUX-01', 'Juan Perez', 'Llevar bomba a reparación')
ON CONFLICT DO NOTHING;
