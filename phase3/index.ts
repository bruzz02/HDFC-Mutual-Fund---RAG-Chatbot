import { SemanticChunk } from '../phase2/schema';
import { VectorDocument, VectorDocumentSchema, SearchFilter, HybridSearchResult, IndexingSummary } from './schema';
import { DenseEmbedder } from './embedder';
import { HybridVectorStore } from './vector_store';

export * from './schema';
export * from './embedder';
export * from './sparse_index';
export * from './vector_store';

export class Phase3IndexingPipeline {
  private embedder: DenseEmbedder;
  private vectorStore: HybridVectorStore;

  constructor() {
    this.embedder = new DenseEmbedder();
    this.vectorStore = new HybridVectorStore();
  }

  getStore(): HybridVectorStore {
    return this.vectorStore;
  }

  /**
   * Generates 768-dim embeddings for all chunks and upserts them into the hybrid vector store.
   */
  async indexChunks(chunks: SemanticChunk[]): Promise<IndexingSummary> {
    const startTime = Date.now();
    const documents: VectorDocument[] = [];

    for (const chunk of chunks) {
      const textToEmbed = `${chunk.title}\n${chunk.content}`;
      const embedding = await this.embedder.embedText(textToEmbed, 'document');

      const doc: VectorDocument = VectorDocumentSchema.parse({
        id: chunk.chunk_id,
        fund_id: chunk.fund_id,
        fund_name: chunk.fund_name,
        chunk_type: chunk.chunk_type,
        title: chunk.title,
        content: chunk.content,
        source_url: chunk.source_url,
        token_count: chunk.token_count,
        embedding,
        metadata: chunk.metadata,
        indexed_at: new Date().toISOString()
      });

      documents.push(doc);
    }

    this.vectorStore.upsertBatch(documents);
    const durationMs = Date.now() - startTime;

    return {
      totalDocumentsIndexed: documents.length,
      vectorDimension: 768,
      sparseVocabularySize: this.vectorStore.getVocabularySize(),
      indexDurationMs: durationMs,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Performs hybrid search (Dense + BM25 with RRF) given a user query.
   */
  async search(
    queryText: string,
    topK: number = 5,
    filter?: SearchFilter
  ): Promise<HybridSearchResult[]> {
    const queryVector = await this.embedder.embedText(queryText, 'query');
    return this.vectorStore.searchHybrid(queryText, queryVector, topK, filter);
  }
}
