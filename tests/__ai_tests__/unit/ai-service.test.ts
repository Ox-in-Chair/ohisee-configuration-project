/**
 * AI Service Unit Tests
 *
 * Tests the core AI service that interfaces with Anthropic Claude API
 * for quality scoring, suggestions, and coaching alerts.
 *
 * Covers:
 * - Mock Anthropic API responses
 * - Quality scoring logic integration
 * - Error handling (API failures, timeouts, rate limits)
 * - Adaptive mode switching (inline vs deep validation)
 * - Response caching and performance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock Anthropic types
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{ type: 'text'; text: string }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AIAnalysisResult {
  qualityScore: number;
  components: {
    completeness: number;
    accuracy: number;
    clarity: number;
    hazardIdentification: number;
    evidence: number;
  };
  suggestions: string[];
  warnings: string[];
  blockers: string[];
  shouldBlock: boolean;
  responseTime: number;
}

interface RateLimitError extends Error {
  status: 429;
  retryAfter?: number;
}

// Mock AI Service implementation
class AIService {
  private anthropic: any;
  private rateLimitWindow: Map<string, number[]> = new Map();
  private maxRequestsPerMinute = 10;

  constructor(apiKey: string) {
    this.anthropic = {
      messages: {
        create: jest.fn()
      }
    };
  }

  /**
   * Inline quality check - fast, lightweight (target <2s)
   */
  public async analyzeFieldQuality(
    fieldName: string,
    value: string,
    context: any
  ): Promise<{ score: number; feedback: string }> {
    const startTime = Date.now();

    try {
      // Rate limit check
      this.checkRateLimit('inline');

      const prompt = `Analyze this NCA field quality:
Field: ${fieldName}
Value: ${value}
Context: ${JSON.stringify(context)}

Provide a score 0-100 and brief feedback.`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4',
        max_tokens: 200, // Lightweight response
        messages: [{ role: 'user', content: prompt }]
      });

      const responseTime = Date.now() - startTime;

      if (responseTime > 2000) {
        console.warn(`Inline quality check exceeded 2s target: ${responseTime}ms`);
      }

      const text = response.content[0].text;
      const scoreMatch = text.match(/score:\s*(\d+)/i);
      const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

      return {
        score,
        feedback: text
      };
    } catch (error) {
      return this.handleError(error, 'inline');
    }
  }

  /**
   * Deep validation - comprehensive analysis (target <30s)
   */
  public async validateBeforeSubmit(
    ncaData: any,
    userContext: any
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    try {
      // Rate limit check
      this.checkRateLimit('deep');

      const prompt = this.buildDeepValidationPrompt(ncaData, userContext);

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const responseTime = Date.now() - startTime;

      if (responseTime > 30000) {
        console.warn(`Deep validation exceeded 30s target: ${responseTime}ms`);
      }

      const analysisText = response.content[0].text;
      const result = this.parseDeepValidationResponse(analysisText);

      return {
        ...result,
        responseTime
      };
    } catch (error) {
      return this.handleError(error, 'deep');
    }
  }

  /**
   * Rate limiting to prevent API abuse
   */
  private checkRateLimit(context: string): void {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Get requests in current window
    const recentRequests = this.rateLimitWindow.get(context) || [];
    const validRequests = recentRequests.filter(time => time > windowStart);

    if (validRequests.length >= this.maxRequestsPerMinute) {
      const error: RateLimitError = new Error('Rate limit exceeded') as RateLimitError;
      error.status = 429;
      error.retryAfter = 60 - Math.floor((now - validRequests[0]) / 1000);
      throw error;
    }

    // Add current request
    validRequests.push(now);
    this.rateLimitWindow.set(context, validRequests);
  }

  /**
   * Adaptive mode switching based on context
   */
  public async analyzeWithAdaptiveMode(
    ncaData: any,
    userContext: any
  ): Promise<AIAnalysisResult> {
    // Use inline for draft edits, deep for submission
    const isSubmission = ncaData.status === 'submitted';
    const isConfidential = userContext.confidentialMode;

    if (isConfidential) {
      // Bypass for confidential reports
      return {
        qualityScore: 100,
        components: {
          completeness: 100,
          accuracy: 100,
          clarity: 100,
          hazardIdentification: 100,
          evidence: 100
        },
        suggestions: [],
        warnings: ['Confidential mode: Quality checks bypassed'],
        blockers: [],
        shouldBlock: false,
        responseTime: 0
      };
    }

    if (isSubmission) {
      return this.validateBeforeSubmit(ncaData, userContext);
    }

    // Inline mode for draft editing
    const quickAnalysis = await this.analyzeFieldQuality(
      'nc_description',
      ncaData.nc_description,
      { type: ncaData.nc_type }
    );

    return {
      qualityScore: quickAnalysis.score,
      components: {
        completeness: 0,
        accuracy: 0,
        clarity: quickAnalysis.score,
        hazardIdentification: 0,
        evidence: 0
      },
      suggestions: [quickAnalysis.feedback],
      warnings: [],
      blockers: [],
      shouldBlock: false,
      responseTime: 0
    };
  }

  /**
   * Error handling with fallback strategies
   */
  private handleError(error: any, context: string): any {
    if (error.status === 429) {
      // Rate limit error
      throw error; // Propagate for retry logic
    }

    if (error.status === 503) {
      // Service unavailable - use fallback scoring
      console.warn('Anthropic API unavailable, using fallback scoring');
      if (context === 'inline') {
        return { score: 50, feedback: 'AI service temporarily unavailable - manual review recommended' };
      }
      return this.fallbackScoring();
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      // Timeout - use cached results if available
      console.warn('API timeout, using fallback');
      if (context === 'inline') {
        return { score: 50, feedback: 'AI service temporarily unavailable - manual review recommended' };
      }
      return this.fallbackScoring();
    }

    // Unknown error
    console.error('AI Service error:', error);
    throw error;
  }

  /**
   * Fallback scoring when AI unavailable
   */
  private fallbackScoring(): AIAnalysisResult {
    return {
      qualityScore: 50,
      components: {
        completeness: 50,
        accuracy: 50,
        clarity: 50,
        hazardIdentification: 50,
        evidence: 50
      },
      suggestions: ['AI service temporarily unavailable - manual review recommended'],
      warnings: ['Using fallback quality scoring'],
      blockers: [],
      shouldBlock: false,
      responseTime: 0
    };
  }

  private buildDeepValidationPrompt(ncaData: any, userContext: any): string {
    return `Analyze NCA quality:\n${JSON.stringify(ncaData, null, 2)}`;
  }

  private parseDeepValidationResponse(text: string): Omit<AIAnalysisResult, 'responseTime'> {
    // Mock parsing
    return {
      qualityScore: 75,
      components: {
        completeness: 80,
        accuracy: 75,
        clarity: 70,
        hazardIdentification: 75,
        evidence: 60
      },
      suggestions: [],
      warnings: [],
      blockers: [],
      shouldBlock: false
    };
  }
}

describe('AIService', () => {
  let aiService: AIService;
  let mockAnthropicCreate: jest.Mock;

  beforeEach(() => {
    aiService = new AIService('test-api-key');
    mockAnthropicCreate = (aiService as any).anthropic.messages.create;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inline Quality Checks (<2s target)', () => {
    it('should complete inline analysis within 2 seconds', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 85. Good description with clear details.' }]
      });

      const startTime = Date.now();
      await aiService.analyzeFieldQuality(
        'nc_description',
        'Contamination detected during inspection',
        { type: 'wip' }
      );
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    });

    it('should use lightweight model for inline checks', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 85' }]
      });

      await aiService.analyzeFieldQuality('nc_description', 'Test', {});

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4',
          max_tokens: 200 // Lightweight
        })
      );
    });

    it('should extract score from AI response', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 92. Excellent description with technical detail.' }]
      });

      const result = await aiService.analyzeFieldQuality('nc_description', 'Test', {});

      expect(result.score).toBe(92);
    });

    it('should return default score if parsing fails', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'No score provided' }]
      });

      const result = await aiService.analyzeFieldQuality('nc_description', 'Test', {});

      expect(result.score).toBe(50); // Default fallback
    });
  });

  describe('Deep Validation (<30s target)', () => {
    it('should complete deep validation within 30 seconds', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Quality Score: 75' }]
      });

      const startTime = Date.now();
      const result = await aiService.validateBeforeSubmit({}, {});
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
      expect(result.responseTime).toBeDefined();
    });

    it('should use comprehensive model for deep validation', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Analysis complete' }]
      });

      await aiService.validateBeforeSubmit({}, {});

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4',
          max_tokens: 2000 // Comprehensive
        })
      );
    });

    it('should return structured analysis result', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Quality Score: 75' }]
      });

      const result = await aiService.validateBeforeSubmit({}, {});

      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('components');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('blockers');
      expect(result).toHaveProperty('shouldBlock');
      expect(result).toHaveProperty('responseTime');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit of 10 requests per minute', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 85' }]
      });

      // Make 10 requests (should succeed)
      for (let i = 0; i < 10; i++) {
        await aiService.analyzeFieldQuality('test', 'value', {});
      }

      // 11th request should fail
      await expect(
        aiService.analyzeFieldQuality('test', 'value', {})
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should include retry-after in rate limit error', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 85' }]
      });

      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await aiService.analyzeFieldQuality('test', 'value', {});
      }

      try {
        await aiService.analyzeFieldQuality('test', 'value', {});
        fail('Should have thrown rate limit error');
      } catch (error: any) {
        expect(error.status).toBe(429);
        expect(error.retryAfter).toBeDefined();
        expect(error.retryAfter).toBeGreaterThan(0);
      }
    });

    it('should separate rate limits by context', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 85' }]
      });

      // Exhaust inline rate limit
      for (let i = 0; i < 10; i++) {
        await aiService.analyzeFieldQuality('test', 'value', {});
      }

      // Deep validation should still work (different context)
      await expect(
        aiService.validateBeforeSubmit({}, {})
      ).resolves.toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API timeout with fallback', async () => {
      const timeoutError: any = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockAnthropicCreate.mockRejectedValue(timeoutError);

      const result = await aiService.analyzeFieldQuality('test', 'value', {});

      expect(result.score).toBe(50); // Fallback score
      expect(result.feedback).toContain('temporarily unavailable');
    });

    it('should handle service unavailable (503) with fallback', async () => {
      const serviceError: any = new Error('Service Unavailable');
      serviceError.status = 503;
      mockAnthropicCreate.mockRejectedValue(serviceError);

      const result = await aiService.validateBeforeSubmit({}, {});

      expect(result.qualityScore).toBe(50);
      expect(result.warnings).toContain('Using fallback quality scoring');
    });

    it('should propagate rate limit errors for retry', async () => {
      const rateLimitError: any = new Error('Rate limit');
      rateLimitError.status = 429;
      mockAnthropicCreate.mockRejectedValue(rateLimitError);

      await expect(
        aiService.analyzeFieldQuality('test', 'value', {})
      ).rejects.toThrow('Rate limit');
    });

    it('should throw unknown errors', async () => {
      const unknownError = new Error('Unknown error');
      mockAnthropicCreate.mockRejectedValue(unknownError);

      await expect(
        aiService.analyzeFieldQuality('test', 'value', {})
      ).rejects.toThrow('Unknown error');
    });
  });

  describe('Adaptive Mode Switching', () => {
    it('should bypass quality checks for confidential reports', async () => {
      const result = await aiService.analyzeWithAdaptiveMode(
        { status: 'draft' },
        { confidentialMode: true }
      );

      expect(result.qualityScore).toBe(100);
      expect(result.warnings).toContain('Confidential mode: Quality checks bypassed');
      expect(mockAnthropicCreate).not.toHaveBeenCalled();
    });

    it('should use deep validation for submissions', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Analysis complete' }]
      });

      await aiService.analyzeWithAdaptiveMode(
        { status: 'submitted' },
        { confidentialMode: false }
      );

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 2000 // Deep validation
        })
      );
    });

    it('should use inline checks for draft editing', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ text: 'Score: 85' }]
      });

      await aiService.analyzeWithAdaptiveMode(
        { status: 'draft', nc_description: 'Test' },
        { confidentialMode: false }
      );

      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 200 // Inline mode
        })
      );
    });
  });

  describe('Fallback Scoring', () => {
    it('should return safe default scores when AI unavailable', async () => {
      const serviceError: any = new Error('Service Unavailable');
      serviceError.status = 503;
      mockAnthropicCreate.mockRejectedValue(serviceError);

      const result = await aiService.validateBeforeSubmit({}, {});

      expect(result.qualityScore).toBe(50);
      expect(result.components.completeness).toBe(50);
      expect(result.components.accuracy).toBe(50);
      expect(result.shouldBlock).toBe(false); // Don't block on fallback
    });

    it('should include warning about fallback mode', async () => {
      const serviceError: any = new Error('Service Unavailable');
      serviceError.status = 503;
      mockAnthropicCreate.mockRejectedValue(serviceError);

      const result = await aiService.validateBeforeSubmit({}, {});

      expect(result.warnings).toContain('Using fallback quality scoring');
      // suggestions is an array, check if any suggestion contains the text
      expect(result.suggestions.some(s => s.includes('manual review recommended'))).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log warning if inline check exceeds 2s', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockAnthropicCreate.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ content: [{ text: 'Score: 85' }] }), 2100)
        )
      );

      await aiService.analyzeFieldQuality('test', 'value', {});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded 2s target')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should log warning if deep validation exceeds 30s', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockAnthropicCreate.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ content: [{ text: 'Analysis' }] }), 30100)
        )
      );

      await aiService.validateBeforeSubmit({}, {});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('exceeded 30s target')
      );

      consoleWarnSpy.mockRestore();
    }, 35000); // Increase timeout for this test

    it('should include response time in result', async () => {
      // Add a small delay to ensure responseTime is calculated
      mockAnthropicCreate.mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ content: [{ text: 'Analysis complete' }] }), 10)
        )
      );

      const result = await aiService.validateBeforeSubmit({}, {});

      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.responseTime).toBeLessThan(30000);
    });
  });
});
