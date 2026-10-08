import { CacheEntry } from './schema';
import { DenseEmbedder } from '../phase3/embedder';

export class SemanticCache {
  private cache: Map<string, CacheEntry> = new Map();
  private embedder: DenseEmbedder;
  private similarityThreshold: number;
  private totalHits: number = 0;
  private totalMisses: number = 0;

  constructor(similarityThreshold: number = 0.95, embedder?: DenseEmbedder) {
    this.similarityThreshold = similarityThreshold;
    this.embedder = embedder ?? new DenseEmbedder({ mode: 'deterministic' });
  }

  /**
   * Looks up a query in semantic vector cache.
   */
  async get(query: string): Promise<{ hit: boolean; entry?: CacheEntry; similarity?: number }> {
    const queryVec = await this.embedder.embedText(query, 'query');
    let bestMatch: { entry: CacheEntry; similarity: number } | null = null;

    for (const entry of this.cache.values()) {
      const sim = DenseEmbedder.cosineSimilarity(queryVec, entry.queryEmbedding);
      if (sim >= this.similarityThreshold) {
        if (!bestMatch || sim > bestMatch.similarity) {
          bestMatch = { entry, similarity: sim };
        }
      }
    }

    if (bestMatch) {
      bestMatch.entry.hits++;
      this.totalHits++;
      return { hit: true, entry: bestMatch.entry, similarity: bestMatch.similarity };
    }

    this.totalMisses++;
    return { hit: false };
  }

  /**
   * Sets or warms an entry in the cache.
   */
  async set(query: string, responseMarkdown: string, sourceUrls: string[] = []): Promise<void> {
    const queryEmbedding = await this.embedder.embedText(query, 'query');
    this.cache.set(query.toLowerCase().trim(), {
      query,
      queryEmbedding,
      responseMarkdown,
      sourceUrls,
      hits: 0,
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Flushes the cache (called by Phase 6 scheduler on data sync).
   */
  invalidate(): number {
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }

  getStats(): { size: number; hits: number; misses: number; hitRatio: number } {
    const total = this.totalHits + this.totalMisses;
    const hitRatio = total > 0 ? Number((this.totalHits / total).toFixed(3)) : 0;
    return {
      size: this.cache.size,
      hits: this.totalHits,
      misses: this.totalMisses,
      hitRatio
    };
  }
}
