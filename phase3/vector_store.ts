import { VectorDocument, SearchFilter, DenseSearchResult, SparseSearchResult, HybridSearchResult } from './schema';
import { DenseEmbedder } from './embedder';
import { BM25SparseIndex } from './sparse_index';

export class HybridVectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private sparseIndex: BM25SparseIndex = new BM25SparseIndex();

  upsert(doc: VectorDocument): void {
    this.documents.set(doc.id, doc);
    const indexableText = `${doc.title} ${doc.content} ${doc.metadata.tags.join(' ')}`;
    this.sparseIndex.addDocument(doc.id, indexableText);
  }

  upsertBatch(docs: VectorDocument[]): void {
    for (const d of docs) {
      this.upsert(d);
    }
  }

  getDocument(id: string): VectorDocument | undefined {
    return this.documents.get(id);
  }

  getAllDocuments(): VectorDocument[] {
    return Array.from(this.documents.values());
  }

  size(): number {
    return this.documents.size;
  }

  getVocabularySize(): number {
    return this.sparseIndex.getVocabularySize();
  }

  /**
   * Performs dense vector search using cosine similarity with optional metadata pre-filtering.
   */
  searchDense(queryVector: number[], topK: number = 10, filter?: SearchFilter): DenseSearchResult[] {
    const results: DenseSearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (filter && !this.matchesFilter(doc, filter)) {
        continue;
      }

      const score = DenseEmbedder.cosineSimilarity(queryVector, doc.embedding);
      results.push({ document: doc, cosineScore: score });
    }

    return results
      .sort((a, b) => b.cosineScore - a.cosineScore)
      .slice(0, topK);
  }

  /**
   * Performs sparse keyword search using BM25 with optional metadata pre-filtering.
   */
  searchSparse(query: string, topK: number = 10, filter?: SearchFilter): SparseSearchResult[] {
    const rawMatches = this.sparseIndex.search(query, topK * 3);
    const results: SparseSearchResult[] = [];

    for (const m of rawMatches) {
      const doc = this.documents.get(m.id);
      if (!doc) continue;

      if (filter && !this.matchesFilter(doc, filter)) {
        continue;
      }

      results.push({
        document: doc,
        bm25Score: m.score,
        matchedTerms: m.matchedTerms
      });

      if (results.length >= topK) break;
    }

    return results;
  }

  /**
   * Performs hybrid search merging Dense and Sparse search results via Reciprocal Rank Fusion (RRF, k=60).
   */
  searchHybrid(
    queryText: string,
    queryVector: number[],
    topK: number = 10,
    filter?: SearchFilter,
    k: number = 60
  ): HybridSearchResult[] {
    const denseResults = this.searchDense(queryVector, topK * 2, filter);
    const sparseResults = this.searchSparse(queryText, topK * 2, filter);

    const denseRankMap = new Map<string, { rank: number; score: number }>();
    denseResults.forEach((r, idx) => {
      denseRankMap.set(r.document.id, { rank: idx + 1, score: r.cosineScore });
    });

    const sparseRankMap = new Map<string, { rank: number; score: number }>();
    sparseResults.forEach((r, idx) => {
      sparseRankMap.set(r.document.id, { rank: idx + 1, score: r.bm25Score });
    });

    const allDocIds = new Set([...denseRankMap.keys(), ...sparseRankMap.keys()]);
    const hybridScored: HybridSearchResult[] = [];

    for (const docId of allDocIds) {
      const doc = this.documents.get(docId)!;
      const dEntry = denseRankMap.get(docId);
      const sEntry = sparseRankMap.get(docId);

      const denseRank = dEntry?.rank ?? 100;
      const sparseRank = sEntry?.rank ?? 100;

      // Reciprocal Rank Fusion (RRF)
      const rrfScore = (1 / (k + denseRank)) + (1 / (k + sparseRank));

      hybridScored.push({
        document: doc,
        hybridScore: Number(rrfScore.toFixed(6)),
        denseRank: dEntry ? dEntry.rank : -1,
        sparseRank: sEntry ? sEntry.rank : -1,
        scoreBreakdown: {
          denseScore: dEntry?.score ?? 0,
          sparseScore: sEntry?.score ?? 0
        }
      });
    }

    return hybridScored
      .sort((a, b) => b.hybridScore - a.hybridScore)
      .slice(0, topK);
  }

  private matchesFilter(doc: VectorDocument, filter: SearchFilter): boolean {
    if (filter.category && doc.metadata.category.toLowerCase() !== filter.category.toLowerCase()) {
      return false;
    }
    if (filter.sub_category && doc.metadata.sub_category.toLowerCase() !== filter.sub_category.toLowerCase()) {
      return false;
    }
    if (filter.chunk_type && doc.chunk_type !== filter.chunk_type) {
      return false;
    }
    if (filter.fund_id && doc.fund_id !== filter.fund_id) {
      return false;
    }
    return true;
  }
}
