/**
 * Nonce / Event ID Cache for Anti-Replay Attack Protection
 * Implements an in-memory sliding window cache with TTL expiration.
 */
export interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

export class NonceStore {
  private cache: Map<string, number> = new Map();
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Cleans expired nonces from memory.
   */
  public purgeExpired(now: number = Date.now()): void {
    this.cache.forEach((expiresAt, nonce) => {
      if (expiresAt <= now) {
        this.cache.delete(nonce);
      }
    });
  }

  /**
   * Checks if nonce has been recorded and is still unexpired.
   */
  public has(nonce: string, now: number = Date.now()): boolean {
    const expiresAt = this.cache.get(nonce);
    if (!expiresAt) return false;
    if (expiresAt <= now) {
      this.cache.delete(nonce);
      return false;
    }
    return true;
  }

  /**
   * Attempts to consume a nonce atomically.
   * Returns true if nonce is newly accepted; false if it already exists (replay).
   */
  public consume(nonce: string, ttlMs: number = this.defaultTtlMs, now: number = Date.now()): boolean {
    if (!nonce || typeof nonce !== "string" || nonce.trim().length === 0) {
      return false;
    }
    if (this.has(nonce, now)) {
      return false; // Replay detected
    }
    // Set expiration
    this.cache.set(nonce, now + ttlMs);
    // Periodically purge if cache grows large
    if (this.cache.size > 10000) {
      this.purgeExpired(now);
    }
    return true;
  }

  /**
   * Resets the store. Useful for testing.
   */
  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

// Global default singleton instance
export const globalNonceStore = new NonceStore();
