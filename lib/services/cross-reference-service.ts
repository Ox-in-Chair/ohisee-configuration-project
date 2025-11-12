/**
 * Cross-Reference Service
 * Provides cross-procedure references and navigation
 * PRD Enhancement: Enhanced Cross-Referencing
 */

import { createServerClient } from '@/lib/database/client';

export type RecordType = 'nca' | 'mjc' | 'waste-manifest' | 'complaint' | 'recall' | 'work-order';

export interface CrossReference {
  recordType: RecordType;
  recordId: string;
  recordNumber: string;
  title: string;
  status: string;
  procedureReference: string;
  formNumber: string;
  createdAt: string;
  link: string;
}

/**
 * Get all related records for a given record
 */
export async function getRelatedRecords(
  recordType: RecordType,
  recordId: string
): Promise<CrossReference[]> {
  try {
    const supabase = createServerClient();
    const references: CrossReference[] = [];

    switch (recordType) {
      case 'nca': {
        // Get related records for NCA
        const nca = await (supabase.from('ncas') as any).select('*').eq('id', recordId).single();

        if (nca.data) {
          const ncaData = nca.data as any;

          // Get linked MJC
          if (ncaData.linked_mjc_id) {
            const mjc = await (supabase
              .from('mjcs') as any)
              .select('id, job_card_number, status, created_at')
              .eq('id', ncaData.linked_mjc_id)
              .single();

            if (mjc.data) {
              const mjcData = mjc.data as any;
              references.push({
                recordType: 'mjc',
                recordId: mjcData.id,
                recordNumber: mjcData.job_card_number,
                title: `Maintenance Job Card: ${mjcData.job_card_number}`,
                status: mjcData.status,
                procedureReference: '4.7',
                formNumber: '4.7F1',
                createdAt: mjcData.created_at,
                link: `/mjc/${mjcData.id}`,
              });
            }
          }

            // Get linked waste manifest
            if (ncaData.waste_manifest_id) {
              const waste = await (supabase
                .from('waste_manifests') as any)
                .select('id, manifest_number, created_at')
                .eq('id', ncaData.waste_manifest_id)
                .single();

            if (waste.data) {
              const wasteData = waste.data as any;
              references.push({
                recordType: 'waste-manifest',
                recordId: wasteData.id,
                recordNumber: wasteData.manifest_number,
                title: `Waste Manifest: ${wasteData.manifest_number}`,
                status: 'active',
                procedureReference: '4.10',
                formNumber: '4.10F1',
                createdAt: wasteData.created_at,
                link: `/waste/${wasteData.id}`,
              });
            }
          }

          // Get linked complaint
          if (ncaData.complaint_id) {
            const complaint = await (supabase
              .from('complaints') as any)
              .select('id, complaint_number, investigation_status, created_at')
              .eq('id', ncaData.complaint_id)
              .single();

            if (complaint.data) {
              const complaintData = complaint.data as any;
              references.push({
                recordType: 'complaint',
                recordId: complaintData.id,
                recordNumber: complaintData.complaint_number,
                title: `Customer Complaint: ${complaintData.complaint_number}`,
                status: complaintData.investigation_status,
                procedureReference: '3.10',
                formNumber: '3.10F2',
                createdAt: complaintData.created_at,
                link: `/complaints/${complaintData.id}`,
              });
            }
          }

          // Get linked recall
          if (ncaData.recall_id) {
            const recall = await (supabase
              .from('recalls') as any)
              .select('id, recall_number, status, created_at')
              .eq('id', ncaData.recall_id)
              .single();

            if (recall.data) {
              const recallData = recall.data as any;
              references.push({
                recordType: 'recall',
                recordId: recallData.id,
                recordNumber: recallData.recall_number,
                title: `Product Recall: ${recallData.recall_number}`,
                status: recallData.status,
                procedureReference: '3.11',
                formNumber: '3.11F1',
                createdAt: recallData.created_at,
                link: `/recalls/${recallData.id}`,
              });
            }
          }

          // Get linked work order
          if (ncaData.wo_id) {
            const wo = await (supabase
              .from('work_orders') as any)
              .select('id, wo_number, status, created_at')
              .eq('id', ncaData.wo_id)
              .single();

            if (wo.data) {
              const woData = wo.data as any;
              references.push({
                recordType: 'work-order',
                recordId: woData.id,
                recordNumber: woData.wo_number,
                title: `Work Order: ${woData.wo_number}`,
                status: woData.status,
                procedureReference: '5.3',
                formNumber: '5.3F1',
                createdAt: woData.created_at,
                link: `/work-orders/${woData.id}`,
              });
            }
          }
        }
        break;
      }

      case 'mjc': {
        // Get related records for MJC
        const mjc = await (supabase.from('mjcs') as any).select('*').eq('id', recordId).single();

        if (mjc.data) {
          const mjcData = mjc.data as any;

          // Get linked NCA
          if (mjcData.linked_nca_id) {
            const nca = await (supabase
              .from('ncas') as any)
              .select('id, nca_number, status, created_at')
              .eq('id', mjcData.linked_nca_id)
              .single();

            if (nca.data) {
              const ncaData = nca.data as any;
              references.push({
                recordType: 'nca',
                recordId: ncaData.id,
                recordNumber: ncaData.nca_number,
                title: `Non-Conformance Advice: ${ncaData.nca_number}`,
                status: ncaData.status,
                procedureReference: '5.7',
                formNumber: '5.7F1',
                createdAt: ncaData.created_at,
                link: `/nca/${ncaData.id}`,
              });
            }
          }

          // Get linked work order
          if (mjcData.wo_id) {
            const wo = await (supabase
              .from('work_orders') as any)
              .select('id, wo_number, status, created_at')
              .eq('id', mjcData.wo_id)
              .single();

            if (wo.data) {
              const woData = wo.data as any;
              references.push({
                recordType: 'work-order',
                recordId: woData.id,
                recordNumber: woData.wo_number,
                title: `Work Order: ${woData.wo_number}`,
                status: woData.status,
                procedureReference: '5.3',
                formNumber: '5.3F1',
                createdAt: woData.created_at,
                link: `/work-orders/${woData.id}`,
              });
            }
          }
        }
        break;
      }

      case 'complaint': {
        // Get related records for Complaint
        const complaint = await (supabase
          .from('complaints') as any)
          .select('*')
          .eq('id', recordId)
          .single();

        if (complaint.data) {
          const complaintData = complaint.data as any;

          // Get linked NCA
          if (complaintData.linked_nca_id) {
            const nca = await (supabase
              .from('ncas') as any)
              .select('id, nca_number, status, created_at')
              .eq('id', complaintData.linked_nca_id)
              .single();

            if (nca.data) {
              const ncaData = nca.data as any;
              references.push({
                recordType: 'nca',
                recordId: ncaData.id,
                recordNumber: ncaData.nca_number,
                title: `Non-Conformance Advice: ${ncaData.nca_number}`,
                status: ncaData.status,
                procedureReference: '5.7',
                formNumber: '5.7F1',
                createdAt: ncaData.created_at,
                link: `/nca/${ncaData.id}`,
              });
            }
          }
        }
        break;
      }

      case 'recall': {
        // Get related records for Recall
        const recall = await (supabase.from('recalls') as any).select('*').eq('id', recordId).single();

        if (recall.data) {
          const recallData = recall.data as any;

          // Get all flagged NCAs
          if (recallData.affected_nca_ids && recallData.affected_nca_ids.length > 0) {
            const ncas = await (supabase
              .from('ncas') as any)
              .select('id, nca_number, status, created_at')
              .in('id', recallData.affected_nca_ids);

            if (ncas.data) {
              (ncas.data as any[]).forEach((nca: any) => {
                references.push({
                  recordType: 'nca',
                  recordId: nca.id,
                  recordNumber: nca.nca_number,
                  title: `Non-Conformance Advice: ${nca.nca_number}`,
                  status: nca.status,
                  procedureReference: '5.7',
                  formNumber: '5.7F1',
                  createdAt: nca.created_at,
                  link: `/nca/${nca.id}`,
                });
              });
            }
          }
        }
        break;
      }
    }

    return references;
  } catch (error) {
    console.error('Error fetching related records:', error);
    return [];
  }
}

/**
 * Get procedure references for a record
 */
export async function getProcedureReferences(
  recordType: RecordType
): Promise<Array<{ procedure: string; formNumber: string; description: string }>> {
  const procedureMap: Record<RecordType, Array<{ procedure: string; formNumber: string; description: string }>> = {
    nca: [
      { procedure: '5.7', formNumber: '5.7F1', description: 'Non-Conformance Advice' },
      { procedure: '3.4', formNumber: '3.4F1', description: 'Supplier Approval (if supplier-based)' },
      { procedure: '4.10', formNumber: '4.10F1', description: 'Waste Management (if discard)' },
      { procedure: '4.7', formNumber: '4.7F1', description: 'Maintenance (if equipment issue)' },
    ],
    mjc: [
      { procedure: '4.7', formNumber: '4.7F1', description: 'Maintenance Job Card' },
      { procedure: '5.7', formNumber: '5.7F1', description: 'Non-Conformance Advice (if linked)' },
    ],
    'waste-manifest': [
      { procedure: '4.10', formNumber: '4.10F1', description: 'Waste Manifest' },
      { procedure: '5.7', formNumber: '5.7F1', description: 'Non-Conformance Advice (source)' },
    ],
    complaint: [
      { procedure: '3.10', formNumber: '3.10F2', description: 'Customer Complaint' },
      { procedure: '5.7', formNumber: '5.7F1', description: 'Non-Conformance Advice (if supplier issue)' },
    ],
    recall: [
      { procedure: '3.11', formNumber: '3.11F1', description: 'Product Recall' },
      { procedure: '5.7', formNumber: '5.7F1', description: 'Non-Conformance Advice (affected)' },
      { procedure: '3.9', formNumber: '3.9F1', description: 'Traceability' },
    ],
    'work-order': [
      { procedure: '5.3', formNumber: '5.3F1', description: 'Process Control' },
      { procedure: '5.7', formNumber: '5.7F1', description: 'Non-Conformance Advice (if NC detected)' },
    ],
  };

  return procedureMap[recordType] || [];
}

