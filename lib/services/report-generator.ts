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

  const ncas: any[] = ncasResult.data || [];
  const mjcs: any[] = mjcsResult.data || [];
  const workOrders: any[] = workOrdersResult.data || [];

  // For now, return a simple text-based report
  // TODO: Implement proper PDF generation with @react-pdf/renderer or puppeteer
  const currentDate = new Date().toLocaleDateString('en-GB');
  const reportContent = `
================================================================================
Form 5.7F1 | Procedure 5.7 Rev 9 | BRCGS Issue 7 Section 5
Non-Conformance Advice (NCA) - Controlled Document
Controlled Status: Current | Revision Date: ${currentDate}
================================================================================

END-OF-DAY SUMMARY REPORT
Date: ${currentDate}
Operator: ${userId}

WORK ORDERS (${workOrders.length})
${workOrders.map((wo: any) => `- ${wo.wo_number}: ${wo.status}`).join('\n')}

NCAs CREATED (${ncas.length})
${ncas.map((nca: any) => `- ${nca.nca_number}: ${nca.nc_type} - ${nca.status}`).join('\n')}

MJCs CREATED (${mjcs.length})
${mjcs.map((mjc: any) => `- ${mjc.job_card_number}: ${mjc.urgency} - ${mjc.status}`).join('\n')}

${shiftNotes ? `SHIFT NOTES:\n${shiftNotes}` : ''}

Generated: ${new Date().toISOString()}

================================================================================
Kangopak (Pty) Ltd - BRCGS Certified | Controlled Document - Do Not Copy
This document is a controlled record under the Product Safety and Quality 
Management System (PS & QMS)
================================================================================
  `.trim();

  // Convert to Buffer (for now, just text - TODO: implement proper PDF)
  return Buffer.from(reportContent, 'utf-8');
}

