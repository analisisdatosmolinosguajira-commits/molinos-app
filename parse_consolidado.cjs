const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'migrations', 'Consolidado de comunidades_2026.xlsx');
const wb = XLSX.readFile(filePath);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: null });

// Print ALL rows with ALL columns
data.forEach((row, i) => {
    console.log(`\n========== ROW ${i + 1} / ${data.length} ==========`);
    const fields = {
        item: row['ITEM'],
        municipio: row['MUNICIPIO'],
        comunidad: row['COMUNIDADES VISITADAS'],
        coordenadas: row['COORDENADAS'],
        estado_intervencion: row['ESTADO DE INTERVENCION'],
        diagnostico: row['DIAGNOSTICO'],
        actividades_mto: row['ACTIVIDADES DE MANTENIMIENTO REALIZADAS'],
        fecha_intervencion_2026: row['FECHA DE INTERVENCION 2026'],
        responsable_2026: row['RESPONSABLE DE INTERVENCION'],
        fecha_primera_intervencion_2025: row['FECHA DE PRIMERA INTERVENCION 2025'],
        responsable_2025: row['RESPONSABLE DE INTERVENCION 2025'],
        actividades_2025: row['ACTIVIDADES INICIALES 2025'],
        observaciones: row['OBSERVACIONES'],
        diferencia_meses: row['DIFERENCIA EN MESES'],
        aplica_meta: row['APLICA META?'],
        semana: row['SEMANA'],
        mes: row['MES']
    };
    Object.entries(fields).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
            console.log(`  ${k}: ${String(v)}`);
        }
    });
});

// Print summary of all unique community names
console.log('\n\n========== COMMUNITY NAMES ==========');
const names = data.map(r => r['COMUNIDADES VISITADAS']).filter(Boolean);
names.forEach((n, i) => console.log(`${i + 1}. ${n}`));
