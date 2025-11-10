/**
 * AI Actions Unit Tests
 * Test Server Actions with mocked dependencies
 *
 * Test Strategy:
 * - Mock AI service responses
 * - Mock database calls
 * - Verify error handling
 * - Validate performance requirements
 */

import type { NCA, MJC } from '@/lib/ai/types';

// Mock dependencies before imports
jest.mock('@/lib/database/client');
jest.mock('@/lib/ai');
jest.mock('next/cache');

// Import after mocking
import {
  analyzeNCAQualityInline,
  validateNCABeforeSubmit,
  generateNCACorrectiveAction,
  analyzeMJCQualityInline,
  validateMJCBeforeSubmit,
  generateMJCMaintenanceAction,
  recordAISuggestionFeedback,
  getUserQualityMetrics
} from '@/app/actions/ai-actions';

import { createServerClient } from '@/lib/database/client';
import { createAIService } from '@/lib/ai';

// ============================================================================
// Test Data
// ============================================================================

const testNCA: Partial<NCA> = {
  nca_id: 'test-nca-id',
  nc_description: 'Test non-conformance description that is sufficiently detailed',
  nc_type: 'raw-material',
  machine_status: 'operational',
  cross_contamination: false,
  disposition_rework: false,
  disposition_concession: false
};

const testMJC: Partial<MJC> = {
  mjc_id: 'test-mjc-id',
  description_required: 'Test maintenance job description that is detailed',
  maintenance_category: 'reactive',
  maintenance_type_mechanical: true,
  maintenance_type_electrical: false,
  maintenance_type_pneumatical: false,
  machine_status: 'down',
  urgency: 'high',
  temporary_repair: false,
  machine_equipment: 'Test Machine 1'
};

// ============================================================================
// Mock Setup
// ============================================================================

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => ({
          data: {
            id: '10000000-0000-0000-0000-000000000001',
            role: 'operator',
            name: 'John Smith',
            department: 'production',
            induction_completed: true,
            induction_date: '2024-01-15'
          },
          error: null
        })),
        gte: jest.fn(() => ({
          data: [],
          error: null
        }))
      })),
      gte: jest.fn(() => ({
        data: [],
        count: 0,
        error: null
      })),
      lte: jest.fn(() => ({
        data: [],
        count: 0,
        error: null
      }))
    })),
    insert: jest.fn(() => ({
      data: { id: 'test-id' },
      error: null
    })),
    upsert: jest.fn(() => ({
      data: { id: 'test-id' },
      error: null
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        data: { id: 'test-id' },
        error: null
      }))
    }))
  })),
  rpc: jest.fn(() => ({
    data: null,
    error: null
  }))
};

const mockAIService = {
  analyzeFieldQuality: jest.fn(async () => ({
    score: 85,
    breakdown: {
      completeness: 25,
      accuracy: 20,
      clarity: 18,
      hazard_identification: 14,
      evidence: 8
    },
    threshold_met: true
  })),
  generateSuggestions: jest.fn(async () => ({
    text: 'Test corrective action suggestion',
    sections: {
      immediate_correction: 'Test immediate correction',
      root_cause: 'Test root cause',
      corrective_action: 'Test corrective action',
      verification: 'Test verification'
    },
    quality_score: 85,
    confidence: 'high' as const,
    confidence_percentage: 90,
    procedure_references: ['5.7', '3.9'],
    keywords_detected: {
      category: 'equipment',
      keywords: ['machine', 'failure', 'repair']
    },
    recommendations: {
      create_mjc: true,
      calibration_check: false,
      training_required: false,
      hara_review: false
    }
  })),
  validateBeforeSubmit: jest.fn(async () => ({
    valid: true,
    errors: [],
    warnings: [],
    quality_assessment: {
      score: 85,
      breakdown: {
        completeness: 25,
        accuracy: 20,
        clarity: 18,
        hazard_identification: 14,
        evidence: 8
      },
      threshold_met: true
    },
    ready_for_submission: true
  }))
};

beforeEach(() => {
  jest.clearAllMocks();
  (createServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  (createAIService as jest.Mock).mockReturnValue(mockAIService);
});

// ============================================================================
// NCA Quality Analysis Tests
// ============================================================================

describe('analyzeNCAQualityInline', () => {
  it('should return quality score within 2 seconds', async () => {
    const start = Date.now();
    const result = await analyzeNCAQualityInline(testNCA);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(result.success).toBe(true);
    expect(result.data?.score).toBeGreaterThanOrEqual(0);
    expect(result.data?.score).toBeLessThanOrEqual(100);
  });

  it('should return actionable suggestions', async () => {
    const result = await analyzeNCAQualityInline(testNCA);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.data?.suggestions)).toBe(true);
  });

  it('should handle rate limit errors gracefully', async () => {
    const rateLimitError: any = new Error('Rate limit exceeded');
    rateLimitError.code = 'rate_limit_exceeded';

    (createAIService as jest.Mock).mockReturnValueOnce({
      analyzeFieldQuality: jest.fn(() => {
        throw rateLimitError;
      })
    });

    const result = await analyzeNCAQualityInline(testNCA);

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily busy');
  });

  it('should not block user on AI failure', async () => {
    (createAIService as jest.Mock).mockReturnValueOnce({
      analyzeFieldQuality: jest.fn(() => {
        throw new Error('AI service down');
      })
    });

    const result = await analyzeNCAQualityInline(testNCA);

    expect(result.success).toBe(false);
    expect(result.error).toContain('still submit');
  });
});

describe('validateNCABeforeSubmit', () => {
  it('should perform deep validation', async () => {
    const result = await validateNCABeforeSubmit('test-nca-id', testNCA as NCA);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.valid).toBeDefined();
    expect(result.data?.quality_assessment).toBeDefined();
  });

  it('should block submission if quality below threshold', async () => {
    (createAIService as jest.Mock).mockReturnValueOnce({
      validateBeforeSubmit: jest.fn(async () => ({
        valid: true,
        errors: [],
        warnings: [{
          field: 'overall',
          message: 'Quality score below threshold',
          suggestion: 'Improve completeness'
        }],
        quality_assessment: {
          score: 65,
          breakdown: {
            completeness: 15,
            accuracy: 15,
            clarity: 15,
            hazard_identification: 10,
            evidence: 10
          },
          threshold_met: false
        },
        ready_for_submission: false
      }))
    });

    const result = await validateNCABeforeSubmit('test-nca-id', testNCA as NCA);

    expect(result.success).toBe(true);
    expect(result.data?.ready_for_submission).toBe(false);
    expect(result.data?.quality_assessment.threshold_met).toBe(false);
  });
});

describe('generateNCACorrectiveAction', () => {
  it('should generate AI suggestion with procedure references', async () => {
    const result = await generateNCACorrectiveAction('test-nca-id', testNCA as NCA);

    expect(result.success).toBe(true);
    expect(result.data?.text).toBeDefined();
    expect(result.data?.procedure_references).toContain('5.7');
    expect(result.data?.quality_score).toBeGreaterThanOrEqual(75);
  });

  it('should handle low confidence gracefully', async () => {
    const lowConfidenceError: any = new Error('Low confidence');
    lowConfidenceError.code = 'low_confidence';

    (createAIService as jest.Mock).mockReturnValueOnce({
      generateSuggestions: jest.fn(() => {
        throw lowConfidenceError;
      })
    });

    const result = await generateNCACorrectiveAction('test-nca-id', testNCA as NCA);

    expect(result.success).toBe(false);
    expect(result.error).toContain('manually');
  });
});

// ============================================================================
// MJC Quality Analysis Tests
// ============================================================================

describe('analyzeMJCQualityInline', () => {
  it('should return quality score within 2 seconds', async () => {
    const start = Date.now();
    const result = await analyzeMJCQualityInline(testMJC);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(result.success).toBe(true);
    expect(result.data?.score).toBeGreaterThanOrEqual(0);
  });
});

describe('validateMJCBeforeSubmit', () => {
  it('should validate MJC completeness', async () => {
    const result = await validateMJCBeforeSubmit('test-mjc-id', testMJC as MJC);

    expect(result.success).toBe(true);
    expect(result.data?.valid).toBeDefined();
  });
});

describe('generateMJCMaintenanceAction', () => {
  it('should generate maintenance suggestion', async () => {
    const result = await generateMJCMaintenanceAction('test-mjc-id', testMJC as MJC);

    expect(result.success).toBe(true);
    expect(result.data?.text).toBeDefined();
    expect(result.data?.sections).toBeDefined();
  });
});

// ============================================================================
// Feedback & Metrics Tests
// ============================================================================

describe('recordAISuggestionFeedback', () => {
  it('should record user acceptance', async () => {
    const result = await recordAISuggestionFeedback('test-suggestion-id', true);

    expect(result.success).toBe(true);
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('update_ai_interaction_outcome', {
      p_log_id: 'test-suggestion-id',
      p_suggestion_accepted: true,
      p_suggestion_modified: false,
      p_final_user_value: null,
      p_quality_rating: null,
      p_user_feedback: null
    });
  });
});

describe('getUserQualityMetrics', () => {
  it('should return user performance metrics', async () => {
    const result = await getUserQualityMetrics('test-user-id', '30d');

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.user_id).toBe('test-user-id');
    expect(result.data?.period).toBe('30d');
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance Requirements', () => {
  it('inline analysis should complete within 2 seconds', async () => {
    const start = Date.now();
    await analyzeNCAQualityInline(testNCA);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  it('deep validation should complete within 30 seconds', async () => {
    const start = Date.now();
    await validateNCABeforeSubmit('test-nca-id', testNCA as NCA);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(30000);
  });
});
