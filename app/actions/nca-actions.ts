'use server';

/**
 * OHiSee NCA System - Server Actions
 * Handles NCA form submission and database operations
 * Architecture: Dependency injection pattern - no static calls
 */

import { createServerClient } from '@/lib/database/client';
import { getUserIdFromAuth } from '@/lib/database/auth-utils';
import type { NCAInsert, NCAUpdate, Signature, NCType } from '@/types/database';
import type { NCAFormData } from '@/lib/validations/nca-schema';
import { revalidatePath } from 'next/cache';
import type { INotificationService, NotificationPayload, SupplierNCANotificationPayload } from '@/lib/types/notification';
import { createProductionNotificationService } from '@/lib/services/create-notification-service';
import type { ActionResponse } from './types';
import { transformSignature, generateRecordNumber } from '@/lib/actions/utils';
import { logError, logSupabaseError } from '@/lib/utils/error-handler';
import { NCADatabaseService } from '@/lib/services/nca-database-service';
import { LoggerFactory } from '@/lib/services/logger-factory';

/**
 * Transform form data to database insert format
 */
function transformFormDataToInsert(
  formData: NCAFormData,
  userId: string
): NCAInsert {
  const now = new Date();
  const dateString = now.toISOString().split('T')[0];
  const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

  return {
    // Auto-generated fields
    nca_number: generateRecordNumber('NCA'),
    date: dateString,
    time: timeString,
    raised_by_user_id: userId,
    created_by: userId,

    // Work Order Link
    wo_id: formData.wo_id || null,

    // Section 2: Classification
    nc_type: formData.nc_type as any,
    nc_type_other: formData.nc_type_other || null,
    nc_origin: (formData.nc_origin || (formData.nc_type === 'raw-material' ? 'supplier-based' : null)) as any,
    
    // Procedure Reference (locked on creation)
    procedure_reference: formData.procedure_reference || '5.7',
    procedure_revision: formData.procedure_revision || 'Rev 9',
    procedure_revision_date: formData.procedure_revision_date || dateString,

    // Section 3: Supplier & Product
    supplier_name: formData.supplier_name || null,
    nc_product_description: formData.nc_product_description,
    supplier_wo_batch: formData.supplier_wo_batch || null,
    supplier_reel_box: formData.supplier_reel_box || null,
    sample_available: formData.sample_available,
    quantity: formData.quantity ?? null,
    quantity_unit: (formData.quantity_unit ?? null) as any,
    carton_numbers: formData.carton_numbers || null,

    // Section 4: Description
    nc_description: formData.nc_description,

    // Section 5: Machine Status
    machine_status: formData.machine_status as 'operational' | 'down',
    machine_down_since: formData.machine_down_since || null,
    estimated_downtime: formData.estimated_downtime ?? null,

    // Section 6: Concession
    concession_team_leader: formData.concession_team_leader || null,
    concession_signature: transformSignature(
      formData.concession_signature
        ? {
            type: formData.concession_signature.type as 'manual' | 'digital',
            data: formData.concession_signature.data,
            name: formData.concession_signature.name,
            timestamp: formData.concession_signature.timestamp,
          }
        : null
    ),
    concession_notes: formData.concession_notes || null,

    // Section 7: Immediate Correction
    cross_contamination: formData.cross_contamination,
    back_tracking_person: formData.back_tracking_person || null,
    back_tracking_signature: transformSignature(
      formData.back_tracking_signature
        ? {
            type: formData.back_tracking_signature.type as 'manual' | 'digital',
            data: formData.back_tracking_signature.data,
            name: formData.back_tracking_signature.name,
            timestamp: formData.back_tracking_signature.timestamp,
          }
        : null
    ),
    back_tracking_completed: formData.back_tracking_completed,
    hold_label_completed: formData.hold_label_completed,
    nca_logged: formData.nca_logged,
    segregation_area: formData.segregation_area || null,
    segregation_area_other: formData.segregation_area_other || null,

    // Section 8: Disposition - Convert single action to multiple booleans
    disposition_reject: formData.disposition_action === 'reject',
    disposition_credit: formData.disposition_action === 'credit',
    disposition_uplift: formData.disposition_action === 'uplift',
    disposition_rework: formData.disposition_action === 'rework',
    disposition_concession: formData.disposition_action === 'concession',
    disposition_discard: formData.disposition_action === 'discard',
    rework_instruction: formData.rework_instruction || null,
    disposition_authorized_by: formData.disposition_authorized_by || null,
    disposition_signature: transformSignature(
      formData.disposition_signature
        ? {
            type: formData.disposition_signature.type as 'manual' | 'digital',
            data: formData.disposition_signature.data,
            name: formData.disposition_signature.name,
            timestamp: formData.disposition_signature.timestamp,
          }
        : null
    ),

    // Section 9: Root Cause
    root_cause_analysis: formData.root_cause_analysis || null,
    root_cause_attachments: null, // TODO: File upload handling

    // Section 10: Corrective Action
    corrective_action: formData.corrective_action || null,
    corrective_action_attachments: null, // TODO: File upload handling

    // Section 11: Close Out
    close_out_by: formData.close_out_by || null,
    close_out_signature: transformSignature(
      formData.close_out_signature
        ? {
            type: formData.close_out_signature.type as 'manual' | 'digital',
            data: formData.close_out_signature.data,
            name: formData.close_out_signature.name,
            timestamp: formData.close_out_signature.timestamp,
          }
        : null
    ),
    close_out_date: formData.close_out_date || null,

    // Status - default to submitted
    status: 'submitted',
  };
}

/**
 * Send machine down alert if applicable
 * Injected notification service for testability (DI pattern)
 */
async function sendMachineDownAlertIfNeeded(
  ncaData: NCAInsert,
  ncaNumber: string,
  notificationService?: INotificationService
): Promise<void> {
  const logger = LoggerFactory.createLogger('nca-actions.sendMachineDownAlert');

  // Only send alert if machine status is 'down'
  if (ncaData.machine_status !== 'down') {
    return;
  }

  // Skip if no notification service provided (production will inject real service)
  if (!notificationService) {
    logger.warn('Machine down alert skipped - notification service not configured', {
      ncaNumber,
      machineStatus: ncaData.machine_status,
    });
    return;
  }

  try {
    // TODO: Fetch operator name from user_profiles table using raised_by_user_id
    // For MVP, using hardcoded name
    const operatorName = 'Operations Team';

    // TODO: Extract machine name from nc_product_description or add machine_name field
    // For MVP, using placeholder
    const machineName = ncaData.nc_product_description?.split('-')[0]?.trim() || 'Unknown Machine';

    const payload: NotificationPayload = {
      nca_number: ncaNumber,
      machine_name: machineName,
      operator_name: operatorName,
      timestamp: new Date().toISOString(),
    };

    // Send alert (errors are logged internally, won't throw)
    await notificationService.sendMachineDownAlert(payload);
    logger.info('Machine down alert sent successfully', {
      ncaNumber,
      machineName,
    });
  } catch (error) {
    // Log error but don't fail NCA creation if notification fails
    logger.error('Failed to send machine down alert', error, {
      ncaNumber,
      machineStatus: ncaData.machine_status,
    });
  }
}

/**
 * Send supplier NCA notification if applicable
 * Procedure 5.7: NCA is emailed to the material supplier when Production Manager completes disposition
 * Injected notification service for testability (DI pattern)
 */
async function sendSupplierNotificationIfNeeded(
  ncaData: NCAInsert | { nc_type: string; supplier_name: string | null; date?: string; nc_product_description?: string; supplier_wo_batch?: string | null; supplier_reel_box?: string | null; quantity?: number | null; quantity_unit?: string | null; nc_description?: string },
  ncaNumber: string,
  formData?: NCAFormData,
  notificationService?: INotificationService
): Promise<void> {
  const logger = LoggerFactory.createLogger('nca-actions.sendSupplierNotification');

  // Only send notification if NC type is 'raw-material' and supplier name is provided
  if (ncaData.nc_type !== 'raw-material' || !ncaData.supplier_name) {
    return;
  }

  // Skip if no notification service provided (production will inject real service)
  if (!notificationService) {
    logger.warn('Supplier notification skipped - notification service not configured', {
      ncaNumber,
      supplierName: ncaData.supplier_name,
    });
    return;
  }

  try {
    // Look up supplier email from suppliers table
    const supabase = createServerClient();
    const { data: supplier, error: supplierError } = await supabase
      .from('suppliers')
      .select('contact_email, supplier_name')
      .ilike('supplier_name', `%${ncaData.supplier_name}%`)
      .limit(1)
      .single();

    // If supplier not found or no email, log warning but don't fail
    if (supplierError || !supplier || !(supplier as { contact_email?: string }).contact_email) {
      logger.warn('Supplier email not found - notification not sent', {
        ncaNumber,
        supplierName: ncaData.supplier_name,
        error: supplierError?.message,
      });
      return;
    }

    const supplierData = supplier as { contact_email: string; supplier_name?: string };

    // Format date for email
    const dateString = ncaData.date || new Date().toISOString().split('T')[0];

    const payload: SupplierNCANotificationPayload = {
      nca_number: ncaNumber,
      supplier_name: supplierData.supplier_name || ncaData.supplier_name,
      supplier_email: supplierData.contact_email,
      date: dateString,
      product_description: ncaData.nc_product_description || 'N/A',
      supplier_wo_batch: ncaData.supplier_wo_batch || undefined,
      supplier_reel_box: ncaData.supplier_reel_box || undefined,
      quantity: ncaData.quantity || undefined,
      quantity_unit: ncaData.quantity_unit || undefined,
      nc_description: ncaData.nc_description || 'No description provided',
    };

    // Send notification (errors are logged internally, won't throw)
    await notificationService.sendSupplierNCANotification(payload);
    logger.info('Supplier notification sent successfully', {
      ncaNumber,
      supplierName: payload.supplier_name,
      supplierEmail: payload.supplier_email,
    });
  } catch (error) {
    // Log error but don't fail NCA creation if notification fails
    logger.error('Failed to send supplier notification', error, {
      ncaNumber,
      supplierName: ncaData.supplier_name,
    });
  }
}

/**
 * Create and submit a new NCA
 * Server Action - called from client components
 * Optional notificationService parameter for dependency injection (testing)
 */
export async function createNCA(
  formData: NCAFormData,
  notificationService?: INotificationService
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  const logger = LoggerFactory.createLogger('nca-actions.createNCA');
  let userId: string | null | undefined;

  try {
    // Create server-side Supabase client (dependency injection)
    const supabase = createServerClient();

    // Get authenticated user ID
    userId = await getUserIdFromAuth(supabase);
    if (!userId) {
      logger.warn('Unauthorized NCA creation attempt');
      return {
        success: false,
        error: 'User must be authenticated to create NCA',
      };
    }

    // Transform form data to database format
    const ncaData = transformFormDataToInsert(formData, userId);

    // Insert into database using service
    const ncaService = new NCADatabaseService(supabase);
    const { data, error } = await ncaService.createNCA(ncaData);

    if (error) {
      logger.error('Failed to create NCA in database', new Error(error), {
        userId,
        ncType: ncaData.nc_type,
      });
      return {
        success: false,
        error,
      };
    }

    if (!data) {
      logger.error('No data returned from NCA creation', undefined, { userId });
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    logger.info('NCA created successfully', {
      ncaId: data.id,
      ncaNumber: data.nca_number,
      userId,
      ncType: ncaData.nc_type,
    });

    // Create waste manifest if disposition includes discard
    if (ncaData.disposition_discard) {
      try {
        const { createWasteManifestFromNCA } = await import('./waste-actions');
        await createWasteManifestFromNCA(
          data.id,
          {
            waste_description: ncaData.nc_product_description || 'Non-conforming product',
            waste_type: 'non-hazardous',
            physical_quantity: ncaData.quantity || 0,
            quantity_unit: ncaData.quantity_unit || 'kg',
            document_reference: '4.10F1',
          },
          userId
        );
        logger.info('Waste manifest created', { ncaId: data.id });
      } catch (error) {
        logger.error('Failed to create waste manifest', error, {
          ncaId: data.id,
          userId,
        });
        // Continue - waste manifest can be created manually later
      }
    }

    // Send notifications if applicable (non-blocking)
    // Use provided notification service (for testing) or create production service
    const service = notificationService || createProductionNotificationService();

    // NOTE: Supplier notification is NOT sent automatically on creation
    // It will be sent by Production Manager when disposition is completed (see updateNCA function)

    // Parallelize independent async operations (machine down alert + supplier performance update)
    const parallelOperations: Promise<void>[] = [
      // Send machine down alert if applicable
      sendMachineDownAlertIfNeeded(ncaData, data.nca_number, service),
    ];

    // Update supplier performance if supplier-based NCA
    if (ncaData.nc_type === 'raw-material' || ncaData.nc_origin === 'supplier-based') {
      parallelOperations.push(
        (async () => {
          try {
            const { updateSupplierPerformanceFromNCA } = await import('@/lib/services/supplier-performance-service');
            await updateSupplierPerformanceFromNCA(data.id);
            logger.info('Supplier performance updated', { ncaId: data.id });
          } catch (error) {
            logger.error('Failed to update supplier performance', error, {
              ncaId: data.id,
              userId,
            });
          }
        })()
      );
    }

    // Wait for all parallel operations to complete
    await Promise.all(parallelOperations);

    // Revalidate NCA list page
    revalidatePath('/nca');

    return {
      success: true,
      data: {
        id: data.id,
        nca_number: data.nca_number,
      },
    };
  } catch (error) {
    return logError(error, {
      context: 'createNCA',
      userId,
      severity: 'error',
      metadata: { formData: { nc_type: formData.nc_type } },
    });
  }
}

/**
 * Save NCA as draft
 * Allows partial form data with status = 'draft'
 */
export async function saveDraftNCA(
  formData: Partial<NCAFormData>
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  try {
    const supabase = createServerClient();

    // Get authenticated user ID
    const userId = await getUserIdFromAuth(supabase);
    if (!userId) {
      return {
        success: false,
        error: 'User must be authenticated to save draft NCA',
      };
    }

    const now = new Date();
    const dateString = now.toISOString().split('T')[0];
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });

    // Minimal required fields for draft
    const draftData: Partial<NCAInsert> = {
      nca_number: generateRecordNumber('NCA'),
      date: dateString,
      time: timeString,
      raised_by_user_id: userId,
      created_by: userId,
      status: 'draft',

      // Include any fields that are provided
      nc_type: (formData.nc_type || 'other') as NCType,
      nc_product_description: formData.nc_product_description || '',
      nc_description: formData.nc_description || '',
      machine_status: (formData.machine_status || 'operational') as 'operational' | 'down',
    };

    const ncaService = new NCADatabaseService(supabase);
    const { data, error } = await ncaService.createNCA(draftData as NCAInsert);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    revalidatePath('/nca');

    return {
      success: true,
      data: {
        id: data.id,
        nca_number: data.nca_number,
      },
    };
  } catch (error) {
    console.error('Unexpected error saving draft NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get NCA by ID
 * Server Action for fetching single NCA
 */
export async function getNCAById(
  id: string
): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();
    const ncaService = new NCADatabaseService(supabase);

    const { data, error } = await ncaService.getNCAById(id);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return logError(error, {
      context: 'getNCAById',
      severity: 'error',
      metadata: { ncaId: id },
    });
  }
}

/**
 * Get all NCAs with optional filters
 * Server Action for listing NCAs
 */
export async function listNCAs(filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<ActionResponse> {
  try {
    const supabase = createServerClient();
    const ncaService = new NCADatabaseService(supabase);

    // Convert offset to page number (if provided)
    const page = filters?.offset && filters?.limit
      ? Math.floor(filters.offset / filters.limit) + 1
      : undefined;

    const { data, total, error } = await ncaService.listNCAs({
      status: filters?.status as any,
      pageSize: filters?.limit || 10,
      page,
    });

    if (error) {
      console.error('Error listing NCAs:', error);
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      data: {
        ncas: data,
        total,
      },
    };
  } catch (error) {
    console.error('Unexpected error listing NCAs:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Update NCA (typically for disposition completion by Production Manager)
 * Sends supplier notification when disposition is completed for raw material NCAs
 * Procedure 5.7: Supplier notification sent after Production Manager completes disposition
 */
export async function updateNCA(
  ncaId: string,
  updates: NCAUpdate,
  notificationService?: INotificationService
): Promise<ActionResponse<{ id: string; nca_number: string }>> {
  try {
    const supabase = createServerClient();

    // Fetch current NCA once with all needed fields (fix N+1 pattern)
    const { data: currentNCA, error: fetchError } = await supabase
      .from('ncas')
      .select('nca_number, nc_type, supplier_name, date, nc_product_description, supplier_wo_batch, supplier_reel_box, quantity, quantity_unit, nc_description, disposition_signature, nc_origin, close_out_signature, status')
      .eq('id', ncaId)
      .single();

    if (fetchError || !currentNCA) {
      return {
        success: false,
        error: `NCA not found: ${fetchError?.message || 'Unknown error'}`,
      };
    }

    // Type the current NCA
    type CurrentNCAType = {
      nca_number: string;
      nc_type: string;
      supplier_name: string | null;
      date: string;
      nc_product_description: string;
      supplier_wo_batch: string | null;
      supplier_reel_box: string | null;
      quantity: number | null;
      quantity_unit: string | null;
      nc_description: string;
      disposition_signature: Signature | null;
      nc_origin: string | null;
      close_out_signature: Signature | null;
      status: string;
    };
    const typedCurrentNCA = currentNCA as CurrentNCAType;

    // Check if disposition is being completed (disposition_signature is being set)
    const wasDispositionComplete = typedCurrentNCA.disposition_signature !== null;
    const isDispositionBeingCompleted = updates.disposition_signature !== undefined && updates.disposition_signature !== null;

    // Check if closure is being completed (close_out_signature is being set)
    const wasClosureComplete = typedCurrentNCA.close_out_signature !== null;
    const isClosureBeingCompleted = updates.close_out_signature !== undefined && updates.close_out_signature !== null;

    // Update the NCA using service
    const ncaService = new NCADatabaseService(supabase);
    const { data, error } = await ncaService.updateNCA(ncaId, updates);

    if (error) {
      return {
        success: false,
        error,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No data returned from database',
      };
    }

    // Run reconciliation validation before closure
    if (isClosureBeingCompleted && !wasClosureComplete) {
      try {
        const { validateNCAQuantities } = await import('@/lib/services/reconciliation-service');
        const reconciliation = await validateNCAQuantities(ncaId);
        
        if (!reconciliation.isValid) {
          return {
            success: false,
            error: `Reconciliation validation failed. Cannot close NCA:\n${reconciliation.errors.join('\n')}`,
          };
        }
        
        if (reconciliation.warnings.length > 0) {
          console.warn('Reconciliation warnings:', reconciliation.warnings);
          // Warnings don't block closure, but are logged
        }
      } catch (error) {
        console.error('Reconciliation validation error:', error);
        // Don't block closure if reconciliation service fails - log and continue
      }
    }

    // Create waste manifest if disposition_discard is being set and no manifest exists
    if (updates.disposition_discard === true) {
      try {
        // Check if waste manifest already exists
        const { getWasteManifestByNCA } = await import('./waste-actions');
        const manifestResult = await getWasteManifestByNCA(ncaId);
        
        if (!manifestResult.success || !manifestResult.data) {
          // Get authenticated user ID for waste manifest
          const wasteUserId = await getUserIdFromAuth(supabase);
          if (!wasteUserId) {
            console.error('Cannot create waste manifest - user not authenticated');
            // Continue - waste manifest can be created manually later
          } else {
            const { createWasteManifestFromNCA } = await import('./waste-actions');
            await createWasteManifestFromNCA(
              ncaId,
              {
                waste_description: typedCurrentNCA.nc_product_description || 'Non-conforming product',
                waste_type: 'non-hazardous',
                physical_quantity: typedCurrentNCA.quantity || 0,
                quantity_unit: (typedCurrentNCA.quantity_unit as any) || 'kg',
                document_reference: '4.10F1',
              },
              wasteUserId
            );
          }
        }
        // Note: Waste manifest creation errors are logged but don't fail NCA update
      } catch (error) {
        console.error('Failed to create waste manifest:', error);
        // Continue - waste manifest can be created manually later
      }
    }

    // Parallelize independent async operations (supplier performance update + supplier notification)
    const updateParallelOperations: Promise<void>[] = [];

    // Update supplier performance if supplier-based NCA
    const currentNCAType = typedCurrentNCA.nc_type;
    const currentNCAOrigin = typedCurrentNCA.nc_origin;
    if (currentNCAType === 'raw-material' || currentNCAOrigin === 'supplier-based') {
      updateParallelOperations.push(
        (async () => {
          try {
            const { updateSupplierPerformanceFromNCA } = await import('@/lib/services/supplier-performance-service');
            await updateSupplierPerformanceFromNCA(ncaId);
            // Note: Supplier performance update errors are logged but don't fail NCA update
          } catch (error) {
            console.error('Failed to update supplier performance:', error);
          }
        })()
      );
    }

    // Send supplier notification if disposition was just completed
    // Only for raw material NCAs that haven't been notified yet
    if (isDispositionBeingCompleted && !wasDispositionComplete) {
      const service = notificationService || createProductionNotificationService();

      updateParallelOperations.push(
        sendSupplierNotificationIfNeeded(
          {
            nc_type: typedCurrentNCA.nc_type,
            supplier_name: typedCurrentNCA.supplier_name,
            date: typedCurrentNCA.date,
            nc_product_description: typedCurrentNCA.nc_product_description,
            supplier_wo_batch: typedCurrentNCA.supplier_wo_batch,
            supplier_reel_box: typedCurrentNCA.supplier_reel_box,
            quantity: typedCurrentNCA.quantity,
            quantity_unit: typedCurrentNCA.quantity_unit,
            nc_description: typedCurrentNCA.nc_description,
          },
          typedCurrentNCA.nca_number,
          undefined,
          service
        )
      );
    }

    // Wait for all parallel operations to complete
    await Promise.all(updateParallelOperations);

    // Revalidate NCA pages
    revalidatePath('/nca');
    revalidatePath(`/nca/${ncaId}`);

    return {
      success: true,
      data: {
        id: data.id,
        nca_number: typedCurrentNCA.nca_number,
      },
    };
  } catch (error) {
    console.error('Unexpected error updating NCA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
