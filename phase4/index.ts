import { DenseEmbedder } from '../phase3/embedder';
import { HybridVectorStore } from '../phase3/vector_store';
import { VectorDocument } from '../phase3/schema';
import { SemanticChunk } from '../phase2/schema';
import { Phase3IndexingPipeline } from '../phase3/index';
import { QueryRouter } from './query_router';
import { ReciprocalRankFusion, RankedItem } from './rrf_fusion';
import { SemanticReranker } from './reranker';
import { ContextBuilder } from './context_builder';
import { RetrievalResult, RetrievalResultSchema } from './schema';

export * from './schema';
export * from './query_router';
export * from './rrf_fusion';
export * from './reranker';
export * from './context_builder';

export interface RetrievalEngineOptions {
  vectorStore?: HybridVectorStore;
  embedder?: DenseEmbedder;
  rrfK?: number;
  minRelevanceScore?: number;
  initialFetchK?: number;
}

export class Phase4RetrievalEngine {
  private vectorStore: HybridVectorStore;
  private embedder: DenseEmbedder;
  private rrf: ReciprocalRankFusion;
  private reranker: SemanticReranker;
  private initialFetchK: number;

  constructor(options: RetrievalEngineOptions = {}) {
    this.vectorStore = options.vectorStore ?? new HybridVectorStore();
    this.embedder = options.embedder ?? new DenseEmbedder({ mode: 'deterministic' });
    this.rrf = new ReciprocalRankFusion(options.rrfK ?? 60);
    this.reranker = new SemanticReranker({ minRelevanceScore: options.minRelevanceScore ?? 0.15 });
    this.initialFetchK = options.initialFetchK ?? 10;
  }

  /**
   * Directly sets the underlying vector store.
   */
  setVectorStore(store: HybridVectorStore) {
    this.vectorStore = store;
  }

  /**
   * Indexes semantic chunks into the vector store.
   */
  async indexChunks(chunks: SemanticChunk[]) {
    const pipeline = new Phase3IndexingPipeline();
    await pipeline.indexChunks(chunks);
    this.vectorStore = pipeline.getStore();
  }

  /**
   * Executes the full multi-stage retrieval pipeline:
   * 1. Query Preprocessing & Intent Classification
   * 2. First-Stage Parallel Search (Dense Vector + BM25 Sparse)
   * 3. Reciprocal Rank Fusion (RRF k=60)
   * 4. Second-Stage Semantic Re-ranking & Diversity Enforcement
   * 5. Context Window Assembly with Groww Citations
   */
  async retrieve(rawQuery: string, finalTopK: number = 4): Promise<RetrievalResult> {
    const startTime = Date.now();

    // 1. Query Router
    const processedQuery = QueryRouter.analyze(rawQuery);
    const expandedQueryStr = QueryRouter.getExpandedQueryString(processedQuery);

    // 2. Dense Embedding for Query
    const queryVector = await this.embedder.embedText(expandedQueryStr, 'query');

    // 3. Dense Cosine Retrieval (Top-10)
    const denseHits = this.vectorStore.searchDense(queryVector, this.initialFetchK);
    const denseRanked: RankedItem[] = denseHits.map((h, i) => ({
      document: h.document,
      score: h.cosineScore,
      rank: i + 1
    }));

    // 4. BM25 Sparse Keyword Retrieval (Top-10)
    const sparseHits = this.vectorStore.searchSparse(expandedQueryStr, this.initialFetchK);
    const sparseRanked: RankedItem[] = sparseHits.map((h, i) => ({
      document: h.document,
      score: h.bm25Score,
      rank: i + 1
    }));

    // 5. Reciprocal Rank Fusion (RRF)
    const rrfCandidates = this.rrf.fuse(denseRanked, sparseRanked);

    // 6. Second-Stage Semantic Re-ranking
    const rerankedChunks = this.reranker.rerank(rrfCandidates, processedQuery, finalTopK);

    // 7. Context Markdown Assembly
    const contextMarkdown = ContextBuilder.buildContextMarkdown(rerankedChunks, processedQuery);

    const latencyMs = Date.now() - startTime;

    return RetrievalResultSchema.parse({
      query: rawQuery,
      processedQuery,
      topChunks: rerankedChunks,
      totalExamined: rrfCandidates.length,
      latencyMs,
      rerankerMode: 'heuristic_cross_encoder',
      contextMarkdown
    });
  }
}
