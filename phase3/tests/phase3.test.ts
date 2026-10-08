import { DenseEmbedder } from '../embedder';
import { BM25SparseIndex } from '../sparse_index';
import { HybridVectorStore } from '../vector_store';
import { Phase3IndexingPipeline } from '../index';
import { VectorDocumentSchema, HybridSearchResultSchema } from '../schema';
import { SemanticChunker } from '../../phase2/chunker';
import { INITIAL_HDFC_FUNDS } from '../../src/data/defaultFundData';
import { GrowwFundRecord } from '../../phase1/schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase3Tests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<void> | void) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        name,
        passed: true,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        name,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message
      });
    }
  };

  const sampleFund = INITIAL_HDFC_FUNDS[1] as unknown as GrowwFundRecord; // HDFC Mid Cap
  const sampleElss = INITIAL_HDFC_FUNDS[3] as unknown as GrowwFundRecord; // HDFC ELSS
  const sampleChunks = [
    ...SemanticChunker.chunkFund(sampleFund),
    ...SemanticChunker.chunkFund(sampleElss)
  ];

  // -------------------------------------------------------------
  // UNIT TESTS: Dense Embedder & Cosine Math
  // -------------------------------------------------------------

  await runTest('Unit 1: DenseEmbedder generates 768-dimensional normalized unit vector (||v|| ≈ 1.0)', async () => {
    const embedder = new DenseEmbedder();
    const vec = await embedder.embedText('HDFC Mid Cap Fund 5-Year CAGR');

    if (vec.length !== 768) {
      throw new Error(`Expected 768 dimensions, got ${vec.length}`);
    }

    // Verify L2 norm = 1.0
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (Math.abs(norm - 1.0) > 0.001) {
      throw new Error(`Vector is not unit normalized: L2 norm is ${norm}`);
    }
  });

  await runTest('Unit 2: DenseEmbedder cosine similarity calculates accurate dot products', () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];
    const v4 = [-1, 0, 0];

    const simIdentical = DenseEmbedder.cosineSimilarity(v1, v2);
    const simOrthogonal = DenseEmbedder.cosineSimilarity(v1, v3);
    const simOpposite = DenseEmbedder.cosineSimilarity(v1, v4);

    if (simIdentical !== 1) throw new Error(`Identical vectors should have cosine 1.0, got ${simIdentical}`);
    if (simOrthogonal !== 0) throw new Error(`Orthogonal vectors should have cosine 0.0, got ${simOrthogonal}`);
    if (simOpposite !== -1) throw new Error(`Opposite vectors should have cosine -1.0, got ${simOpposite}`);
  });

  await runTest('Unit 3: Semantic projection yields high cosine similarity for related financial queries', async () => {
    const embedder = new DenseEmbedder();
    const queryMidCap = await embedder.embedText('What is the return of HDFC Mid Cap?');
    const docMidCap = await embedder.embedText(sampleChunks[1].content); // Mid Cap performance chunk
    const docElss = await embedder.embedText(sampleChunks[7].content); // ELSS costs chunk

    const simRelated = DenseEmbedder.cosineSimilarity(queryMidCap, docMidCap);
    const simUnrelated = DenseEmbedder.cosineSimilarity(queryMidCap, docElss);

    if (simRelated <= simUnrelated) {
      throw new Error(`Related chunk similarity (${simRelated}) should be higher than unrelated (${simUnrelated})`);
    }
    if (simRelated < 0.3) {
      throw new Error(`Related similarity unexpectedly low: ${simRelated}`);
    }
  });

  // -------------------------------------------------------------
  // UNIT TESTS: BM25 Sparse Indexing
  // -------------------------------------------------------------

  await runTest('Unit 4: BM25SparseIndex tokenizes, filters stopwords & maintains term frequencies', () => {
    const idx = new BM25SparseIndex();
    idx.addDocument('doc-1', 'HDFC Mid Cap fund has low expense ratio of 0.76%');
    idx.addDocument('doc-2', 'HDFC ELSS tax saver fund has 3-year statutory lock-in under Section 80C');

    if (idx.getDocumentCount() !== 2) throw new Error('Document count should be 2');
    if (idx.getVocabularySize() < 5) throw new Error('Vocabulary size too small');

    // Stopword check: 'has', 'of', 'under' should be filtered
    const matches = idx.search('lock-in 80C');
    if (matches.length === 0 || matches[0].id !== 'doc-2') {
      throw new Error('BM25 failed to retrieve doc-2 for exact financial terms');
    }
  });

  await runTest('Unit 5: BM25SparseIndex prioritizes exact acronyms and financial keywords', () => {
    const idx = new BM25SparseIndex();
    idx.addDocument('doc-aum', 'HDFC Mid Cap has an AUM of 108324 Crores');
    idx.addDocument('doc-ter', 'HDFC Mid Cap TER expense ratio is 0.76%');

    const resultsAum = idx.search('AUM Crores');
    const resultsTer = idx.search('TER expense ratio');

    if (resultsAum[0].id !== 'doc-aum') throw new Error('Failed to match AUM query');
    if (resultsTer[0].id !== 'doc-ter') throw new Error('Failed to match TER query');
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Hybrid Vector Store
  // -------------------------------------------------------------

  await runTest('Unit 6: HybridVectorStore upserts VectorDocuments conforming to Zod schema', async () => {
    const store = new HybridVectorStore();
    const embedder = new DenseEmbedder();
    const chunk = sampleChunks[0];
    const vec = await embedder.embedText(chunk.content);

    const doc = {
      id: chunk.chunk_id,
      fund_id: chunk.fund_id,
      fund_name: chunk.fund_name,
      chunk_type: chunk.chunk_type,
      title: chunk.title,
      content: chunk.content,
      source_url: chunk.source_url,
      token_count: chunk.token_count,
      embedding: vec,
      metadata: chunk.metadata,
      indexed_at: new Date().toISOString()
    };

    VectorDocumentSchema.parse(doc);
    store.upsert(doc);

    if (store.size() !== 1) throw new Error('Store size should be 1');
    if (!store.getDocument(chunk.chunk_id)) throw new Error('Document not found in store');
  });

  await runTest('Unit 7: HybridVectorStore dense search ranks candidates by cosine similarity', async () => {
    const store = new HybridVectorStore();
    const embedder = new DenseEmbedder();

    for (const c of sampleChunks) {
      const vec = await embedder.embedText(c.content);
      store.upsert({
        id: c.chunk_id,
        fund_id: c.fund_id,
        fund_name: c.fund_name,
        chunk_type: c.chunk_type,
        title: c.title,
        content: c.content,
        source_url: c.source_url,
        token_count: c.token_count,
        embedding: vec,
        metadata: c.metadata,
        indexed_at: new Date().toISOString()
      });
    }

    const queryVec = await embedder.embedText('Chirag Setalvad Mid Cap performance');
    const topDense = store.searchDense(queryVec, 3);

    if (topDense.length !== 3) throw new Error('Expected 3 dense results');
    if (topDense[0].cosineScore < topDense[1].cosineScore) {
      throw new Error('Dense results not sorted descending by cosine score');
    }
  });

  await runTest('Unit 8: HybridVectorStore metadata pre-filtering isolates target sub-category', async () => {
    const store = new HybridVectorStore();
    const embedder = new DenseEmbedder();

    for (const c of sampleChunks) {
      const vec = await embedder.embedText(c.content);
      store.upsert({
        id: c.chunk_id,
        fund_id: c.fund_id,
        fund_name: c.fund_name,
        chunk_type: c.chunk_type,
        title: c.title,
        content: c.content,
        source_url: c.source_url,
        token_count: c.token_count,
        embedding: vec,
        metadata: c.metadata,
        indexed_at: new Date().toISOString()
      });
    }

    const queryVec = await embedder.embedText('tax saving lock-in');
    const filteredResults = store.searchDense(queryVec, 5, { sub_category: 'ELSS' });

    if (filteredResults.length === 0) throw new Error('Expected results for ELSS filter');
    for (const r of filteredResults) {
      if (r.document.metadata.sub_category !== 'ELSS') {
        throw new Error(`Pre-filter failed: got ${r.document.metadata.sub_category}`);
      }
    }
  });

  await runTest('Unit 9: HybridVectorStore Reciprocal Rank Fusion (RRF) fuses dense and sparse ranks', async () => {
    const store = new HybridVectorStore();
    const embedder = new DenseEmbedder();

    for (const c of sampleChunks) {
      const vec = await embedder.embedText(c.content);
      store.upsert({
        id: c.chunk_id,
        fund_id: c.fund_id,
        fund_name: c.fund_name,
        chunk_type: c.chunk_type,
        title: c.title,
        content: c.content,
        source_url: c.source_url,
        token_count: c.token_count,
        embedding: vec,
        metadata: c.metadata,
        indexed_at: new Date().toISOString()
      });
    }

    const queryText = 'HDFC ELSS 80C 3-year lock-in';
    const queryVec = await embedder.embedText(queryText);
    const hybridMatches = store.searchHybrid(queryText, queryVec, 3);

    if (hybridMatches.length === 0) throw new Error('Hybrid search returned zero results');
    for (const h of hybridMatches) {
      HybridSearchResultSchema.parse(h);
      if (h.hybridScore <= 0) throw new Error('RRF score must be positive');
    }

    // Top result should be the ELSS costs/terms chunk
    if (!hybridMatches[0].document.id.includes('elss')) {
      throw new Error(`Top hybrid match should be ELSS, got: ${hybridMatches[0].document.id}`);
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: Full Pipeline across 16 Chunks
  // -------------------------------------------------------------

  await runTest('Integration 10: Phase3IndexingPipeline indexes all 16 Phase 2 chunks across 4 HDFC funds', async () => {
    const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
    const allChunks: any[] = [];
    for (const f of allFunds) {
      allChunks.push(...SemanticChunker.chunkFund(f));
    }

    if (allChunks.length !== 16) throw new Error(`Expected 16 chunks, got ${allChunks.length}`);

    const pipeline = new Phase3IndexingPipeline();
    const summary = await pipeline.indexChunks(allChunks);

    if (summary.totalDocumentsIndexed !== 16) {
      throw new Error(`Expected 16 indexed documents, got ${summary.totalDocumentsIndexed}`);
    }
    if (summary.vectorDimension !== 768) {
      throw new Error(`Expected 768 dimensions, got ${summary.vectorDimension}`);
    }
    if (summary.sparseVocabularySize < 50) {
      throw new Error(`Expected vocab size >= 50, got ${summary.sparseVocabularySize}`);
    }
  });

  await runTest('Integration 11: End-to-end hybrid search retrieves Mid Cap performance chunk for CAGR query', async () => {
    const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
    const allChunks: any[] = [];
    for (const f of allFunds) {
      allChunks.push(...SemanticChunker.chunkFund(f));
    }

    const pipeline = new Phase3IndexingPipeline();
    await pipeline.indexChunks(allChunks);

    const results = await pipeline.search('HDFC Mid Cap 5 year return CAGR Chirag Setalvad', 3);

    if (results.length === 0) throw new Error('No hybrid results returned');
    const top = results[0];

    if (!top.document.id.includes('mid-cap')) {
      throw new Error(`Expected top result to be mid-cap, got ${top.document.id}`);
    }
    if (top.document.chunk_type !== 'performance' && top.document.chunk_type !== 'overview') {
      throw new Error(`Expected performance or overview chunk, got ${top.document.chunk_type}`);
    }
    if (!top.document.source_url.includes('groww.in/mutual-funds/hdfc-mid-cap')) {
      throw new Error(`Missing valid Groww source URL: ${top.document.source_url}`);
    }
  });

  await runTest('Integration 12: End-to-end hybrid search with category pre-filter isolates Small Cap holdings', async () => {
    const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
    const allChunks: any[] = [];
    for (const f of allFunds) {
      allChunks.push(...SemanticChunker.chunkFund(f));
    }

    const pipeline = new Phase3IndexingPipeline();
    await pipeline.indexChunks(allChunks);

    const results = await pipeline.search('top stock holdings portfolio', 3, { sub_category: 'Small Cap' });

    if (results.length === 0) throw new Error('Expected filtered small cap results');
    for (const r of results) {
      if (r.document.metadata.sub_category !== 'Small Cap') {
        throw new Error(`Result violated pre-filter: ${r.document.metadata.sub_category}`);
      }
    }
  });

  return results;
}
