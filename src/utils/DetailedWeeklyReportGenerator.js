import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ActivityExecutionService } from '../services/activityExecution';
import { supabase } from '../services/supabase';

export const generateDetailedWeeklyReport = async (activities, weekStart, weekEnd) => {
    // 1. Filter activities for this week
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const weekActivitiesRaw = activities.filter(a => {
        const start = a.planned_start_week;
        const end = a.planned_end_week || start;
        return weekEndStr >= start && weekStartStr <= end;
    });

    if (weekActivitiesRaw.length === 0) {
        alert("No hay actividades en esta semana para generar el informe detallado.");
        return;
    }

    const doc = new jsPDF();

    // Header Drawer
    const drawHeader = (doc) => {
        doc.setFontSize(20);
        doc.setTextColor(30, 64, 175); // blue-800
        doc.setFont("helvetica", "bold");
        doc.text("MOLINOS GUAJIRA", 14, 20);

        doc.setFontSize(14);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text("Informe Detallado de Actividades Semanales", 14, 28);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont("helvetica", "normal");
        doc.text(`Semana: ${weekStart.toLocaleDateString('es-ES')} al ${weekEnd.toLocaleDateString('es-ES')}`, 14, 34);
        doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 39);

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(14, 43, 196, 43);
    };

    drawHeader(doc);
    let startY = 50;

    for (let i = 0; i < weekActivitiesRaw.length; i++) {
        const rawAct = weekActivitiesRaw[i];

        // Fetch deep details
        let activityFull, reports, attendance, journeys;
        try {
            activityFull = await ActivityExecutionService.getActivityFullDetails(rawAct.activity_id);
            reports = await ActivityExecutionService.getDailyReports(rawAct.activity_id);
            attendance = await ActivityExecutionService.getAttendance(rawAct.activity_id) || [];

            // Fetch related journeys directly
            const { data: movementData } = await supabase
                .from('movement')
                .select(`
                    movement_id, title, objective, start_date, end_date, notes, status,
                    movement_vehicle ( vehicle (plate_number, model) ),
                    movement_log ( log_date, description, incident_reported, incident_details ),
                    movement_community ( community (name) )
                `)
                .eq('related_activity_id', rawAct.activity_id);
            journeys = movementData || [];
        } catch (e) {
            console.error("Error fetching data for activity", rawAct.activity_id, e);
            continue; // Skip if fails
        }

        // Check if we need a new page for this activity
        // (if not the first one, always new page to keep clean separation)
        if (i > 0) {
            doc.addPage();
            drawHeader(doc);
            startY = 50;
        }

        // Activity Title
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.setFont("helvetica", "bold");
        const titleLines = doc.splitTextToSize(`Actividad: ${activityFull.title}`, 180);
        doc.text(titleLines, 14, startY);
        startY += (titleLines.length * 6) + 4;

        // Safely determine activity type name (might be populated in rawAct if not in activityFull)
        const typeName = activityFull.activity_type?.name || rawAct.activity_type?.name || '-';

        // Metadata table for activity
        autoTable(doc, {
            startY: startY,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1 },
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 35 },
                1: { textColor: [15, 23, 42] }
            },
            body: [
                ['Tipo:', typeName],
                ['Estado:', activityFull.status],
                ['Ubicación:', activityFull.location || '-'],
                ['Cuadrilla:', activityFull.crew?.name || 'Sin asignar'],
                ['Responsable:', activityFull.responsible ? `${activityFull.responsible.first_name} ${activityFull.responsible.last_name}` : 'Sin asignar']
            ]
        });

        startY = doc.lastAutoTable.finalY + 10;

        // 1. Related Entities
        const relatedEntitiesBody = [];
        if (activityFull.work_order && activityFull.work_order.length > 0) {
            activityFull.work_order.forEach(wo => {
                const desc = wo.description ? `\n> ${wo.description.substring(0, 100)}${wo.description.length > 100 ? '...' : ''}` : '';
                relatedEntitiesBody.push(['OT:', `${wo.code || `ID: ${wo.work_order_id}`}${desc}`, wo.status]);
            });
        }
        if (activityFull.diagnosis && activityFull.diagnosis.length > 0) {
            activityFull.diagnosis.forEach(d => {
                const notes = d.notes ? `\n> ${d.notes.substring(0, 100)}${d.notes.length > 100 ? '...' : ''}` : '';
                relatedEntitiesBody.push(['Diagnóstico:', `${d.code || `ID: ${d.diagnosis_id}`}${notes}`, d.mill?.name || '-']);
            });
        }
        if (activityFull.concertation && activityFull.concertation.length > 0) {
            activityFull.concertation.forEach(c => {
                const details = c.conditions || c.decision || '';
                const notes = details ? `\n> ${details.substring(0, 100)}${details.length > 100 ? '...' : ''}` : '';
                relatedEntitiesBody.push(['Concertación:', `${c.code || `ID: ${c.concertation_id}`}${notes}`, c.community?.name || '-']);
            });
        }
        if (activityFull.manufacturing_order && activityFull.manufacturing_order.length > 0) {
            activityFull.manufacturing_order.forEach(mo => {
                // Manufacturing orders might not have a long description column in this view, so we just show code and status
                relatedEntitiesBody.push(['Fabricación:', mo.code || `ID: ${mo.mo_id}`, mo.status]);
            });
        }

        if (relatedEntitiesBody.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text("Órdenes y Procesos Relacionados", 14, startY);
            startY += 6;

            autoTable(doc, {
                startY: startY,
                body: relatedEntitiesBody,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 35 },
                    1: { cellWidth: 100 }
                }
            });
            startY = doc.lastAutoTable.finalY + 10;
        }

        // 2. Format Journeys
        if (journeys.length > 0) {
            if (startY > 250) { doc.addPage(); drawHeader(doc); startY = 50; }
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text("Información de Desplazamientos (Viajes)", 14, startY);
            startY += 6;

            journeys.forEach((journey, jIndex) => {
                if (startY > 250) { doc.addPage(); drawHeader(doc); startY = 50; }

                doc.setFillColor(241, 245, 249);
                doc.rect(14, startY - 4, 182, 8, 'F');
                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.setFont("helvetica", "bold");
                doc.text(`Viaje ${jIndex + 1}: ${journey.title || 'Desplazamiento'} (${journey.status})`, 16, startY + 1);
                startY += 8;

                const vehicles = journey.movement_vehicle?.map(mv => `${mv.vehicle?.plate_number} (${mv.vehicle?.model})`).join(', ') || 'Sin vehículo';
                const communities = journey.movement_community?.map(mc => mc.community?.name).filter(Boolean).join(', ') || 'No definidas';

                autoTable(doc, {
                    startY: startY,
                    theme: 'plain',
                    styles: { fontSize: 9, cellPadding: 1 },
                    columnStyles: { 0: { fontStyle: 'bold', textColor: [71, 85, 105], cellWidth: 35 } },
                    body: [
                        ['Objetivo:', journey.objective],
                        ['Fechas:', `${journey.start_date || '-'} al ${journey.end_date || 'En curso'}`],
                        ['Vehículos:', vehicles],
                        ['Comunidades:', communities],
                        ['Notas:', journey.notes || '-']
                    ]
                });
                startY = doc.lastAutoTable.finalY + 4;

                if (journey.movement_log && journey.movement_log.length > 0) {
                    const logsBody = journey.movement_log.map(l => [
                        l.log_date,
                        l.incident_reported ? '⚠️ Incidente' : 'Normal',
                        l.description + (l.incident_details ? `\nDetalle: ${l.incident_details}` : '')
                    ]);

                    autoTable(doc, {
                        startY: startY,
                        head: [['Fecha', 'Tipo', 'Descripción de la Bitácora']],
                        body: logsBody,
                        theme: 'grid',
                        headStyles: { fillColor: [226, 232, 240], textColor: [71, 85, 105] },
                        styles: { fontSize: 8 },
                        margin: { left: 16 }
                    });
                    startY = doc.lastAutoTable.finalY + 6;
                } else {
                    startY += 2;
                }
            });
        }

        // 3. Format Attendance
        if (activityFull.crew && activityFull.crew.crew_member && activityFull.crew.crew_member.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text("Control de Asistencia General", 14, startY);
            startY += 6;

            const attBody = [];
            // We group attendance by person to show total days present
            const personStats = {};
            activityFull.crew.crew_member.forEach(m => {
                if (m.person) {
                    personStats[m.person_id] = { name: `${m.person.first_name} ${m.person.last_name}`, role: m.role_in_crew || '-', present: 0, notes: [] };
                }
            });

            // Grouping attendance history records
            if (Array.isArray(attendance)) {
                attendance.forEach(att => {
                    if (personStats[att.person_id]) {
                        if (att.present) personStats[att.person_id].present++;
                        if (att.notes) personStats[att.person_id].notes.push(`${att.date}: ${att.notes}`);
                    }
                });
            }

            Object.values(personStats).forEach(p => {
                attBody.push([p.name, p.role, `${p.present} días asis.`, p.notes.join(' | ')]);
            });

            autoTable(doc, {
                startY: startY,
                head: [['Nombre', 'Rol', 'Asistencia', 'Novedades']],
                body: attBody,
                theme: 'grid',
                headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
                styles: { fontSize: 9 }
            });

            startY = doc.lastAutoTable.finalY + 10;
        }

        // 4. Format Daily Reports
        if (reports && reports.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(30, 64, 175);
            doc.text("Reportes Técnicos Diarios", 14, startY);
            startY += 6;

            reports.forEach(report => {

                // Check page bounds before drawing report block
                if (startY > 250) {
                    doc.addPage();
                    drawHeader(doc);
                    startY = 50;
                }

                doc.setFontSize(10);
                doc.setTextColor(15, 23, 42);
                doc.setFont("helvetica", "bold");

                const reportTypeName = {
                    'FABRICATION': 'Fabricación',
                    'MAINTENANCE': 'Mantenimiento en Terreno',
                    'CONCERTATION': 'Concertación',
                    'DELIVERY': 'Entrega de Materiales',
                    'GENERAL': 'Avance General'
                }[report.report_type] || report.report_type;

                // Header box for the day
                doc.setFillColor(241, 245, 249);
                doc.rect(14, startY - 4, 182, 8, 'F');
                doc.text(`Día: ${report.report_date} - ${reportTypeName}`, 16, startY + 1);
                startY += 8;

                const repBody = [];
                if (report.report_type === 'FABRICATION' && report.fabrication_items) {
                    report.fabrication_items.forEach(fi => {
                        repBody.push([fi.piece_name, `Meta: ${fi.target_quantity}`, `Prod: ${fi.produced_quantity}`, `Def: ${fi.defective_quantity}`]);
                    });
                } else if (report.report_type === 'MAINTENANCE' && report.maintenance_items) {
                    report.maintenance_items.forEach(mi => {
                        repBody.push([mi.community_name || 'Terreno', mi.is_reintervention ? '(Reintervención)' : '', 'Detalles:', mi.technical_report || '']);
                    });
                } else if (report.report_type === 'CONCERTATION' && report.concertation_items) {
                    report.concertation_items.forEach(ci => {
                        repBody.push(['Comunidad:', ci.community_name, 'Resumen:', ci.concertation_summary || '']);
                    });
                } else if (report.report_type === 'DELIVERY' && report.delivery_items) {
                    report.delivery_items.forEach(di => {
                        repBody.push(['Comunidad:', di.community_name, di.is_successful ? '✅ Exitoso' : '❌ Fallido', di.notes || '']);
                    });
                }

                if (repBody.length > 0) {
                    autoTable(doc, {
                        startY: startY,
                        body: repBody,
                        theme: 'plain',
                        styles: { fontSize: 9, cellPadding: 2, textColor: [71, 85, 105] },
                        columnStyles: { 0: { fontStyle: 'bold' } }
                    });
                    startY = doc.lastAutoTable.finalY + 2;
                }

                if (report.general_notes) {
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.setTextColor(100, 116, 139);
                    const notesLines = doc.splitTextToSize(`Notas Adicionales: ${report.general_notes}`, 178);
                    doc.text(notesLines, 16, startY);
                    startY += (notesLines.length * 4) + 4;
                }

                startY += 4;
            });
        } else {
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.setFont("helvetica", "italic");
            doc.text("No se registraron reportes técnicos para esta actividad.", 14, startY);
            startY += 10;
        }

        // 5. Completion Notes
        if (activityFull.completion_notes) {
            if (startY > 250) {
                doc.addPage();
                drawHeader(doc);
                startY = 50;
            }
            doc.setFontSize(12);
            doc.setTextColor(15, 128, 61); // green-700
            doc.setFont("helvetica", "bold");
            doc.text("Resumen de Cierre", 14, startY);
            startY += 6;

            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            doc.setTextColor(15, 23, 42); // slate-900
            const compLines = doc.splitTextToSize(`"${activityFull.completion_notes}"`, 180);
            doc.text(compLines, 14, startY);
            startY += (compLines.length * 5) + 6;
        }

    } // end activity loop

    doc.save(`Molinos_Informe_Detallado_Semana_${weekStartStr}.pdf`);
};
