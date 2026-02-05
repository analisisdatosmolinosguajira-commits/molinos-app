
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';

export const PdfGeneratorService = {
    async generateMillReport(millId) {
        try {
            // 1. Fetch All Required Data (Parallel)
            const [millReq, pumpReq, communityReq, workOrdersReq] = await Promise.all([
                // Mill Profile
                supabase.from('mill_profile').select('*').eq('mill_id', millId).maybeSingle(),

                // Pump
                supabase.from('mill_pump').select('*, pump(*)').eq('mill_id', millId).is('removed_date', null).maybeSingle(),

                // Community
                supabase.from('mill_community').select('*, community(*)').eq('mill_id', millId).order('relationship_type', { ascending: true }).limit(1).maybeSingle(),

                // Work Orders
                supabase.from('work_order').select('*').eq('mill_id', millId).order('created_at', { ascending: false }).limit(5)
            ]);

            const mill = millReq.data;
            const pump = pumpReq.data;
            const community = communityReq.data;
            const workOrders = workOrdersReq.data || [];

            // 1.1 Fetch Social Situations if community exists
            let socialSituations = [];
            if (community?.community_id) {
                const { data } = await supabase
                    .from('community_social_situation')
                    .select('*')
                    .eq('community_id', community.community_id)
                    .eq('status', 'active');
                socialSituations = data || [];
            }

            // 2. Initialize PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;

            // Helper for centered text
            const centerText = (text, y) => {
                const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
                const x = (pageWidth - textWidth) / 2;
                doc.text(text, x, y);
            };

            // 3. Header
            doc.setFontSize(22);
            doc.setTextColor(30, 41, 59); // Slate 800
            centerText('Reporte Técnico de Molino', 20);

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139); // Slate 500
            centerText(`Generado el: ${new Date().toLocaleDateString('es-CO')} - ID: ${mill.code}`, 28);

            // 4. Executive Summary Box
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, 35, 182, 35, 3, 3, 'FD');

            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text(mill.code, 20, 45);

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text('Estado Actual:', 20, 52);

            // Status Color
            const isOperational = mill.status === 'OPERATIONAL';
            doc.setTextColor(isOperational ? 22 : 234, isOperational ? 163 : 88, isOperational ? 74 : 12); // Green or Orange
            doc.setFont('helvetica', 'bold');
            doc.text(isOperational ? 'OPERATIVO' : mill.status, 20, 58);

            // Metrics in Box
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text('Tiempo en Servicio:', 80, 45);
            doc.setFont('helvetica', 'bold');
            doc.text(`${mill.days_since_installation || 0} Días`, 80, 52);

            doc.setFont('helvetica', 'normal');
            doc.text('Eficiencia:', 140, 45);
            doc.setFont('helvetica', 'bold');
            doc.text(`${mill.completion_rate || 0}%`, 140, 52);

            // 5. Technical Specs
            let currentY = 85;
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('Especificaciones Técnicas', 14, currentY);
            doc.setDrawColor(203, 213, 225);
            doc.line(14, currentY + 2, 196, currentY + 2);

            currentY += 10;
            const specsData = [
                ['Fecha de Instalación', new Date(mill.installation_date).toLocaleDateString()],
                ['Coordenadas GPS', `${mill.latitude || 'N/A'}, ${mill.longitude || 'N/A'}`],
                ['Tipo de Molino', mill.type || 'Estándar'],
                ['Bomba Instalada', pump?.pump ? `${pump.pump.model} (SN: ${pump.pump.serial_number})` : 'Ninguna']
            ];

            autoTable(doc, {
                startY: currentY,
                head: [],
                body: specsData,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 2 },
                columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
            });

            currentY = doc.lastAutoTable.finalY + 15;

            // 6. Social Context
            doc.setFontSize(14);
            doc.text('Contexto Social', 14, currentY);
            doc.line(14, currentY + 2, 196, currentY + 2);
            currentY += 10;

            if (community?.community) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(community.community.name, 14, currentY);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(community.community.sector || 'Sector no especificado', 14, currentY + 5);

                currentY += 12;
                doc.setTextColor(30, 41, 59);
                const desc = doc.splitTextToSize(community.community.description || 'Sin descripción disponible.', 180);
                doc.text(desc, 14, currentY);
                currentY += desc.length * 5 + 5;

                if (socialSituations.length > 0) {
                    doc.setTextColor(234, 88, 12); // Orange
                    doc.setFont('helvetica', 'bold');
                    doc.text(`⚠️ ${socialSituations.length} Situaciones Sociales Activas`, 14, currentY);
                    currentY += 6;

                    doc.setTextColor(51, 65, 85);
                    doc.setFont('helvetica', 'normal');
                    socialSituations.forEach(sit => {
                        doc.text(`• [${sit.severity}] ${sit.title}`, 20, currentY);
                        currentY += 5;
                    });
                }
            } else {
                doc.setFontSize(10);
                doc.text('No hay comunidad asignada oficialmente.', 14, currentY);
                currentY += 10;
            }

            currentY += 10;

            // 7. Recent Work Orders Table
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text('Órdenes de Trabajo Recientes', 14, currentY);
            doc.line(14, currentY + 2, 196, currentY + 2);

            const tableData = workOrders.map(wo => [
                new Date(wo.created_at).toLocaleDateString(),
                wo.code || 'N/A',
                wo.type.toUpperCase(),
                wo.description || 'Sin descripción',
                wo.status
            ]);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Fecha', 'Código', 'Tipo', 'Descripción', 'Estado']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [71, 85, 105] },
                styles: { fontSize: 8 },
                columnStyles: { 3: { cellWidth: 80 } } // Description column wider
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount} - Sistema de Gestión de Molinos`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }

            // Save
            doc.save(`Reporte_Tecnico_${mill.code}.pdf`);
            return true;

        } catch (error) {
            console.error('Client-side PDF generation error:', error);
            throw error;
        }
    }
};
