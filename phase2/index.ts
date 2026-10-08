import { GrowwFundRecord } from '../phase1/schema';
import { SemanticChunk, ChunkingOptions, ChunkingSummary, ChunkType } from './schema';
import { SemanticChunker } from './chunker';
import { Phase2Storage, ChunkDiff } from './storage';

export * from './schema';
export * from './cleaner';
export * from './tokenizer';
export * from './chunker';
export * from './storage';

export interface Phase2ExecutionResult {
  chunks: SemanticChunk[];
  diffs: ChunkDiff[];
  summary: ChunkingSummary;
}

export class Phase2ChunkingPipeline {
  private storage: Phase2Storage;

  constructor(customDir?: string) {
    this.storage = new Phase2Storage(customDir);
  }

  /**
   * Processes an array of normalized Phase 1 GrowwFundRecords into orthogonal SemanticChunks.
   */
  processFunds(funds: GrowwFundRecord[], options: Partial<ChunkingOptions> = {}): Phase2ExecutionResult {
    const startTime = Date.now();
    const existingChunks = this.storage.readChunks();
    const chunks: SemanticChunk[] = [];
    const chunksByType: Record<ChunkType, number> = {
      overview: 0,
      performance: 0,
      holdings: 0,
      costs_and_terms: 0,
      peer_context: 0
    };

    let totalTokens = 0;

    for (const fund of funds) {
      const fundChunks = SemanticChunker.chunkFund(fund, options);
      for (const c of fundChunks) {
        chunks.push(c);
        chunksByType[c.chunk_type] = (chunksByType[c.chunk_type] || 0) + 1;
        totalTokens += c.token_count;
      }
    }

    const diffs = this.storage.computeChunkDiff(existingChunks, chunks);
    this.storage.writeChunks(chunks);

    const durationMs = Date.now() - startTime;
    const avgTokens = chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0;

    const summary: ChunkingSummary = {
      totalFundsProcessed: funds.length,
      totalChunksGenerated: chunks.length,
      chunksByType,
      avgTokensPerChunk: avgTokens,
      durationMs,
      timestamp: new Date().toISOString()
    };

    return {
      chunks,
      diffs,
      summary
    };
  }
}
