/**
 * Procedure Upload Service
 * Handles uploading Kangopak procedures to knowledge base with dependency injection
 *
 * Architecture:
 * - All dependencies injected via constructor
 * - No static method calls
 * - Uses document_number (not revision) as identifier
 * - Auto-supersedes existing procedures by document_number
 */

import type {
  ProcedureMetadata,
  UploadResult,
  ISupabaseClient,
  ILogger
} from './types';

/**
 * Procedure Upload Service Interface
 */
export interface IProcedureUploadService {
  uploadProcedure(metadata: ProcedureMetadata, content: string): Promise<UploadResult>;
  uploadBatch(procedures: Array<{ metadata: ProcedureMetadata; content: string }>): Promise<UploadResult[]>;
}

/**
 * Procedure Upload Service Implementation
 *
 * Uses dependency injection for:
 * - Supabase client (database access)
 * - Logger (audit trail)
 */
export class ProcedureUploadService implements IProcedureUploadService {
  constructor(
    private supabaseClient: ISupabaseClient,
    private logger: ILogger
  ) {
    this.logger.info('ProcedureUploadService initialized');
  }

  /**
   * Upload a single procedure to knowledge base
   *
   * Logic:
   * 1. Find existing procedure by document_number (ignore revision)
   * 2. If exists, supersede it (set status = 'superseded')
   * 3. Insert new procedure (with status = 'current')
   *
   * @param metadata Procedure metadata
   * @param content Procedure content (markdown or text)
   * @returns Upload result with success status and document ID
   */
  async uploadProcedure(
    metadata: ProcedureMetadata,
    content: string
  ): Promise<UploadResult> {
    const docNumber = metadata.document_number;

    try {
      this.logger.info(`Uploading procedure ${docNumber}: ${metadata.document_name}`);

      // Step 1: Check for existing current version (by document_number only)
      const { data: existing, error: selectError } = await this.supabaseClient
        .from('knowledge_base_documents')
        .select('id, document_number, revision')
        .eq('document_number', docNumber)
        .eq('status', 'current')
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        // PGRST116 = no rows found (acceptable)
        throw new Error(`Query error: ${selectError.message}`);
      }

      let supersededId: string | undefined;

      // Step 2: Supersede old version if exists
      if (existing) {
        this.logger.info(`Found existing ${docNumber} (ID: ${existing.id}, Rev ${existing.revision})`);
        this.logger.info(`Superseding old version...`);

        const { error: updateError } = await this.supabaseClient
          .from('knowledge_base_documents')
          .update({ status: 'superseded' })
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(`Failed to supersede: ${updateError.message}`);
        }

        supersededId = existing.id;
        this.logger.info(`✓ Superseded old version (ID: ${existing.id})`);
      } else {
        this.logger.info(`No existing version found (first upload)`);
      }

      // Step 3: Insert new procedure
      const { data: newDoc, error: insertError} = await this.supabaseClient
        .from('knowledge_base_documents')
        .insert({
          document_number: metadata.document_number,
          document_name: metadata.document_name,
          document_type: metadata.document_type,
          revision: metadata.revision,
          revised_date: metadata.effective_date,
          effective_date: metadata.effective_date,
          summary: metadata.summary,
          full_text: content,
          key_requirements: metadata.key_requirements,
          integration_points: metadata.integration_points,
          form_sections: metadata.form_sections,
          status: 'current'
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }

      this.logger.info(`✅ Uploaded ${docNumber} successfully (ID: ${newDoc.id})`);

      return {
        success: true,
        documentId: newDoc.id,
        documentNumber: docNumber,
        supersededId
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Failed to upload ${docNumber}:`, errorMsg);

      return {
        success: false,
        documentNumber: docNumber,
        error: errorMsg
      };
    }
  }

  /**
   * Upload multiple procedures in batch
   *
   * @param procedures Array of procedures with metadata and content
   * @returns Array of upload results
   */
  async uploadBatch(
    procedures: Array<{ metadata: ProcedureMetadata; content: string }>
  ): Promise<UploadResult[]> {
    this.logger.info(`Starting batch upload of ${procedures.length} procedures`);

    const results: UploadResult[] = [];

    for (const proc of procedures) {
      const result = await this.uploadProcedure(proc.metadata, proc.content);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    this.logger.info(`Batch upload complete: ${successCount} succeeded, ${failureCount} failed`);

    return results;
  }
}
