/**
 * GMP Standards Service
 * Provides Good Manufacturing Practices (GMP) compliance checking and HACCP-based suggestions
 * Uses existing knowledge_base_documents table with document_type = 'gmp_standard'
 */

import { createServerClient } from '@/lib/database/client';
import type { SupabaseClient } from '@/lib/database/client';

export interface GMPStandard {
  id: string;
  document_number: string;
  document_name: string;
  gmp_section?: string;
  content: string;
  applicable_to: ('nca' | 'mjc' | 'both')[];
  brcgs_reference?: string;
}

export interface GMPViolation {
  standard: GMPStandard;
  violation_type: 'haccp' | 'allergen' | 'cip' | 'environmental' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction: string;
}

export interface GMPComplianceCheck {
  violations: GMPViolation[];
  complianceScore: number; // 0-100
  recommendations: string[];
}

export class GMPStandardsService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createServerClient();
  }

  /**
   * Search for GMP standards relevant to a form type
   */
  async searchStandards(
    query: string,
    formType: 'nca' | 'mjc' = 'nca'
  ): Promise<GMPStandard[]> {
    const { data, error } = await (this.supabase
      .from('knowledge_base_documents') as any)
      .select('*')
      .eq('document_type', 'gmp_standard')
      .eq('status', 'current')
      .or(`document_name.ilike.%${query}%,full_text.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching GMP standards:', error);
      return [];
    }

    return (data || [])
      .map((item: any) => this.mapToGMPStandard(item))
      .filter((std: GMPStandard) =>
        std.applicable_to.includes(formType) || std.applicable_to.includes('both')
      );
  }

  /**
   * Get GMP standards by section (e.g., 'HACCP', 'Allergen Management')
   */
  async getStandardsBySection(section: string): Promise<GMPStandard[]> {
    const { data, error } = await (this.supabase
      .from('knowledge_base_documents') as any)
      .select('*')
      .eq('document_type', 'gmp_standard')
      .eq('status', 'current')
      .or(`brcgs_section.ilike.%${section}%,document_name.ilike.%${section}%`);

    if (error) {
      console.error('Error getting GMP standards by section:', error);
      return [];
    }

    return (data || []).map((item: any) => this.mapToGMPStandard(item));
  }

  /**
   * Check GMP compliance for a form submission
   */
  async checkCompliance(
    formData: any,
    formType: 'nca' | 'mjc'
  ): Promise<GMPComplianceCheck> {
    const violations: GMPViolation[] = [];
    const recommendations: string[] = [];

    // Check NC description for GMP violations
    if (formData.nc_description || formData.description_required) {
      const description = formData.nc_description || formData.description_required || '';
      
      // Check for allergen mentions
      const allergenKeywords = ['allergen', 'peanut', 'gluten', 'dairy', 'soy', 'egg'];
      const hasAllergenMention = allergenKeywords.some(keyword =>
        description.toLowerCase().includes(keyword)
      );

      if (hasAllergenMention) {
        const allergenStandards = await this.getStandardsBySection('Allergen');
        if (allergenStandards.length > 0) {
          violations.push({
            standard: allergenStandards[0],
            violation_type: 'allergen',
            severity: 'high',
            description: 'Allergen mentioned in description. Ensure allergen management protocols are followed.',
            suggestedAction: 'Review allergen management procedures and verify cross-contamination controls.',
          });
        }
      }

      // Check for HACCP-related issues
      const haccpKeywords = ['ccp', 'critical control point', 'hazard', 'contamination'];
      const hasHACCPMention = haccpKeywords.some(keyword =>
        description.toLowerCase().includes(keyword)
      );

      if (hasHACCPMention) {
        const haccpStandards = await this.getStandardsBySection('HACCP');
        if (haccpStandards.length > 0) {
          violations.push({
            standard: haccpStandards[0],
            violation_type: 'haccp',
            severity: 'medium',
            description: 'HACCP-related issue identified. Ensure proper hazard analysis is conducted.',
            suggestedAction: 'Conduct 5-Why analysis and identify root cause per HACCP principles.',
          });
        }
      }
    }

    // Calculate compliance score
    const complianceScore = violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 20);

    // Generate recommendations
    if (violations.length > 0) {
      recommendations.push('Review GMP standards and ensure all violations are addressed.');
      recommendations.push('Update corrective action to include GMP-aligned preventive measures.');
    } else {
      recommendations.push('No GMP violations detected. Continue following GMP protocols.');
    }

    return {
      violations,
      complianceScore,
      recommendations,
    };
  }

  /**
   * Get HACCP-based root cause suggestions
   */
  async getHACCPRootCauseSuggestions(currentAnalysis: string): Promise<string[]> {
    const haccpStandards = await this.getStandardsBySection('HACCP');
    
    if (haccpStandards.length === 0) {
      return [
        'Apply HACCP principles: Identify the hazard, determine critical control points, and establish monitoring procedures.',
      ];
    }

    return [
      'Use HACCP 5-Why method: Ask "Why?" 5 times to identify the true root cause.',
      'Identify the Critical Control Point (CCP) where the hazard occurred.',
      'Determine if monitoring procedures were adequate at the CCP.',
      'Review corrective action procedures for the identified CCP.',
    ];
  }

  /**
   * Map database record to GMPStandard
   */
  private mapToGMPStandard(data: any): GMPStandard {
    // Determine applicable_to from document metadata or default to both
    let applicable_to: ('nca' | 'mjc' | 'both')[] = ['both'];
    if (data.form_sections) {
      if (data.form_sections.includes('nca')) applicable_to = ['nca'];
      if (data.form_sections.includes('mjc')) applicable_to = ['mjc'];
      if (data.form_sections.includes('both')) applicable_to = ['both'];
    }

    return {
      id: data.id,
      document_number: data.document_number,
      document_name: data.document_name,
      gmp_section: data.brcgs_section || undefined,
      content: data.full_text || '',
      applicable_to,
      brcgs_reference: data.brcgs_section,
    };
  }
}

/**
 * Factory function for dependency injection
 */
export function createGMPStandardsService(supabase?: SupabaseClient): GMPStandardsService {
  return new GMPStandardsService(supabase);
}

