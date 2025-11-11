/**
 * End-of-Day Report Generator
 * Generates PDF reports for end-of-day submissions
 * Uses @react-pdf/renderer for PDF generation
 */

import { createServerClient } from '@/lib/database/client';

/**
 * Generate End-of-Day PDF Report
 * Creates a PDF document with shift summary, NCAs, MJCs, and work orders
 */
export async function generateEndOfDayPDF(
  userId: string,
  entryIds: {
    ncaIds: string[];
    mjcIds: string[];
    workOrderIds: string[];
  },
  shiftNotes?: string
): Promise<Buffer> {
  const supabase = createServerClient();

  // Fetch all data for the report
  const [ncasResult, mjcsResult, workOrdersResult] = await Promise.all([
    supabase
      .from('ncas')
      .select('*')
      .in('id', entryIds.ncaIds),
    supabase
      .from('mjcs')
      .select('*')
      .in('id', entryIds.mjcIds),
    supabase
      .from('work_orders')
      .select('*')
      .in('id', entryIds.workOrderIds),
  ]);

  const ncas = ncasResult.data || [];
  const mjcs = mjcsResult.data || [];
  const workOrders = workOrdersResult.data || [];

  // For now, return a simple text-based report
  // TODO: Implement proper PDF generation with @react-pdf/renderer or puppeteer
  const reportContent = `
END-OF-DAY SUMMARY REPORT
Date: ${new Date().toLocaleDateString('en-GB')}
Operator: ${userId}

WORK ORDERS (${workOrders.length})
${workOrders.map((wo: any) => `- ${wo.wo_number}: ${wo.status}`).join('\n')}

NCAs CREATED (${ncas.length})
${ncas.map((nca: any) => `- ${nca.nca_number}: ${nca.nc_type} - ${nca.status}`).join('\n')}

MJCs CREATED (${mjcs.length})
${mjcs.map((mjc: any) => `- ${mjc.job_card_number}: ${mjc.urgency} - ${mjc.status}`).join('\n')}

${shiftNotes ? `SHIFT NOTES:\n${shiftNotes}` : ''}

Generated: ${new Date().toISOString()}
  `.trim();

  // Convert to Buffer (for now, just text - TODO: implement proper PDF)
  return Buffer.from(reportContent, 'utf-8');
}

