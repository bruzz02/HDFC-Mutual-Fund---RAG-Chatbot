import { RateLimitConfig } from './schema';

export class InMemoryRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private clientHits: Map<string, { count: number; resetAt: number }>;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.windowMs = config.windowMs ?? 60000;
    this.maxRequests = config.maxRequests ?? 100;
    this.clientHits = new Map();
  }

  /**
   * Checks if an IP or Client ID has exceeded the rate limit.
   */
  checkLimit(clientId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.clientHits.get(clientId);

    if (!entry || now > entry.resetAt) {
      // First hit or window expired
      const resetAt = now + this.windowMs;
      this.clientHits.set(clientId, { count: 1, resetAt });
      return { allowed: true, remaining: this.maxRequests - 1, resetTime: resetAt };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetAt };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetAt
    };
  }

  reset(): void {
    this.clientHits.clear();
  }
}
