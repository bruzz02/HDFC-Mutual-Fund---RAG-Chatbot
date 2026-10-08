import { VectorDocument } from '../phase3/schema';
import { ScoredCandidate } from './schema';

export interface RankedItem {
  document: VectorDocument;
  score: number;
  rank: number; // 1-indexed
}

export class ReciprocalRankFusion {
  private k: number;

  constructor(k: number = 60) {
    this.k = k;
  }

  /**
   * Combines dense and sparse ranked result sets using Reciprocal Rank Fusion.
   * RRF_score(d) = sum( 1 / (k + rank_i(d)) )
   */
  fuse(
    denseResults: RankedItem[],
    sparseResults: RankedItem[]
  ): ScoredCandidate[] {
    const candidateMap = new Map<string, {
      document: VectorDocument;
      denseScore?: number;
      denseRank?: number;
      sparseScore?: number;
      sparseRank?: number;
      rrfScore: number;
    }>();

    // 1. Process Dense Rankings
    for (const item of denseResults) {
      const docId = item.document.id;
      const rrfContribution = 1.0 / (this.k + item.rank);

      if (!candidateMap.has(docId)) {
        candidateMap.set(docId, {
          document: item.document,
          denseScore: item.score,
          denseRank: item.rank,
          rrfScore: rrfContribution
        });
      } else {
        const entry = candidateMap.get(docId)!;
        entry.denseScore = item.score;
        entry.denseRank = item.rank;
        entry.rrfScore += rrfContribution;
      }
    }

    // 2. Process Sparse Rankings
    for (const item of sparseResults) {
      const docId = item.document.id;
      const rrfContribution = 1.0 / (this.k + item.rank);

      if (!candidateMap.has(docId)) {
        candidateMap.set(docId, {
          document: item.document,
          sparseScore: item.score,
          sparseRank: item.rank,
          rrfScore: rrfContribution
        });
      } else {
        const entry = candidateMap.get(docId)!;
        entry.sparseScore = item.score;
        entry.sparseRank = item.rank;
        entry.rrfScore += rrfContribution;
      }
    }

    // 3. Sort candidates descending by fused RRF score
    const fusedList = Array.from(candidateMap.values()).sort((a, b) => b.rrfScore - a.rrfScore);

    // 4. Assign final RRF rank
    return fusedList.map((entry, idx) => ({
      document: entry.document,
      denseScore: entry.denseScore,
      denseRank: entry.denseRank,
      sparseScore: entry.sparseScore,
      sparseRank: entry.sparseRank,
      rrfScore: Number(entry.rrfScore.toFixed(6)),
      finalRank: idx + 1
    }));
  }
}
