/**
 * AI Service Factory
 * Creates fully configured AIService instance with all dependencies
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { AIService } from './ai-service';
import { KnowledgeBaseService } from './rag/knowledge-base-service';
import { AuditLogger } from './audit-logger';
import { RateLimiter } from './rate-limiter';
import { AIConfig } from './types';
import type { IAnthropicClient } from './ai-service.interface';

/**
 * Create AIService with production dependencies
 */
export function createAIService(config?: Partial<AIConfig>): AIService {
  // Validate required environment variables
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables are required');
  }

  // Create Anthropic client (cast to interface for compatibility)
  const anthropicClient = new Anthropic({
    apiKey: anthropicApiKey
  }) as unknown as IAnthropicClient;

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Create dependencies
  const knowledgeBase = new KnowledgeBaseService(supabase);
  const auditLogger = new AuditLogger(supabase);
  const rateLimiter = new RateLimiter({
    requests_per_minute: 10,
    requests_per_hour: 100
  });

  // Create and return AIService
  return new AIService(
    anthropicClient,
    knowledgeBase,
    auditLogger,
    rateLimiter,
    config
  );
}

/**
 * Create AIService for testing with mocked dependencies
 */
export function createTestAIService(mocks: {
  anthropicClient?: unknown;
  knowledgeBase?: unknown;
  auditLogger?: unknown;
  rateLimiter?: unknown;
  config?: Partial<AIConfig>;
}): AIService {
  return new AIService(
    mocks.anthropicClient as IAnthropicClient,
    mocks.knowledgeBase as KnowledgeBaseService,
    mocks.auditLogger as AuditLogger,
    mocks.rateLimiter as RateLimiter,
    mocks.config
  );
}
