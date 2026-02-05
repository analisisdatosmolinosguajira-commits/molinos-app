
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import PDFDocument from "npm:pdfkit";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { millId } = await req.json();

    if (!millId) {
      throw new Error('Mill ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all required data
    const { data: mill, error: millError } = await supabase
      .from('mill_profile')
      .select('*')
      .eq('mill_id', millId)
      .single();

    if (millError) throw millError;

    // Fetch technical specs (Pump, Component Matrix)
    const { data: pump } = await supabase
      .from('mill_pump')
      .select('*, pump(*)')
      .eq('mill_id', millId)
      .is('removed_date', null)
      .single();

    // Fetch Social Info
    const { data: community } = await supabase
      .from('mill_community')
      .select('*, community(*)')
      .eq('mill_id', millId)
      .order('relationship_type', { ascending: true }) // Primary first
      .limit(1)
      .single();

    // Fetch Active Social Situations
    const { data: socialSituations } = await supabase
      .from('community_social_situation')
      .select('*')
      .eq('community_id', community?.community_id)
      .eq('status', 'active');

    // Fetch Recent Work Orders
    const { data: workOrders } = await supabase
      .from('work_order')
      .select('*')
      .eq('mill_id', millId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Uint8Array[] = [];

    doc.on('data', buffers.push.bind(buffers));

    // --- PDF CONTENT GENERATION ---

    // 1. Header & Branding
    // Add SENA logo (using public URL)
    // Note: For production, better to fetch and embed properly
    // doc.image('logo_url', 50, 45, { width: 50 });

    doc.fontSize(24).fillColor('#1e293b').text('Reporte Técnico de Molino', 50, 50, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#64748b').text(`Generado el: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });
    doc.moveDown(2);

    // 2. Executive Summary (Mill Profile)
    doc.roundedRect(50, 140, 495, 120, 8).fill('#f8fafc').stroke('#e2e8f0');

    doc.fillColor('#1e293b').fontSize(16).text(mill.code, 70, 160);
    doc.fontSize(10).fillColor('#64748b').text('Código del Activo');

    doc.fillColor(mill.status === 'OPERATIONAL' ? '#16a34a' : '#ea580c')
      .fontSize(12)
      .text(mill.status === 'OPERATIONAL' ? 'OPERATIVO' : mill.status, 450, 165, { align: 'right' });

    // Metrics Grid
    const metricsY = 200;
    doc.fillColor('#1e293b').fontSize(12);

    // Col 1
    doc.text('Tiempo en Servicio', 70, metricsY);
    doc.font('Helvetica-Bold').text(`${mill.days_since_installation || 0} Días`, 70, metricsY + 15).font('Helvetica');

    // Col 2
    doc.text('Eficiencia (Cierre OT)', 230, metricsY);
    doc.font('Helvetica-Bold').text(`${mill.completion_rate || 0}%`, 230, metricsY + 15).font('Helvetica');

    // Col 3
    doc.text('Diagnósticos Totales', 390, metricsY);
    doc.font('Helvetica-Bold').text(`${mill.total_diagnoses || 0}`, 390, metricsY + 15).font('Helvetica');

    doc.moveDown(4);

    // 3. Technical Specifications
    doc.fontSize(14).fillColor('#334155').text('Especificaciones Técnicas', 50, 300);
    doc.moveTo(50, 315).lineTo(545, 315).strokeColor('#e2e8f0').stroke();

    doc.moveDown(1);
    doc.fontSize(10).fillColor('#1e293b');

    doc.text(`Fecha de Instalación: ${new Date(mill.installation_date).toLocaleDateString()}`);
    doc.moveDown(0.5);

    if (pump?.pump) {
      doc.text(`Bomba Instalada: ${pump.pump.model} (Serial: ${pump.pump.serial_number})`);
    } else {
      doc.text('Bomba Instalada: Ninguna');
    }

    doc.moveDown(0.5);
    doc.text(`Ubicación GPS: ${mill.latitude || 'N/A'}, ${mill.longitude || 'N/A'}`);

    doc.moveDown(2);

    // 4. Social Context
    doc.fontSize(14).fillColor('#334155').text('Contexto Social', 50, doc.y);
    doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1.5);

    if (community?.community) {
      doc.fontSize(12).font('Helvetica-Bold').text(community.community.name);
      doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(community.community.sector || 'Sector no especificado');

      doc.moveDown(0.5);
      doc.fillColor('#1e293b').text(community.community.description || 'Sin descripción disponible.');

      if (socialSituations && socialSituations.length > 0) {
        doc.moveDown(1);
        doc.fillColor('#ea580c').text(`⚠️ ${socialSituations.length} Situaciones Sociales Activas`, { underline: true });

        socialSituations.forEach(sit => {
          doc.moveDown(0.5);
          doc.fillColor('#334155').text(`• [${sit.severity}] ${sit.title}: ${sit.description}`);
        });
      }
    } else {
      doc.text('No hay comunidad asignada oficialmente.');
    }

    doc.moveDown(2);

    // 5. Recent Activity (Work Orders)
    doc.fontSize(14).fillColor('#334155').text('Órdenes de Trabajo Recientes', 50, doc.y);
    doc.moveTo(50, doc.y + 15).lineTo(545, doc.y + 15).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1.5);

    if (workOrders && workOrders.length > 0) {
      workOrders.forEach(wo => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${wo.code || 'OT'} - ${wo.type.toUpperCase()}`);
        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(new Date(wo.created_at).toLocaleDateString());
        doc.fillColor('#1e293b').text(wo.description || 'Sin descripción');
        doc.text(`Estado: ${wo.status} | Prioridad: ${wo.priority}`);
        doc.moveDown(1);
      });
    } else {
      doc.text('No hay órdenes de trabajo recientes.');
    }

    // Footer
    doc.fontSize(8).fillColor('#94a3b8').text('Generado por Sistema de Gestión de Molinos', 50, 750, { align: 'center' });

    doc.end();

    // Convert to Buffer
    const pdfBuffer = await new Promise<Uint8Array>((resolve) => {
      doc.on('end', () => {
        resolve(Uint8Array.from(Buffer.concat(buffers)));
      });
    });

    // Return PDF as downloadable file
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Reporte_${mill.code}.pdf"`,
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
