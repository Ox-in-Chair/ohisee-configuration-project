/**
 * Quality Scorer Unit Tests
 *
 * Tests the AI quality scoring algorithm that evaluates NCA/MJC submissions
 * against BRCGS compliance requirements.
 *
 * Scoring Components:
 * - Completeness (30%): All required fields filled
 * - Accuracy (25%): Correct data formats, valid references
 * - Clarity (20%): Description quality, terminology usage
 * - Hazard Identification (15%): Food safety awareness
 * - Evidence (10%): Attachments, traceability data
 *
 * Thresholds:
 * - Pass: 75/100
 * - Block: <75/100
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Types
interface QualityScore {
  overall: number;
  components: {
    completeness: number;
    accuracy: number;
    clarity: number;
    hazardIdentification: number;
    evidence: number;
  };
  feedback: string[];
  blockers: string[];
}

interface NCAData {
  nc_description?: string;
  nc_product_description?: string;
  supplier_name?: string;
  supplier_wo_batch?: string;
  quantity?: number;
  quantity_unit?: string;
  cross_contamination?: boolean;
  back_tracking_completed?: boolean;
  disposition_rework?: boolean;
  rework_instruction?: string;
  root_cause_analysis?: string;
  corrective_action?: string;
}

// Mock implementation to test against
class QualityScorer {
  /**
   * Calculate quality score for NCA/MJC submission
   */
  public calculateScore(data: NCAData, userRole: string): QualityScore {
    const components = {
      completeness: this.scoreCompleteness(data),
      accuracy: this.scoreAccuracy(data),
      clarity: this.scoreClarity(data, userRole),
      hazardIdentification: this.scoreHazardIdentification(data),
      evidence: this.scoreEvidence(data)
    };

    // Weighted aggregation (30/25/20/15/10)
    const overall = (
      components.completeness * 0.30 +
      components.accuracy * 0.25 +
      components.clarity * 0.20 +
      components.hazardIdentification * 0.15 +
      components.evidence * 0.10
    );

    const feedback = this.generateFeedback(components, data);
    const blockers = this.identifyBlockers(components, data);

    return {
      overall: Math.round(overall),
      components,
      feedback,
      blockers
    };
  }

  private scoreCompleteness(data: NCAData): number {
    const requiredFields = [
      'nc_description',
      'nc_product_description',
      'quantity',
      'quantity_unit'
    ];

    const filledFields = requiredFields.filter(field => {
      const value = data[field as keyof NCAData];
      return value !== null && value !== undefined && value !== '';
    });

    return (filledFields.length / requiredFields.length) * 100;
  }

  private scoreAccuracy(data: NCAData): number {
    let score = 100;
    const deductions: string[] = [];

    // Check description length (min 100 chars)
    if (data.nc_description && data.nc_description.length < 100) {
      score -= 30;
      deductions.push('Description too short');
    }

    // Check quantity validation
    if (data.quantity !== undefined && data.quantity <= 0) {
      score -= 20;
      deductions.push('Invalid quantity');
    }

    // Cross-contamination validation
    if (data.cross_contamination && !data.back_tracking_completed) {
      score -= 50;
      deductions.push('Cross-contamination requires back tracking');
    }

    // Rework instruction validation
    if (data.disposition_rework && !data.rework_instruction) {
      score -= 30;
      deductions.push('Rework disposition requires instruction');
    }

    return Math.max(0, score);
  }

  private scoreClarity(data: NCAData, userRole: string): number {
    let score = 100;

    if (!data.nc_description) return 0;

    const description = data.nc_description;

    // Technical terminology usage (role-appropriate)
    const technicalTerms = ['calibration', 'contamination', 'specification', 'tolerance', 'hygiene'];
    const hasTechnicalTerms = technicalTerms.some(term =>
      description.toLowerCase().includes(term)
    );

    if (userRole === 'qa-supervisor' && !hasTechnicalTerms) {
      score -= 20; // QA should use technical language
    }

    // Vague language detection
    const vagueTerms = ['maybe', 'possibly', 'might be', 'not sure', 'approximately'];
    const hasVagueLanguage = vagueTerms.some(term =>
      description.toLowerCase().includes(term)
    );

    if (hasVagueLanguage) {
      score -= 30;
    }

    // Sentence structure (basic check)
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) {
      score -= 15; // Single sentence descriptions lack detail
    }

    return Math.max(0, score);
  }

  private scoreHazardIdentification(data: NCAData): number {
    let score = 50; // Start at baseline

    if (!data.nc_description) return 0;

    const description = data.nc_description.toLowerCase();

    // Food safety keywords
    const safetyKeywords = ['contamination', 'foreign body', 'allergen', 'hygiene', 'safety', 'hazard'];
    const hasSafetyAwareness = safetyKeywords.some(keyword =>
      description.includes(keyword)
    );

    if (hasSafetyAwareness) {
      score += 50; // Full marks if food safety mentioned
    }

    // Explicit cross-contamination flag
    if (data.cross_contamination === true) {
      score = 100; // Correctly identified critical hazard
    }

    return score;
  }

  private scoreEvidence(data: NCAData): number {
    let score = 0;

    // Supplier batch tracking
    if (data.supplier_wo_batch) score += 30;

    // Quantity documented
    if (data.quantity && data.quantity_unit) score += 30;

    // Root cause analysis provided
    if (data.root_cause_analysis && data.root_cause_analysis.length >= 50) {
      score += 20;
    }

    // Corrective action provided
    if (data.corrective_action && data.corrective_action.length >= 50) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private generateFeedback(components: any, data: NCAData): string[] {
    const feedback: string[] = [];

    if (components.completeness < 100) {
      feedback.push('Complete all required fields before submission');
    }

    if (components.accuracy < 75) {
      if (data.nc_description && data.nc_description.length < 100) {
        feedback.push('Description must be at least 100 characters');
      }
      if (data.cross_contamination && !data.back_tracking_completed) {
        feedback.push('Cross-contamination requires completed back tracking');
      }
    }

    if (components.clarity < 70) {
      feedback.push('Use specific details and avoid vague language');
    }

    if (components.hazardIdentification < 60) {
      feedback.push('Consider food safety implications and hazard identification');
    }

    if (components.evidence < 50) {
      feedback.push('Add traceability data (supplier batch, quantity details)');
    }

    return feedback;
  }

  private identifyBlockers(components: any, data: NCAData): string[] {
    const blockers: string[] = [];

    // BRCGS critical controls
    if (data.cross_contamination && !data.back_tracking_completed) {
      blockers.push('CRITICAL: Back tracking must be completed before submission');
    }

    if (data.disposition_rework && !data.rework_instruction) {
      blockers.push('CRITICAL: Rework instruction required for rework disposition');
    }

    if (components.completeness < 50) {
      blockers.push('Too many required fields missing');
    }

    if (!data.nc_description || data.nc_description.length < 100) {
      blockers.push('Description does not meet minimum 100 character requirement');
    }

    return blockers;
  }
}

describe('QualityScorer', () => {
  let scorer: QualityScorer;

  beforeEach(() => {
    scorer = new QualityScorer();
  });

  describe('Completeness Scoring (30% weight)', () => {
    it('should return 100 when all required fields filled', () => {
      const data: NCAData = {
        nc_description: 'This is a detailed description of the non-conformance that exceeds the minimum character requirement of 100 characters.',
        nc_product_description: 'Stand-up pouches 250ml',
        quantity: 500,
        quantity_unit: 'units'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.completeness).toBe(100);
    });

    it('should return 75 when 3 of 4 required fields filled', () => {
      const data: NCAData = {
        nc_description: 'Valid description exceeding 100 characters with enough detail to be considered complete and comprehensive.',
        nc_product_description: 'Stand-up pouches 250ml',
        quantity: 500
        // Missing quantity_unit
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.completeness).toBe(75);
    });

    it('should return 0 when no required fields filled', () => {
      const data: NCAData = {};

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.completeness).toBe(0);
    });
  });

  describe('Accuracy Scoring (25% weight)', () => {
    it('should deduct 30 points for description < 100 characters', () => {
      const data: NCAData = {
        nc_description: 'Too short description',
        nc_product_description: 'Product',
        quantity: 100,
        quantity_unit: 'units'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.accuracy).toBe(70); // 100 - 30
    });

    it('should deduct 20 points for invalid quantity', () => {
      const data: NCAData = {
        nc_description: 'Valid description with sufficient length to pass the minimum character requirement of 100 characters.',
        nc_product_description: 'Product',
        quantity: 0, // Invalid
        quantity_unit: 'units'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.accuracy).toBe(80); // 100 - 20
    });

    it('should deduct 50 points for cross-contamination without back tracking', () => {
      const data: NCAData = {
        nc_description: 'Contamination detected during inspection requiring immediate investigation and traceability tracking.',
        cross_contamination: true,
        back_tracking_completed: false
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.accuracy).toBe(50); // 100 - 50
    });

    it('should deduct 30 points for rework without instruction', () => {
      const data: NCAData = {
        nc_description: 'Product defect requiring rework to meet specification and quality standards for customer delivery.',
        disposition_rework: true,
        rework_instruction: undefined
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.accuracy).toBe(70); // 100 - 30
    });

    it('should return 100 for fully accurate data', () => {
      const data: NCAData = {
        nc_description: 'Complete and accurate description meeting all requirements with proper detail and context provided.',
        quantity: 500,
        quantity_unit: 'units',
        cross_contamination: false,
        disposition_rework: false
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.accuracy).toBe(100);
    });
  });

  describe('Clarity Scoring (20% weight)', () => {
    it('should deduct points for vague language', () => {
      const data: NCAData = {
        nc_description: 'Maybe there was possibly some issue that might be related to the product quality but not sure exactly.'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.clarity).toBeLessThan(70);
    });

    it('should score QA lower for missing technical terminology', () => {
      const data: NCAData = {
        nc_description: 'There was a problem with the product. It did not look right. We need to check it before sending.'
      };

      const qaResult = scorer.calculateScore(data, 'qa-supervisor');
      const opResult = scorer.calculateScore(data, 'operator');

      expect(qaResult.components.clarity).toBeLessThan(opResult.components.clarity);
    });

    it('should score higher for technical terminology (QA role)', () => {
      const data: NCAData = {
        nc_description: 'Calibration drift detected on thickness measurement system. Product exceeded specification tolerance of ±0.5mm. Hygiene procedures maintained throughout investigation.'
      };

      const result = scorer.calculateScore(data, 'qa-supervisor');
      expect(result.components.clarity).toBeGreaterThan(70);
    });

    it('should deduct points for single-sentence descriptions', () => {
      const data: NCAData = {
        nc_description: 'Product defect detected during quality inspection'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.clarity).toBeLessThan(85);
    });
  });

  describe('Hazard Identification Scoring (15% weight)', () => {
    it('should score 100 when cross_contamination flag is true', () => {
      const data: NCAData = {
        nc_description: 'Potential contamination event detected',
        cross_contamination: true
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.hazardIdentification).toBe(100);
    });

    it('should score 100 when food safety keywords present', () => {
      const data: NCAData = {
        nc_description: 'Foreign body contamination detected during inspection requiring immediate hazard analysis and safety assessment.'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.hazardIdentification).toBe(100);
    });

    it('should score 50 (baseline) when no safety awareness shown', () => {
      const data: NCAData = {
        nc_description: 'Product appearance issue detected during routine visual inspection of finished goods.'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.hazardIdentification).toBe(50);
    });
  });

  describe('Evidence Scoring (10% weight)', () => {
    it('should score 0 when no evidence provided', () => {
      const data: NCAData = {
        nc_description: 'Issue detected'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.evidence).toBe(0);
    });

    it('should score 30 for supplier batch tracking', () => {
      const data: NCAData = {
        nc_description: 'Issue detected',
        supplier_wo_batch: 'BATCH-2025-001'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.evidence).toBe(30);
    });

    it('should score 60 for quantity + batch data', () => {
      const data: NCAData = {
        nc_description: 'Issue detected',
        supplier_wo_batch: 'BATCH-2025-001',
        quantity: 500,
        quantity_unit: 'units'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.evidence).toBe(60);
    });

    it('should score 100 for complete evidence', () => {
      const data: NCAData = {
        nc_description: 'Issue detected',
        supplier_wo_batch: 'BATCH-2025-001',
        quantity: 500,
        quantity_unit: 'units',
        root_cause_analysis: 'Root cause identified as calibration drift on measurement equipment.',
        corrective_action: 'Recalibrated equipment and implemented daily verification checks.'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.evidence).toBe(100);
    });
  });

  describe('Weighted Aggregation', () => {
    it('should calculate overall score with correct weights', () => {
      const data: NCAData = {
        nc_description: 'Complete description with technical terminology and food safety awareness regarding contamination hazards.',
        nc_product_description: 'Stand-up pouches',
        supplier_wo_batch: 'BATCH-001',
        quantity: 500,
        quantity_unit: 'units',
        cross_contamination: false,
        root_cause_analysis: 'Detailed root cause analysis provided here.'
      };

      const result = scorer.calculateScore(data, 'qa-supervisor');

      // Manual calculation check
      const expected = Math.round(
        result.components.completeness * 0.30 +
        result.components.accuracy * 0.25 +
        result.components.clarity * 0.20 +
        result.components.hazardIdentification * 0.15 +
        result.components.evidence * 0.10
      );

      expect(result.overall).toBe(expected);
    });

    it('should pass threshold (75) for high-quality submission', () => {
      const data: NCAData = {
        nc_description: 'Calibration drift detected on thickness measurement system exceeding specification tolerance requiring immediate corrective action and equipment recalibration.',
        nc_product_description: 'Stand-up pouches 250ml',
        supplier_wo_batch: 'BATCH-2025-001',
        quantity: 500,
        quantity_unit: 'units',
        cross_contamination: false,
        root_cause_analysis: 'Root cause: Equipment calibration drift due to temperature fluctuations.',
        corrective_action: 'Recalibrated equipment and implemented environmental monitoring.'
      };

      const result = scorer.calculateScore(data, 'qa-supervisor');
      expect(result.overall).toBeGreaterThanOrEqual(75);
    });

    it('should fail threshold (<75) for low-quality submission', () => {
      const data: NCAData = {
        nc_description: 'Problem detected', // Too short
        nc_product_description: 'Product'
        // Missing quantity, unit, evidence
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.overall).toBeLessThan(75);
    });
  });

  describe('Feedback Generation', () => {
    it('should provide actionable feedback for incomplete data', () => {
      const data: NCAData = {
        nc_description: 'Short' // Too short
      };

      const result = scorer.calculateScore(data, 'operator');

      expect(result.feedback).toContain('Complete all required fields before submission');
      expect(result.feedback).toContain('Description must be at least 100 characters');
    });

    it('should provide clarity feedback for vague descriptions', () => {
      const data: NCAData = {
        nc_description: 'Maybe there was possibly some kind of issue that might have occurred but not sure.',
        nc_product_description: 'Product',
        quantity: 100,
        quantity_unit: 'units'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.feedback).toContain('Use specific details and avoid vague language');
    });

    it('should provide hazard identification guidance', () => {
      const data: NCAData = {
        nc_description: 'Product appearance issue detected during visual inspection requiring further review.',
        nc_product_description: 'Product',
        quantity: 100,
        quantity_unit: 'units'
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.feedback).toContain('Consider food safety implications and hazard identification');
    });
  });

  describe('Blocker Identification', () => {
    it('should identify CRITICAL blocker for missing back tracking', () => {
      const data: NCAData = {
        nc_description: 'Contamination event detected',
        cross_contamination: true,
        back_tracking_completed: false
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.blockers).toContain('CRITICAL: Back tracking must be completed before submission');
    });

    it('should identify blocker for rework without instruction', () => {
      const data: NCAData = {
        nc_description: 'Product requires rework to meet specification',
        disposition_rework: true,
        rework_instruction: undefined
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.blockers).toContain('CRITICAL: Rework instruction required for rework disposition');
    });

    it('should identify blocker for insufficient description', () => {
      const data: NCAData = {
        nc_description: 'Short' // < 100 chars
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.blockers).toContain('Description does not meet minimum 100 character requirement');
    });

    it('should have no blockers for compliant submission', () => {
      const data: NCAData = {
        nc_description: 'Complete description with all required details and context provided for proper investigation and resolution.',
        nc_product_description: 'Stand-up pouches',
        quantity: 500,
        quantity_unit: 'units',
        cross_contamination: false
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.blockers).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      const data: NCAData = {};
      const result = scorer.calculateScore(data, 'operator');

      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should handle null description', () => {
      const data: NCAData = {
        nc_description: undefined
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.clarity).toBe(0);
    });

    it('should cap scores at 100', () => {
      const data: NCAData = {
        nc_description: 'Perfect description with contamination hazard awareness and safety protocols.',
        nc_product_description: 'Product',
        supplier_wo_batch: 'BATCH-001',
        quantity: 500,
        quantity_unit: 'units',
        cross_contamination: true,
        back_tracking_completed: true,
        root_cause_analysis: 'Complete root cause with Ishikawa diagram and corrective actions.',
        corrective_action: 'Implemented comprehensive corrective and preventive action plan.'
      };

      const result = scorer.calculateScore(data, 'qa-supervisor');

      expect(result.components.completeness).toBeLessThanOrEqual(100);
      expect(result.components.accuracy).toBeLessThanOrEqual(100);
      expect(result.components.clarity).toBeLessThanOrEqual(100);
      expect(result.components.hazardIdentification).toBeLessThanOrEqual(100);
      expect(result.components.evidence).toBeLessThanOrEqual(100);
    });

    it('should handle negative quantity edge case', () => {
      const data: NCAData = {
        nc_description: 'Valid description',
        quantity: -10
      };

      const result = scorer.calculateScore(data, 'operator');
      expect(result.components.accuracy).toBeLessThan(100);
    });
  });
});
