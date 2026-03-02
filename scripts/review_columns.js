import fs from 'fs';

try {
    const rawData = fs.readFileSync('C:/Users/JOSE/.gemini/antigravity/brain/4a544219-c3f2-41f4-b4e5-3a19a719cd2d/.system_generated/steps/3445/output.txt', 'utf8');
    const data = JSON.parse(rawData);

    const relevantTables = [
        'person', 'community', 'vehicle', 'person_certification'
    ];

    data.forEach(t => {
        if (relevantTables.includes(t.name) || t.name.includes('cert')) {
            console.log(`\n=== TABLE: ${t.name} ===`);
            t.columns.forEach(c => {
                console.log(`- ${c.name} (${c.data_type})`);
            });
        }
    });
} catch (e) {
    console.error(e);
}
