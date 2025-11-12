/**
 * Rate Limiter Implementation
 * Prevents API abuse and manages AI service costs
 *
 * Default limits:
 * - 10 requests per minute per user
 * - 100 requests per hour per user
 */

import { IRateLimiter } from './ai-service.interface';

interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
}

interface RateLimitEntry {
  requests_in_minute: number[];
  requests_in_hour: number[];
}

export class RateLimiter implements IRateLimiter {
  private readonly limits: RateLimitConfig;
  private readonly storage: Map<string, RateLimitEntry>;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.limits = {
      requests_per_minute: config.requests_per_minute ?? 10,
      requests_per_hour: config.requests_per_hour ?? 100
    };
    this.storage = new Map();

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed under rate limits
   */
  async checkLimit(user_id: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.getOrCreateEntry(user_id);

    // Clean old timestamps
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    entry.requests_in_minute = entry.requests_in_minute.filter(ts => ts > oneMinuteAgo);
    entry.requests_in_hour = entry.requests_in_hour.filter(ts => ts > oneHourAgo);

    // Check limits
    const withinMinuteLimit = entry.requests_in_minute.length < this.limits.requests_per_minute;
    const withinHourLimit = entry.requests_in_hour.length < this.limits.requests_per_hour;

    return withinMinuteLimit && withinHourLimit;
  }

  /**
   * Record request for rate limiting
   */
  async recordRequest(user_id: string): Promise<void> {
    const now = Date.now();
    const entry = this.getOrCreateEntry(user_id);

    entry.requests_in_minute.push(now);
    entry.requests_in_hour.push(now);
  }

  /**
   * Get remaining requests for user
   */
  async getRemainingRequests(user_id: string): Promise<number> {
    const now = Date.now();
    const entry = this.getOrCreateEntry(user_id);

    // Clean old timestamps
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    entry.requests_in_minute = entry.requests_in_minute.filter(ts => ts > oneMinuteAgo);
    entry.requests_in_hour = entry.requests_in_hour.filter(ts => ts > oneHourAgo);

    const remainingInMinute = this.limits.requests_per_minute - entry.requests_in_minute.length;
    const remainingInHour = this.limits.requests_per_hour - entry.requests_in_hour.length;

    return Math.min(remainingInMinute, remainingInHour);
  }

  /**
   * Reset limits for user (admin function)
   */
  async resetLimits(user_id: string): Promise<void> {
    this.storage.delete(user_id);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getOrCreateEntry(user_id: string): RateLimitEntry {
    if (!this.storage.has(user_id)) {
      this.storage.set(user_id, {
        requests_in_minute: [],
        requests_in_hour: []
      });
    }

    return this.storage.get(user_id);
  }

  private cleanup(): void {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Remove entries with no recent activity
    const entries = Array.from(this.storage.entries());
    for (const [user_id, entry] of entries) {
      entry.requests_in_hour = entry.requests_in_hour.filter(ts => ts > oneHourAgo);

      if (entry.requests_in_hour.length === 0) {
        this.storage.delete(user_id);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.limits };
  }

  /**
   * Update configuration (runtime adjustment)
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    if (config.requests_per_minute !== undefined) {
      this.limits.requests_per_minute = config.requests_per_minute;
    }
    if (config.requests_per_hour !== undefined) {
      this.limits.requests_per_hour = config.requests_per_hour;
    }
  }
}
