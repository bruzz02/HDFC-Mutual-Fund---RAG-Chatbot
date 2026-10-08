import { ScoredCandidate, ProcessedQuery } from './schema';

export interface RerankerOptions {
  minRelevanceScore?: number;
  diversityFactor?: number;
}

export class SemanticReranker {
  private minRelevanceScore: number;
  private diversityFactor: number;

  constructor(options: RerankerOptions = {}) {
    this.minRelevanceScore = options.minRelevanceScore ?? 0.15;
    this.diversityFactor = options.diversityFactor ?? 0.8;
  }

  /**
   * Re-ranks RRF candidates using domain-specific contextual scoring,
   * query intent alignment, term coverage, and comparative diversity.
   */
  rerank(
    candidates: ScoredCandidate[],
    processedQuery: ProcessedQuery,
    topK: number = 4
  ): ScoredCandidate[] {
    if (candidates.length === 0) return [];

    const scored = candidates.map(candidate => {
      const doc = candidate.document;
      const contentLower = doc.content.toLowerCase();
      const titleLower = doc.title.toLowerCase();
      const queryLower = processedQuery.rawQuery.toLowerCase();

      let score = candidate.rrfScore * 20; // Scale baseline RRF contribution (~0.2 to ~0.6)
      const rationales: string[] = [];

      // 1. Intent Alignment Boost
      if (processedQuery.intent !== 'general') {
        if (doc.chunk_type === processedQuery.intent) {
          score += 0.40;
          rationales.push(`Exact chunk type match (${doc.chunk_type}) for query intent`);
        } else if (
          (processedQuery.intent === 'comparison' && (doc.chunk_type === 'performance' || doc.chunk_type === 'overview')) ||
          (processedQuery.intent === 'costs_and_terms' && contentLower.includes('expense ratio'))
        ) {
          score += 0.25;
          rationales.push(`Strong thematic correlation with intent`);
        }
      }

      // 2. Fund Target Match Boost
      if (processedQuery.targetSubCategories.length > 0) {
        if (processedQuery.targetSubCategories.includes(doc.metadata.sub_category)) {
          score += 0.35;
          rationales.push(`Direct fund category match: ${doc.metadata.sub_category}`);
        } else if (!processedQuery.isComparative) {
          score -= 0.25; // Penalize non-target funds when a specific single fund was requested
        }
      }

      // 3. Keyword / Named Entity Coverage
      const tokens = queryLower.split(/[\s,.;:!?|()]+/).filter(t => t.length > 2);
      let matchedTokens = 0;
      for (const t of tokens) {
        if (contentLower.includes(t) || titleLower.includes(t)) {
          matchedTokens++;
        }
      }
      const tokenCoverage = tokens.length > 0 ? matchedTokens / tokens.length : 0;
      score += tokenCoverage * 0.30;
      if (tokenCoverage > 0.5) {
        rationales.push(`High query term coverage (${Math.round(tokenCoverage * 100)}%)`);
      }

      // 4. Exact Financial Entity Presence
      if (/\b(cagr|ter|80c|nav|aum|lock-in|alpha)\b/i.test(queryLower)) {
        if (/\b(cagr|ter|80c|nav|aum|lock-in|alpha)\b/i.test(contentLower)) {
          score += 0.15;
          rationales.push('Matched critical financial acronyms/metrics');
        }
      }

      const finalRelevanceScore = Number(Math.max(0, score).toFixed(4));
      return {
        ...candidate,
        rerankScore: finalRelevanceScore,
        relevanceRationale: rationales.join(' | ') || 'Baseline reciprocal rank fusion match'
      };
    });

    // Filter by minimum relevance threshold
    const filtered = scored.filter(c => (c.rerankScore ?? 0) >= this.minRelevanceScore);

    // Sort descending by rerankScore
    filtered.sort((a, b) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0));

    // Comparative Diversity Enforcement:
    // If query is comparative across multiple funds/categories, ensure representative selection
    if (processedQuery.isComparative && processedQuery.targetSubCategories.length > 1) {
      const selected: ScoredCandidate[] = [];
      const includedCategories = new Set<string>();

      // First pass: select the top chunk from each target category
      for (const cat of processedQuery.targetSubCategories) {
        const bestForCat = filtered.find(c => c.document.metadata.sub_category === cat);
        if (bestForCat && !selected.some(s => s.document.id === bestForCat.document.id)) {
          selected.push(bestForCat);
          includedCategories.add(cat);
        }
      }

      // Second pass: fill remaining topK slots with highest remaining scores
      for (const candidate of filtered) {
        if (selected.length >= topK) break;
        if (!selected.some(s => s.document.id === candidate.document.id)) {
          selected.push(candidate);
        }
      }

      return selected.map((c, i) => ({ ...c, finalRank: i + 1 }));
    }

    // Standard top-K selection
    return filtered.slice(0, topK).map((c, i) => ({
      ...c,
      finalRank: i + 1
    }));
  }
}
