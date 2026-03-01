import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cigrhwfvusnqgzcjcbav.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZ3Jod2Z2dXNucWd6Y2pjYmF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc1NzczMjQsImV4cCI6MjA1MzE1MzMyNH0.RYfkFG1JEYuNLjCbSa55HJ6mSQfKmpcgGxmR3FKqRyA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('🔧 Creating SST tables...');

    // 1. epp_role_requirement — EPPs required per role
    const { error: e1 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS epp_role_requirement (
                id SERIAL PRIMARY KEY,
                role_id INTEGER NOT NULL REFERENCES person_role(role_id) ON DELETE CASCADE,
                safety_id INTEGER NOT NULL REFERENCES safety_equipment(safety_id) ON DELETE CASCADE,
                body_zone TEXT NOT NULL CHECK (body_zone IN ('HEAD', 'EYES', 'EARS', 'FACE', 'HANDS', 'FEET', 'TORSO', 'LEGS', 'FULL_BODY')),
                renewal_months INTEGER NOT NULL DEFAULT 6,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(role_id, safety_id)
            );
        `
    });

    if (e1) {
        console.log('⚠️  epp_role_requirement (may need manual creation):', e1.message);
    } else {
        console.log('✅ epp_role_requirement created');
    }

    // 2. epp_delivery — Delivery header
    const { error: e2 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS epp_delivery (
                delivery_id SERIAL PRIMARY KEY,
                delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
                delivered_by UUID REFERENCES auth.users(id),
                notes TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (e2) {
        console.log('⚠️  epp_delivery (may need manual creation):', e2.message);
    } else {
        console.log('✅ epp_delivery created');
    }

    // 3. epp_delivery_item — Delivery items
    const { error: e3 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS epp_delivery_item (
                item_id SERIAL PRIMARY KEY,
                delivery_id INTEGER NOT NULL REFERENCES epp_delivery(delivery_id) ON DELETE CASCADE,
                person_id INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
                safety_id INTEGER NOT NULL REFERENCES safety_equipment(safety_id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL DEFAULT 1,
                condition TEXT NOT NULL DEFAULT 'NUEVO' CHECK (condition IN ('NUEVO', 'REPOSICION', 'ACTIVIDAD_ESPECIFICA')),
                size TEXT,
                expires_at DATE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (e3) {
        console.log('⚠️  epp_delivery_item (may need manual creation):', e3.message);
    } else {
        console.log('✅ epp_delivery_item created');
    }

    // 4. person_certification — Person certifications
    const { error: e4 } = await supabase.rpc('exec_sql', {
        sql: `
            CREATE TABLE IF NOT EXISTS person_certification (
                cert_id SERIAL PRIMARY KEY,
                person_id INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
                cert_name TEXT NOT NULL,
                cert_type TEXT NOT NULL DEFAULT 'OTRO' CHECK (cert_type IN ('TSA', 'ALTURAS', 'PRIMEROS_AUXILIOS', 'ESPACIOS_CONFINADOS', 'ELECTRICO', 'OTRO')),
                issued_date DATE,
                expires_at DATE,
                institution TEXT,
                certificate_url TEXT,
                status TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE', 'VENCIDO', 'POR_VENCER')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `
    });

    if (e4) {
        console.log('⚠️  person_certification (may need manual creation):', e4.message);
    } else {
        console.log('✅ person_certification created');
    }

    console.log('\n📋 If RPC failed, run this SQL directly in Supabase SQL Editor:');
    console.log('─'.repeat(60));
    console.log(MANUAL_SQL);
}

const MANUAL_SQL = `
-- SST Module Tables
-- Run this in Supabase SQL Editor if the script can't execute RPC

-- 1. EPP requirements per role
CREATE TABLE IF NOT EXISTS epp_role_requirement (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES person_role(role_id) ON DELETE CASCADE,
    safety_id INTEGER NOT NULL REFERENCES safety_equipment(safety_id) ON DELETE CASCADE,
    body_zone TEXT NOT NULL CHECK (body_zone IN ('HEAD', 'EYES', 'EARS', 'FACE', 'HANDS', 'FEET', 'TORSO', 'LEGS', 'FULL_BODY')),
    renewal_months INTEGER NOT NULL DEFAULT 6,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, safety_id)
);

-- 2. EPP delivery header
CREATE TABLE IF NOT EXISTS epp_delivery (
    delivery_id SERIAL PRIMARY KEY,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivered_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EPP delivery items
CREATE TABLE IF NOT EXISTS epp_delivery_item (
    item_id SERIAL PRIMARY KEY,
    delivery_id INTEGER NOT NULL REFERENCES epp_delivery(delivery_id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
    safety_id INTEGER NOT NULL REFERENCES safety_equipment(safety_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    condition TEXT NOT NULL DEFAULT 'NUEVO' CHECK (condition IN ('NUEVO', 'REPOSICION', 'ACTIVIDAD_ESPECIFICA')),
    size TEXT,
    expires_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Person certifications
CREATE TABLE IF NOT EXISTS person_certification (
    cert_id SERIAL PRIMARY KEY,
    person_id INTEGER NOT NULL REFERENCES person(person_id) ON DELETE CASCADE,
    cert_name TEXT NOT NULL,
    cert_type TEXT NOT NULL DEFAULT 'OTRO' CHECK (cert_type IN ('TSA', 'ALTURAS', 'PRIMEROS_AUXILIOS', 'ESPACIOS_CONFINADOS', 'ELECTRICO', 'OTRO')),
    issued_date DATE,
    expires_at DATE,
    institution TEXT,
    certificate_url TEXT,
    status TEXT NOT NULL DEFAULT 'VIGENTE' CHECK (status IN ('VIGENTE', 'VENCIDO', 'POR_VENCER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies (permissive for authenticated users)
ALTER TABLE epp_role_requirement ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE epp_delivery_item ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_certification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON epp_role_requirement FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON epp_delivery FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON epp_delivery_item FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON person_certification FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;

migrate().catch(console.error);
