
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateWeeklyReport = (activities, weekStart, weekEnd) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(20);
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text('Reporte Semanal de Actividades', pageWidth / 2, 20, { align: 'center' });

    // Subheader
    doc.setFontSize(12);
    doc.setTextColor(100);
    const dateRange = `${weekStart.toLocaleDateString('es-ES')} - ${weekEnd.toLocaleDateString('es-ES')}`;
    doc.text(`Semana: ${dateRange}`, pageWidth / 2, 30, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, pageWidth / 2, 36, { align: 'center' });

    // Summary Stats
    const stats = {
        total: activities.length,
        completed: activities.filter(a => a.status === 'COMPLETADA').length,
        inProgress: activities.filter(a => a.status === 'EN_EJECUCION').length,
        planned: activities.filter(a => a.status === 'PLANIFICADA').length,
        cancelled: activities.filter(a => a.status === 'CANCELADA').length
    };

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Resumen', 14, 50);

    const summaryData = [
        ['Total Actividades', stats.total],
        ['Completadas', stats.completed],
        ['En Ejecución', stats.inProgress],
        ['Planificadas', stats.planned],
        ['Canceladas', stats.cancelled]
    ];

    autoTable(doc, {
        startY: 55,
        head: [['Estado', 'Cantidad']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 100 },
            1: { cellWidth: 40, halign: 'center' }
        },
        margin: { left: 14 }
    });

    // Detailed Table
    doc.setFontSize(14);
    doc.text('Detalle de Actividades', 14, doc.lastAutoTable.finalY + 15);

    const detailedData = activities.map(act => {
        // Related Entity Info
        let relatedInfo = 'Ninguno';
        let results = act.completion_notes || '';

        if (act.related_work_order) {
            relatedInfo = `OT: ${act.related_work_order.code}\nMolino: ${act.related_work_order.mill?.code || 'N/A'}`;
            results += `\n${act.related_work_order.completion_notes || act.related_work_order.notes || ''}`;
            if (act.related_work_order.pump_installation_notes) results += `\nBomba: ${act.related_work_order.pump_installation_notes}`;
        } else if (act.related_diagnosis) {
            relatedInfo = `Diag: ${act.related_diagnosis.code}\nMolino: ${act.related_diagnosis.mill?.code || 'N/A'}`;
            results += `\n${act.related_diagnosis.technical_findings || act.related_diagnosis.notes || ''}`;
        } else if (act.related_concertation) {
            relatedInfo = `Concertación: ${act.related_concertation.code}`;
            results += `\n${act.related_concertation.closing_note || act.related_concertation.notes || ''}`;
        } else if (act.related_manufacturing) {
            relatedInfo = `Fab: ${act.related_manufacturing.piece?.name}`;
            results += `\n${act.related_manufacturing.notes || ''}`;
        }

        if (act.related_movements && act.related_movements.length > 0) {
            const movs = act.related_movements.map(m => `Mov: ${m.objective || 'Sin objetivo'}`).join('\n');
            relatedInfo += relatedInfo !== 'Ninguno' ? `\n${movs}` : movs;

            const movNotes = act.related_movements
                .map(m => m.completion_notes || m.notes || '')
                .filter(Boolean)
                .join('\n');
            if (movNotes) results += `\n${movNotes}`;
        }

        return [
            act.planned_start_week || 'S/F',
            act.title,
            act.crewName || 'Sin asignar',
            act.status,
            relatedInfo,
            results.trim()
        ];
    });

    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Fecha', 'Actividad', 'Cuadrilla', 'Estado', 'Relacionado A', 'Resultados/Conclusiones']],
        body: detailedData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 40 },
            2: { cellWidth: 25 },
            3: { cellWidth: 20 },
            4: { cellWidth: 30 },
            5: { cellWidth: 'auto' }
        }
    });

    // Save
    const fileName = `Reporte_Semanal_${weekStart.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
};
