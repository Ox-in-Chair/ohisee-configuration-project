/**
 * Context Alignment Agent
 * Ensures logical consistency across all fields
 * Validates that Root Cause explains NC Description, and Corrective Action addresses Root Cause
 */

import type { NCA, MJC, User } from '../../types';
import type { AgentResult } from '../types';

export class ContextAlignmentAgent {
  /**
   * Analyze form data for logical consistency
   */
  async analyze(
    formData: NCA | MJC,
    _user: User,
    formType: 'nca' | 'mjc'
  ): Promise<AgentResult> {
    const requirements: AgentResult['requirements'] = [];
    const errors: AgentResult['errors'] = [];
    const warnings: AgentResult['warnings'] = [];
    let confidence = 0.75; // High confidence in logical checks

    if (formType === 'nca') {
      const ncaData = formData as NCA;

      // Check: Root Cause should logically explain the Description
      if (ncaData.nc_description && ncaData.root_cause_analysis) {
        const alignment = this.checkRootCauseAlignment(
          ncaData.nc_description,
          ncaData.root_cause_analysis
        );

        if (!alignment.aligned) {
          errors.push({
            field: 'root_cause_analysis',
            message: alignment.reason,
            brcgs_requirement: 'BRCGS 5.7.2',
          });
          confidence = 0.9;
        }
      }

      // Check: Corrective Action should address the Root Cause
      if (ncaData.root_cause_analysis && ncaData.corrective_action) {
        const alignment = this.checkCorrectiveActionAlignment(
          ncaData.root_cause_analysis,
          ncaData.corrective_action
        );

        if (!alignment.aligned) {
          requirements.push({
            field: 'corrective_action',
            message: alignment.reason,
            reference: 'BRCGS 5.7.2',
            exampleFix: 'Ensure your corrective action directly addresses the root cause identified above.',
          });
          confidence = 0.85;
        }
      }

      // Check: NC Type should match Description content
      if (ncaData.nc_type && ncaData.nc_description) {
        const typeMatch = this.checkTypeDescriptionMatch(
          ncaData.nc_type,
          ncaData.nc_description
        );

        if (!typeMatch.matches) {
          warnings.push({
            field: 'nc_type',
            message: typeMatch.reason,
            suggestion: `Consider changing NC type to "${typeMatch.suggestedType}" if this better describes the issue.`,
          });
          confidence = 0.7;
        }
      }
    }

    return {
      requirements,
      errors,
      warnings,
      confidence,
      reasoning: `Context Alignment Agent analyzed ${formType} submission for logical consistency. Checked alignment between description, root cause, and corrective action. Found ${errors.length} alignment errors, ${requirements.length} alignment requirements.`,
    };
  }

  /**
   * Check if root cause logically explains the description
   */
  private checkRootCauseAlignment(
    description: string,
    rootCause: string
  ): { aligned: boolean; reason: string } {
    const descLower = description.toLowerCase();
    const rootCauseLower = rootCause.toLowerCase();

    // Extract key terms from description
    const descTerms = this.extractKeyTerms(descLower);
    const rootCauseTerms = this.extractKeyTerms(rootCauseLower);

    // Check for overlap in key terms (simplified - in production, use semantic similarity)
    const overlap = descTerms.filter(term => rootCauseTerms.includes(term));

    if (overlap.length === 0 && descTerms.length > 0) {
      return {
        aligned: false,
        reason: 'Root cause analysis does not appear to explain the issue described. The root cause should logically connect to what happened in the description.',
      };
    }

    // Check for contradictory statements
    const contradictions = this.detectContradictions(descLower, rootCauseLower);
    if (contradictions.length > 0) {
      return {
        aligned: false,
        reason: `Potential contradiction detected: ${contradictions[0]}. Please ensure the root cause aligns with the description.`,
      };
    }

    return { aligned: true, reason: '' };
  }

  /**
   * Check if corrective action addresses the root cause
   */
  private checkCorrectiveActionAlignment(
    rootCause: string,
    correctiveAction: string
  ): { aligned: boolean; reason: string } {
    const rootCauseLower = rootCause.toLowerCase();
    const actionLower = correctiveAction.toLowerCase();

    // Extract key terms from root cause
    const rootCauseTerms = this.extractKeyTerms(rootCauseLower);
    const actionTerms = this.extractKeyTerms(actionLower);

    // Check for overlap (corrective action should reference root cause terms)
    const overlap = rootCauseTerms.filter(term => actionTerms.includes(term));

    if (overlap.length === 0 && rootCauseTerms.length > 0) {
      return {
        aligned: false,
        reason: 'Corrective action does not appear to address the root cause identified. The action should directly respond to the root cause.',
      };
    }

    return { aligned: true, reason: '' };
  }

  /**
   * Check if NC type matches description content
   */
  private checkTypeDescriptionMatch(
    ncType: string,
    description: string
  ): { matches: boolean; reason: string; suggestedType?: string } {
    const descLower = description.toLowerCase();

    // Type-specific keywords
    const typeKeywords: Record<string, string[]> = {
      'raw-material': ['raw', 'material', 'ingredient', 'supplier', 'delivery'],
      'finished-goods': ['finished', 'product', 'packaging', 'label', 'batch'],
      'wip': ['work in progress', 'wip', 'production', 'line', 'process'],
      'incident': ['incident', 'accident', 'injury', 'safety', 'emergency'],
    };

    const expectedKeywords = typeKeywords[ncType] || [];
    const hasExpectedKeywords = expectedKeywords.some(keyword => descLower.includes(keyword));

    if (!hasExpectedKeywords && expectedKeywords.length > 0) {
      // Suggest alternative type based on content
      let suggestedType = 'other';
      for (const [type, keywords] of Object.entries(typeKeywords)) {
        if (keywords.some(keyword => descLower.includes(keyword))) {
          suggestedType = type;
          break;
        }
      }

      return {
        matches: false,
        reason: `The description does not contain keywords typically associated with "${ncType}" type.`,
        suggestedType,
      };
    }

    return { matches: true, reason: '' };
  }

  /**
   * Extract key terms from text (simplified)
   */
  private extractKeyTerms(text: string): string[] {
    // Remove common stop words and extract meaningful terms
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.split(/\s+/)
      .map(w => w.toLowerCase().replace(/[^\w]/g, ''))
      .filter(w => w.length > 3 && !stopWords.includes(w));
    
    return [...new Set(words)]; // Return unique terms
  }

  /**
   * Detect contradictions between two texts
   */
  private detectContradictions(text1: string, text2: string): string[] {
    const contradictions: string[] = [];

    // Simple contradiction patterns (in production, use more sophisticated NLP)
    const contradictionPatterns = [
      { pattern1: /not\s+working/i, pattern2: /working\s+properly/i },
      { pattern1: /high/i, pattern2: /low/i },
      { pattern1: /increased/i, pattern2: /decreased/i },
    ];

    for (const { pattern1, pattern2 } of contradictionPatterns) {
      if (pattern1.test(text1) && pattern2.test(text2)) {
        contradictions.push('Contradictory statements detected');
      }
      if (pattern2.test(text1) && pattern1.test(text2)) {
        contradictions.push('Contradictory statements detected');
      }
    }

    return contradictions;
  }
}

