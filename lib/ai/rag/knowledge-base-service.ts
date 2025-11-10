/**
 * Knowledge Base Service Implementation
 * RAG (Retrieval-Augmented Generation) for BRCGS procedures and historical cases
 *
 * Uses pgvector for semantic search over:
 * 1. BRCGS procedure documentation
 * 2. Historical NCA/MJC records with successful outcomes
 */

import { IKnowledgeBaseService } from '../ai-service.interface';
import { SupabaseClient } from '@supabase/supabase-js';

export class KnowledgeBaseService implements IKnowledgeBaseService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Search BRCGS procedures by relevance using vector similarity
   */
  async searchProcedures(
    query: string,
    limit: number = 5
  ): Promise<ReadonlyArray<{ procedure_number: string; content: string; relevance: number }>> {
    try {
      // Generate embedding for query
      const embedding = await this.generateEmbedding(query);

      // Search using pgvector similarity
      const { data, error } = await this.supabase.rpc('search_procedures', {
        query_embedding: embedding,
        match_limit: limit,
        match_threshold: 0.5 // Minimum similarity threshold
      });

      if (error) {
        console.error('Error searching procedures:', error);
        return this.getFallbackProcedures(query);
      }

      return (data ?? []).map((row: {
        procedure_number: string;
        content: string;
        similarity: number;
      }) => ({
        procedure_number: row.procedure_number,
        content: row.content,
        relevance: row.similarity
      }));
    } catch (error) {
      console.error('Knowledge base search failed:', error);
      return this.getFallbackProcedures(query);
    }
  }

  /**
   * Find similar historical NCAs/MJCs using vector similarity
   */
  async findSimilarCases(
    description: string,
    record_type: 'nca' | 'mjc',
    limit: number = 3
  ): Promise<ReadonlyArray<{ id: string; description: string; action: string; similarity: number }>> {
    try {
      // Generate embedding for description
      const embedding = await this.generateEmbedding(description);

      // Search historical records
      const { data, error } = await this.supabase.rpc('search_similar_cases', {
        query_embedding: embedding,
        case_type: record_type,
        match_limit: limit,
        match_threshold: 0.6, // Higher threshold for cases
        min_quality_score: 75 // Only retrieve high-quality historical cases
      });

      if (error) {
        console.error('Error searching similar cases:', error);
        return [];
      }

      return (data ?? []).map((row: {
        id: string;
        description: string;
        corrective_action: string;
        similarity: number;
      }) => ({
        id: row.id,
        description: row.description,
        action: row.corrective_action,
        similarity: row.similarity
      }));
    } catch (error) {
      console.error('Similar cases search failed:', error);
      return [];
    }
  }

  /**
   * Get specific procedure by number
   */
  async getProcedure(procedure_number: string): Promise<{ title: string; content: string } | null> {
    try {
      const { data, error } = await this.supabase
        .from('brcgs_procedures')
        .select('title, content')
        .eq('procedure_number', procedure_number)
        .single();

      if (error || !data) {
        return this.getFallbackProcedureContent(procedure_number);
      }

      return {
        title: data.title,
        content: data.content
      };
    } catch (error) {
      console.error(`Error fetching procedure ${procedure_number}:`, error);
      return this.getFallbackProcedureContent(procedure_number);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate embedding vector for text
   * Uses OpenAI text-embedding-ada-002 or similar
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Call embedding API (OpenAI, Cohere, or local model)
      // For now, return mock embedding - implement with actual embedding service
      // const response = await fetch('https://api.openai.com/v1/embeddings', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     model: 'text-embedding-ada-002',
      //     input: text
      //   })
      // });
      // const data = await response.json();
      // return data.data[0].embedding;

      // Mock implementation - replace with actual embedding service
      return new Array(1536).fill(0).map(() => Math.random());
    } catch (error) {
      console.error('Embedding generation failed:', error);
      // Return zero vector as fallback
      return new Array(1536).fill(0);
    }
  }

  /**
   * Fallback procedures when vector search fails
   * Returns relevant procedures based on keyword matching
   */
  private getFallbackProcedures(
    query: string
  ): ReadonlyArray<{ procedure_number: string; content: string; relevance: number }> {
    const lowerQuery = query.toLowerCase();
    const procedures: Array<{ procedure_number: string; content: string; relevance: number }> = [];

    // Common procedure mappings based on keywords
    if (this.containsKeywords(lowerQuery, ['raw material', 'supplier', 'material'])) {
      procedures.push({
        procedure_number: '5.7',
        content: 'Control of Non-Conforming Product - raw material disposition',
        relevance: 0.8
      });
      procedures.push({
        procedure_number: '3.4',
        content: 'Supplier Approval and Performance Monitoring',
        relevance: 0.7
      });
    }

    if (this.containsKeywords(lowerQuery, ['finished goods', 'finished product', 'final product'])) {
      procedures.push({
        procedure_number: '5.7',
        content: 'Control of Non-Conforming Product - finished goods disposition',
        relevance: 0.8
      });
      procedures.push({
        procedure_number: '5.6',
        content: 'Control of Measuring and Monitoring Devices',
        relevance: 0.6
      });
    }

    if (this.containsKeywords(lowerQuery, ['contamination', 'foreign body', 'glass', 'metal'])) {
      procedures.push({
        procedure_number: '5.8',
        content: 'Foreign Body Contamination Control',
        relevance: 0.9
      });
    }

    if (this.containsKeywords(lowerQuery, ['maintenance', 'repair', 'equipment', 'machine'])) {
      procedures.push({
        procedure_number: '4.7',
        content: 'Maintenance Management',
        relevance: 0.8
      });
      procedures.push({
        procedure_number: '5.6',
        content: 'Control of Measuring and Monitoring Devices',
        relevance: 0.6
      });
    }

    if (this.containsKeywords(lowerQuery, ['calibration', 'measuring', 'scale', 'gauge'])) {
      procedures.push({
        procedure_number: '5.6',
        content: 'Control of Measuring and Monitoring Devices',
        relevance: 0.9
      });
    }

    if (this.containsKeywords(lowerQuery, ['traceability', 'back tracking', 'batch'])) {
      procedures.push({
        procedure_number: '3.9',
        content: 'Product Traceability',
        relevance: 0.9
      });
    }

    // Default procedures if no matches
    if (procedures.length === 0) {
      procedures.push({
        procedure_number: '5.7',
        content: 'Control of Non-Conforming Product',
        relevance: 0.5
      });
      procedures.push({
        procedure_number: '3.11',
        content: 'Corrective and Preventive Action',
        relevance: 0.5
      });
    }

    return procedures.slice(0, 5);
  }

  /**
   * Fallback procedure content when database lookup fails
   */
  private getFallbackProcedureContent(procedure_number: string): { title: string; content: string } | null {
    const fallbackContent: Record<string, { title: string; content: string }> = {
      '5.7': {
        title: 'Control of Non-Conforming Product',
        content: 'Non-conforming product must be identified, segregated, and dispositioned appropriately. Disposition options include: reject to supplier, rework, concession, or discard.'
      },
      '3.11': {
        title: 'Corrective and Preventive Action',
        content: 'Root cause analysis must be performed. Corrective actions must prevent recurrence. Effectiveness verification required.'
      },
      '3.9': {
        title: 'Product Traceability',
        content: 'Traceability system must enable identification of raw materials, WIP, and finished goods. Back tracking required for cross-contamination events.'
      },
      '5.8': {
        title: 'Foreign Body Contamination Control',
        content: 'Controls must be in place for glass, metal, and other foreign body risks. Hygiene clearance required after maintenance. Tool control and accountability mandatory.'
      },
      '4.7': {
        title: 'Maintenance Management',
        content: 'Preventive and reactive maintenance must be documented. Hygiene clearance checklist required before production resume. Temporary repairs must be permanently resolved within 14 days.'
      },
      '5.6': {
        title: 'Control of Measuring and Monitoring Devices',
        content: 'Calibration required for all measuring equipment. Window of exposure assessment if out-of-calibration detected. Calibration records must be maintained.'
      }
    };

    return fallbackContent[procedure_number] ?? null;
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
}
