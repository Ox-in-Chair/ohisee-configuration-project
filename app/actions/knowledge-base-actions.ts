'use server';

/**
 * Knowledge Base Management - Server Actions
 * Admin functions for managing BRCGS procedures in AI knowledge base
 *
 * Architecture:
 * - Admin-only access (RLS enforced)
 * - Document version control (only ONE current version per procedure)
 * - Vector embedding for semantic search (RAG)
 * - BRCGS Section 3.6 compliance
 */

import { createServerClient } from '@/lib/database/client';
import { revalidatePath } from 'next/cache';
import type { ActionResponse } from './types';

// ============================================================================
// Response Types
// ============================================================================

// ============================================================================
// Knowledge Base Types
// ============================================================================

interface ProcedureMetadata {
  readonly document_number: string;
  readonly document_name: string;
  readonly document_type: 'procedure' | 'form_template' | 'work_instruction' | 'policy' | 'training' | 'record';
  readonly revision: number;
  readonly brcgs_section?: string;
  readonly effective_date: string;
  readonly review_due_date?: string;
  readonly summary?: string;
  readonly key_requirements?: Record<string, unknown>;
  readonly integration_points?: string[];
  readonly form_sections?: string[];
}

interface Procedure extends ProcedureMetadata {
  readonly id: string;
  readonly status: 'current' | 'superseded' | 'draft' | 'obsolete';
  readonly revised_date: string;
  readonly full_text: string;
  readonly search_keywords?: string[];
  readonly uploaded_at: string;
  readonly reference_count: number;
}

interface KnowledgeBaseResult {
  readonly procedure_number: string;
  readonly procedure_title: string;
  readonly content: string;
  readonly relevance_score: number;
  readonly revision: number;
  readonly effective_date: string;
}

interface ProcedureFilters {
  readonly status?: 'current' | 'superseded' | 'draft' | 'obsolete';
  readonly document_type?: string;
  readonly brcgs_section?: string;
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// ============================================================================
// Upload & Version Management
// ============================================================================

/**
 * Upload BRCGS procedure to knowledge base
 * Admin only - enforced by RLS
 *
 * CRITICAL: Automatically supersedes previous version
 * Ensures only ONE current version per document number (BRCGS Section 3.6)
 *
 * @param fileContent - Full text of procedure document
 * @param metadata - Document metadata and version info
 * @returns Document ID for reference
 */
export async function uploadProcedure(
  fileContent: string,
  metadata: ProcedureMetadata
): Promise<ActionResponse<{ document_id: string }>> {
  try {
    const supabase = createServerClient();

    // Validate required fields
    if (!metadata.document_number || !metadata.document_name) {
      return {
        success: false,
        error: 'Document number and name are required'
      };
    }

    if (!fileContent || fileContent.length < 100) {
      return {
        success: false,
        error: 'Document content is too short. Please provide full procedure text.'
      };
    }

    // Check if this document number already exists with status='current'
    const { data: rawExisting } = (await (supabase
      .from('knowledge_base_documents') as any)
      .select('id, revision, document_number')
      .eq('document_number', metadata.document_number)
      .eq('status', 'current')
      .single()) as { data: any };

    // Type assertion for existing document
    type ExistingDoc = { id: string; revision: number; document_number: string };
    const existingCurrent = (rawExisting) as ExistingDoc | null;

    // If uploading same or lower revision, reject
    if (existingCurrent && metadata.revision <= existingCurrent.revision) {
      return {
        success: false,
        error: `Revision ${metadata.revision} is not newer than current revision ${existingCurrent.revision}`
      };
    }

    // Begin transaction: Mark existing as superseded, insert new as current
    if (existingCurrent) {
      const { error: updateError } = (await (supabase
        .from('knowledge_base_documents') as any)
        .update({ status: 'superseded' })
        .eq('id', existingCurrent.id)) as { error: any };

      if (updateError) {
        console.error('Error superseding existing document:', updateError);
        return {
          success: false,
          error: 'Failed to supersede existing document version'
        };
      }
    }

    // Generate embeddings (TODO: Integrate with OpenAI embeddings API)
    // For now, we'll insert without embeddings - they can be generated async
    const embeddingVector = null; // TODO: await generateEmbeddings(fileContent);

    // Extract search keywords from content
    const searchKeywords = extractKeywords(fileContent);

    // Insert new document
    const { data: newDoc, error: insertError } = (await (supabase
      .from('knowledge_base_documents') as any)
      .insert({
        document_number: metadata.document_number,
        document_name: metadata.document_name,
        document_type: metadata.document_type,
        revision: metadata.revision,
        status: 'current',
        revised_date: new Date().toISOString().split('T')[0],
        effective_date: metadata.effective_date,
        review_due_date: metadata.review_due_date,
        brcgs_section: metadata.brcgs_section,
        brcgs_standard: 'BRCGS Packaging Issue 7',
        full_text: fileContent,
        summary: metadata.summary,
        key_requirements: metadata.key_requirements,
        integration_points: metadata.integration_points,
        form_sections: metadata.form_sections,
        embedding_vector: embeddingVector,
        chunk_strategy: 'full',
        search_keywords: searchKeywords,
        reference_count: 0
      })
      .select('id')
      .single()) as { data: { id: string } | null; error: any };

    if (insertError || !newDoc) {
      console.error('Error inserting document:', insertError);
      return {
        success: false,
        error: insertError ? `Database error: ${insertError.message}` : 'Failed to create document'
      };
    }

    // Revalidate knowledge base page
    revalidatePath('/admin/knowledge-base');

    return {
      success: true,
      data: {
        document_id: newDoc.id
      }
    };
  } catch (error) {
    console.error('Unexpected error uploading procedure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Update existing procedure metadata
 * Cannot change document content or revision - use uploadProcedure for new versions
 */
export async function updateProcedureMetadata(
  documentId: string,
  updates: Partial<Pick<ProcedureMetadata, 'summary' | 'key_requirements' | 'integration_points' | 'form_sections' | 'review_due_date'>>
): Promise<ActionResponse<void>> {
  try {
    const supabase = createServerClient();

    const { error } = (await (supabase
      .from('knowledge_base_documents') as any)
      .update(updates)
      .eq('id', documentId)) as { error: any };

    if (error) {
      console.error('Error updating procedure metadata:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    revalidatePath('/admin/knowledge-base');

    return {
      success: true
    };
  } catch (error) {
    console.error('Unexpected error updating metadata:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Mark procedure as obsolete
 * Does not delete - maintains audit trail
 */
export async function obsoleteProcedure(
  documentId: string
): Promise<ActionResponse<void>> {
  try {
    const supabase = createServerClient();

    const { error } = (await (supabase
      .from('knowledge_base_documents') as any)
      .update({ status: 'obsolete' })
      .eq('id', documentId)) as { error: any };

    if (error) {
      console.error('Error marking procedure obsolete:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    revalidatePath('/admin/knowledge-base');

    return {
      success: true
    };
  } catch (error) {
    console.error('Unexpected error obsoleting procedure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// Search & Retrieval (RAG)
// ============================================================================

/**
 * Search knowledge base using semantic similarity
 * For AI context retrieval (RAG architecture)
 *
 * Uses vector embeddings for semantic search
 * Falls back to keyword search if embeddings not available
 *
 * @param query - Search query (user description or keywords)
 * @param limit - Max results to return
 * @returns Procedures ranked by relevance
 */
export async function searchKnowledgeBase(
  query: string,
  limit: number = 5
): Promise<ActionResponse<KnowledgeBaseResult[]>> {
  try {
    const supabase = createServerClient();

    // TODO: Generate query embedding with OpenAI
    // const queryEmbedding = await generateEmbeddings(query);

    // For now, use full-text search with keywords
    // In production, this would use vector similarity search:
    // SELECT *, 1 - (embedding_vector <=> query_embedding) as similarity
    // FROM knowledge_base_documents
    // WHERE status = 'current'
    // ORDER BY similarity DESC
    // LIMIT $1

    const { data: procedures, error } = (await (supabase
      .from('knowledge_base_documents') as any)
      .select(`
        document_number,
        document_name,
        full_text,
        revision,
        effective_date,
        search_keywords
      `)
      .eq('status', 'current')
      .textSearch('full_text', query, {
        type: 'websearch',
        config: 'english'
      })
      .limit(limit)) as { data: any; error: any };

    if (error) {
      console.error('Knowledge base search error:', error);
      return {
        success: false,
        error: 'Failed to search knowledge base'
      };
    }

    // Calculate simple relevance score (in production, use vector similarity)
    const results: KnowledgeBaseResult[] = (procedures ?? []).map((proc: any, index: number) => ({
      procedure_number: proc.document_number,
      procedure_title: proc.document_name,
      content: `${proc.full_text.substring(0, 500)  }...`, // Return excerpt
      relevance_score: 1 - (index * 0.1), // Mock relevance (0.9, 0.8, 0.7...)
      revision: proc.revision,
      effective_date: proc.effective_date
    }));

    return {
      success: true,
      data: results
    };
  } catch (error) {
    console.error('Unexpected error searching knowledge base:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}

/**
 * Get specific procedure by document number
 * Returns current version only
 */
export async function getProcedureByNumber(
  documentNumber: string
): Promise<ActionResponse<Procedure>> {
  try {
    const supabase = createServerClient();

    const { data: procedure, error } = (await (supabase
      .from('knowledge_base_documents') as any)
      .select('*')
      .eq('document_number', documentNumber)
      .eq('status', 'current')
      .single()) as { data: any; error: any };

    if (error || !procedure) {
      return {
        success: false,
        error: `Procedure ${documentNumber} not found`
      };
    }

    return {
      success: true,
      data: {
        id: procedure.id,
        document_number: procedure.document_number,
        document_name: procedure.document_name,
        document_type: procedure.document_type,
        revision: procedure.revision,
        status: procedure.status,
        revised_date: procedure.revised_date,
        effective_date: procedure.effective_date,
        review_due_date: procedure.review_due_date,
        brcgs_section: procedure.brcgs_section,
        full_text: procedure.full_text,
        summary: procedure.summary,
        key_requirements: procedure.key_requirements,
        integration_points: procedure.integration_points,
        form_sections: procedure.form_sections,
        search_keywords: procedure.search_keywords,
        uploaded_at: procedure.uploaded_at,
        reference_count: procedure.reference_count
      }
    };
  } catch (error) {
    console.error('Error fetching procedure:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch procedure'
    };
  }
}

// ============================================================================
// Admin List & Management
// ============================================================================

/**
 * List procedures for admin management
 * Supports filtering by status, type, section
 */
export async function listProcedures(
  filters: ProcedureFilters = {}
): Promise<ActionResponse<{ procedures: Procedure[]; total: number }>> {
  try {
    const supabase = createServerClient();

    let query = (supabase
      .from('knowledge_base_documents') as any)
      .select('*', { count: 'exact' });

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.document_type) {
      query = query.eq('document_type', filters.document_type);
    }

    if (filters.brcgs_section) {
      query = query.eq('brcgs_section', filters.brcgs_section);
    }

    if (filters.search) {
      query = query.or(`document_number.ilike.%${filters.search}%,document_name.ilike.%${filters.search}%`);
    }

    // Pagination
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;
    query = query.range(offset, offset + limit - 1);

    // Order by document number
    query = query.order('document_number', { ascending: true });
    query = query.order('revision', { ascending: false });

    const { data: procedures, error, count } = (await query) as { data: any; error: any; count: number | null };

    if (error) {
      console.error('Error listing procedures:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    const mappedProcedures: Procedure[] = (procedures ?? []).map((proc: any) => ({
      id: proc.id,
      document_number: proc.document_number,
      document_name: proc.document_name,
      document_type: proc.document_type,
      revision: proc.revision,
      status: proc.status,
      revised_date: proc.revised_date,
      effective_date: proc.effective_date,
      review_due_date: proc.review_due_date,
      brcgs_section: proc.brcgs_section,
      full_text: proc.full_text,
      summary: proc.summary,
      key_requirements: proc.key_requirements,
      integration_points: proc.integration_points,
      form_sections: proc.form_sections,
      search_keywords: proc.search_keywords,
      uploaded_at: proc.uploaded_at,
      reference_count: proc.reference_count
    }));

    return {
      success: true,
      data: {
        procedures: mappedProcedures,
        total: count ?? 0
      }
    };
  } catch (error) {
    console.error('Unexpected error listing procedures:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Get procedure version history
 * Returns all versions (current, superseded, obsolete) for a document number
 */
export async function getProcedureHistory(
  documentNumber: string
): Promise<ActionResponse<Procedure[]>> {
  try {
    const supabase = createServerClient();

    const { data: versions, error } = (await (supabase
      .from('knowledge_base_documents') as any)
      .select('*')
      .eq('document_number', documentNumber)
      .order('revision', { ascending: false })) as { data: any; error: any };

    if (error) {
      console.error('Error fetching procedure history:', error);
      return {
        success: false,
        error: `Database error: ${error.message}`
      };
    }

    const mappedVersions: Procedure[] = (versions ?? []).map((proc: any) => ({
      id: proc.id,
      document_number: proc.document_number,
      document_name: proc.document_name,
      document_type: proc.document_type,
      revision: proc.revision,
      status: proc.status,
      revised_date: proc.revised_date,
      effective_date: proc.effective_date,
      review_due_date: proc.review_due_date,
      brcgs_section: proc.brcgs_section,
      full_text: proc.full_text,
      summary: proc.summary,
      key_requirements: proc.key_requirements,
      integration_points: proc.integration_points,
      form_sections: proc.form_sections,
      search_keywords: proc.search_keywords,
      uploaded_at: proc.uploaded_at,
      reference_count: proc.reference_count
    }));

    return {
      success: true,
      data: mappedVersions
    };
  } catch (error) {
    console.error('Unexpected error fetching procedure history:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract keywords from procedure text
 * Simple keyword extraction - in production, use NLP library
 */
function extractKeywords(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'may', 'might', 'must', 'can', 'shall'
  ]);

  // Extract words, filter, and count
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  const wordCounts = new Map<string, number>();

  for (const word of words) {
    if (!stopWords.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  // Return top 20 keywords by frequency
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}
