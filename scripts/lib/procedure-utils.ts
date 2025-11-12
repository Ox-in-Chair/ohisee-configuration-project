/**
 * Procedure Upload Utilities
 * Core functions for uploading BRCGS procedures to knowledge base
 *
 * Architecture:
 * - Dependency injection for Supabase client
 * - Testable file operations
 * - Comprehensive error handling
 * - Graceful degradation
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ProcedureMetadata,
  UploadResult,
  UploadSummary,
  IFileReader,
  ILogger,
} from '../../lib/procedures/types';

// ============================================================================
// Upload Operations
// ============================================================================

/**
 * Upload a single procedure to knowledge base
 * Handles version superseding and conflict resolution
 */
export async function uploadProcedure(
  client: SupabaseClient,
  metadata: ProcedureMetadata,
  content: string,
  logger?: ILogger
): Promise<UploadResult> {
  try {
    logger?.info(
      `Uploading: ${metadata.document_number} - ${metadata.document_name}`,
      { revision: metadata.revision }
    );

    // Step 1: Check for existing current version
    const { data: existing, error: selectError } = await client
      .from('knowledge_base_documents')
      .select('id, revision, document_number')
      .eq('document_number', metadata.document_number)
      .eq('status', 'current')
      .single();

    // Handle "not found" error (acceptable)
    if (selectError && selectError.code !== 'PGRST116') {
      logger?.error(`Failed to check existing version`, selectError);
      return {
        success: false,
        documentNumber: metadata.document_number,
        error: selectError.message,
      };
    }

    // Step 2: Skip if existing revision is same or higher
    if (existing && existing.revision >= metadata.revision) {
      logger?.info(
        `  Skipped (revision ${existing.revision} already exists)`,
        { existingId: existing.id }
      );
      return {
        success: true,
        documentId: existing.id,
        documentNumber: metadata.document_number,
      };
    }

    // Step 3: Supersede old version if exists
    if (existing) {
      const { error: updateError } = await client
        .from('knowledge_base_documents')
        .update({ status: 'superseded' })
        .eq('id', existing.id);

      if (updateError) {
        logger?.error(`Failed to supersede old version`, updateError);
        return {
          success: false,
          documentNumber: metadata.document_number,
          error: updateError.message,
        };
      }

      logger?.info(`  Superseded old revision ${existing.revision}`, {
        supersededId: existing.id,
      });
    }

    // Step 4: Insert new document
    const { data: newDoc, error: insertError } = await client
      .from('knowledge_base_documents')
      .insert({
        document_number: metadata.document_number,
        document_name: metadata.document_name,
        document_type: metadata.document_type,
        revision: metadata.revision,
        effective_date: metadata.effective_date,
        summary: metadata.summary,
        content: content,
        key_requirements: metadata.key_requirements,
        integration_points: metadata.integration_points,
        form_sections: metadata.form_sections,
        status: 'current',
      })
      .select('id')
      .single();

    if (insertError) {
      logger?.error(`Failed to insert new version`, insertError);
      return {
        success: false,
        documentNumber: metadata.document_number,
        error: insertError.message,
      };
    }

    logger?.info(`  ✓ Uploaded successfully (ID: ${newDoc.id})`);

    return {
      success: true,
      documentId: newDoc.id,
      documentNumber: metadata.document_number,
      supersededId: existing?.id,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger?.error(`Unexpected error uploading procedure`, error);

    return {
      success: false,
      documentNumber: metadata.document_number,
      error: errorMsg,
    };
  }
}

/**
 * Upload multiple procedures with rate limiting
 */
export async function uploadProcedures(
  client: SupabaseClient,
  procedures: Array<{ metadata: ProcedureMetadata; content: string }>,
  logger?: ILogger,
  delayMs: number = 500
): Promise<UploadSummary> {
  const results: UploadResult[] = [];

  logger?.info(`Starting batch upload of ${procedures.length} procedures`);

  for (const proc of procedures) {
    const result = await uploadProcedure(
      client,
      proc.metadata,
      proc.content,
      logger
    );

    results.push(result);

    // Rate limiting delay (avoid overwhelming database)
    if (delayMs > 0 && results.length < procedures.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return calculateUploadSummary(results);
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Load procedure file from disk
 */
export function loadProcedureFile(
  fileReader: IFileReader,
  filePath: string
): string {
  // Check file exists
  if (!fileReader.fileExists) {
    throw new Error('File reader does not support existence checks');
  }

  // Note: fileExists is async in the interface, but for testing we need sync
  // In production, this would be: await fileReader.fileExists(filePath)
  // For now, we'll let readFile throw if not found

  try {
    // Read file content (will be async in production)
    // For testing: return fileReader.readFileSync(filePath, 'utf-8')
    throw new Error('Not implemented - use async version');
  } catch (error) {
    throw new Error(
      `Failed to load procedure file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Load procedure file from disk (async version)
 */
export async function loadProcedureFileAsync(
  fileReader: IFileReader,
  filePath: string,
  logger?: ILogger
): Promise<string> {
  try {
    // Check if file exists
    const exists = await fileReader.fileExists(filePath);
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Read file content
    const content = await fileReader.readFile(filePath, 'utf-8');

    logger?.info(`Loaded file: ${filePath} (${content.length} bytes)`);

    return content;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger?.error(`Failed to load file: ${filePath}`, error);
    throw new Error(`Failed to load procedure file: ${errorMsg}`);
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate procedure metadata
 */
export function validateProcedureMetadata(
  metadata: ProcedureMetadata
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!metadata.document_number?.trim()) {
    errors.push('document_number is required');
  }

  if (!metadata.document_name?.trim()) {
    errors.push('document_name is required');
  }

  if (!metadata.document_type) {
    errors.push('document_type is required');
  }

  if (typeof metadata.revision !== 'number' || metadata.revision < 1) {
    errors.push('revision must be a positive integer');
  }

  if (!metadata.effective_date) {
    errors.push('effective_date is required');
  }

  // Validate date format (YYYY-MM-DD)
  if (metadata.effective_date && !/^\d{4}-\d{2}-\d{2}$/.test(metadata.effective_date)) {
    errors.push('effective_date must be in YYYY-MM-DD format');
  }

  // Validate arrays exist
  if (!Array.isArray(metadata.key_requirements)) {
    errors.push('key_requirements must be an array');
  }

  if (!Array.isArray(metadata.integration_points)) {
    errors.push('integration_points must be an array');
  }

  if (!Array.isArray(metadata.form_sections)) {
    errors.push('form_sections must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate procedure content
 */
export function validateProcedureContent(content: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!content || content.trim().length === 0) {
    return { valid: false, warnings: ['Content is empty'] };
  }

  if (content.length < 100) {
    warnings.push('Content is very short (< 100 characters)');
  }

  if (content.length > 100000) {
    warnings.push('Content is very long (> 100KB) - may impact performance');
  }

  return {
    valid: true,
    warnings,
  };
}

// ============================================================================
// Summary Calculations
// ============================================================================

/**
 * Calculate upload summary statistics
 */
export function calculateUploadSummary(results: UploadResult[]): UploadSummary {
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const superseded = results.filter((r) => r.supersededId).length;

  return {
    total: results.length,
    successful,
    failed,
    superseded,
    results,
  };
}

/**
 * Format upload summary for console output
 */
export function formatUploadSummary(summary: UploadSummary): string {
  const lines = [
    '=====================================',
    '📊 Upload Summary:',
    `   Total: ${summary.total}`,
    `   ✅ Successful: ${summary.successful}`,
    `   ❌ Failed: ${summary.failed}`,
    `   🔄 Superseded: ${summary.superseded}`,
    '=====================================',
  ];

  // Add failed uploads details
  if (summary.failed > 0) {
    lines.push('');
    lines.push('Failed Uploads:');
    summary.results
      .filter((r) => !r.success)
      .forEach((r) => {
        lines.push(`  ❌ ${r.documentNumber}`);
        if (r.error) {
          lines.push(`     Error: ${r.error}`);
        }
      });
  }

  return lines.join('\n');
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Group procedures by BRCGS section for parallel processing
 */
export function groupProceduresBySection(
  procedures: Array<{ metadata: ProcedureMetadata; filePath: string }>
): Map<string, Array<{ metadata: ProcedureMetadata; filePath: string }>> {
  const groups = new Map<
    string,
    Array<{ metadata: ProcedureMetadata; filePath: string }>
  >();

  groups.set('section1', []); // Senior Management
  groups.set('section2', []); // HARA
  groups.set('section3', []); // Product Safety & Quality
  groups.set('section4', []); // Site Standards
  groups.set('section5-6', []); // Process Control + Personnel

  for (const proc of procedures) {
    const docNum = proc.metadata.document_number;
    const sectionMatch = docNum.match(/^([0-9]+)/);

    if (!sectionMatch) continue;

    const sectionNum = sectionMatch[1];

    if (sectionNum === '1') {
      groups.get('section1')!.push(proc);
    } else if (sectionNum === '2') {
      groups.get('section2')!.push(proc);
    } else if (sectionNum === '3') {
      groups.get('section3')!.push(proc);
    } else if (sectionNum === '4') {
      groups.get('section4')!.push(proc);
    } else if (sectionNum === '5' || sectionNum === '6') {
      groups.get('section5-6')!.push(proc);
    }
  }

  return groups;
}

/**
 * Execute parallel upload agents (one per section)
 */
export async function executeParallelUploads(
  client: SupabaseClient,
  groups: Map<string, Array<{ metadata: ProcedureMetadata; content: string }>>,
  logger?: ILogger
): Promise<Map<string, UploadSummary>> {
  const results = new Map<string, UploadSummary>();

  logger?.info(`Launching ${groups.size} parallel upload agents`);

  const agentPromises = Array.from(groups.entries()).map(
    async ([sectionName, procedures]) => {
      logger?.info(`Agent ${sectionName} starting (${procedures.length} procedures)`);

      const summary = await uploadProcedures(client, procedures, logger);

      logger?.info(
        `Agent ${sectionName} complete: ${summary.successful} succeeded, ${summary.failed} failed`
      );

      return { sectionName, summary };
    }
  );

  const agentResults = await Promise.all(agentPromises);

  for (const { sectionName, summary } of agentResults) {
    results.set(sectionName, summary);
  }

  return results;
}
