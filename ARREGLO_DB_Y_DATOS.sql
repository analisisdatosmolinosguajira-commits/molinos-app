-- ==========================================
-- SCRIPT DE REPARACIÓN DE BASE DE DATOS MOLINOS
-- ==========================================

-- 1. Asegurar integridad estructural (Foreign Keys)
DO $$ 
BEGIN
    -- FK para mill_has_component -> mill_component
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mill_has_component_component_id_fkey') THEN
        ALTER TABLE mill_has_component
        ADD CONSTRAINT mill_has_component_component_id_fkey
        FOREIGN KEY (component_id)
        REFERENCES mill_component (component_id)
        ON DELETE RESTRICT;
    END IF;

    -- FK para mill_has_component -> mills (si se llama mill, ajustar)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mill_has_component_mill_id_fkey') THEN
        -- Asumiendo que la tabla de molinos se llama 'mill' o 'mills'. Ajustar según schema real.
        -- Si falla, comenta este bloque.
        ALTER TABLE mill_has_component
        ADD CONSTRAINT mill_has_component_mill_id_fkey
        FOREIGN KEY (mill_id)
        REFERENCES mill (id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Poblar Catálogo de Componentes (Si está vacío o faltan)
INSERT INTO mill_component (name, code)
VALUES 
    ('Rotor', 'COMP-ROT'),
    ('Generador', 'COMP-GEN'),
    ('Torre', 'COMP-TOR'),
    ('Freno', 'COMP-FRE'),
    ('Eje', 'COMP-EJE'),
    ('Aspas', 'COMP-ASP'),
    ('Bomba', 'COMP-PUMP'),
    ('Caja de Cambios', 'COMP-GBX'),
    ('Sistema de Orientación', 'COMP-YAW')
ON CONFLICT (code) DO NOTHING;

-- 3. Habilitar RLS pero permitir TODO (Modo Desarrollo/Debug)
ALTER TABLE mill_component ENABLE ROW LEVEL SECURITY;
ALTER TABLE mill_has_component ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas para evitar duplicados/conflictos
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON mill_component;
DROP POLICY IF EXISTS "Enable read for all" ON mill_component;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON mill_has_component;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON mill_has_component;

-- Crear políticas permisivas
CREATE POLICY "Enable all access for authenticated users" 
ON mill_component FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for authenticated users" 
ON mill_has_component FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 4. Verificación de Datos (Para que veas el output en Supabase)
SELECT 'Componentes en Catálogo:' as check_name, COUNT(*) as count FROM mill_component
UNION ALL
SELECT 'Componentes Instalados (Total):', COUNT(*) FROM mill_has_component;

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
