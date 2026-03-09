const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'supabase', 'migrations', 'ComunidadesProyectoMolinos- 2026.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const result = {};

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        // Convert to json, raw data
        const data = XLSX.utils.sheet_to_json(sheet, { defval: null });

        if (data.length > 0) {
            result[sheetName] = {
                headers: Object.keys(data[0]),
                rowCount: data.length,
                sample: data.slice(0, 3) // first 3 rows
            };
        } else {
            result[sheetName] = { empty: true };
        }
    });

    console.log(JSON.stringify(result, null, 2));
} catch (error) {
    console.error("Error reading excel:", error.message);
}
