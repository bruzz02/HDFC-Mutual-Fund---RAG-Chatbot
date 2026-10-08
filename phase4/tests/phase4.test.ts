import { QueryRouter } from '../query_router';
import { ReciprocalRankFusion, RankedItem } from '../rrf_fusion';
import { SemanticReranker } from '../reranker';
import { ContextBuilder } from '../context_builder';
import { Phase4RetrievalEngine } from '../index';
import { VectorDocument } from '../../phase3/schema';
import { SemanticChunker } from '../../phase2/chunker';
import { INITIAL_HDFC_FUNDS } from '../../src/data/defaultFundData';
import { GrowwFundRecord } from '../../phase1/schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase4Tests(): Promise<TestResult[]> {
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

  const sampleFundMid = INITIAL_HDFC_FUNDS[1] as unknown as GrowwFundRecord;
  const sampleFundElss = INITIAL_HDFC_FUNDS[3] as unknown as GrowwFundRecord;
  const sampleFundLarge = INITIAL_HDFC_FUNDS[0] as unknown as GrowwFundRecord;
  const sampleFundSmall = INITIAL_HDFC_FUNDS[2] as unknown as GrowwFundRecord;

  // -------------------------------------------------------------
  // UNIT TESTS: Query Router
  // -------------------------------------------------------------

  await runTest('Unit 1: QueryRouter classifies intent accurately across financial domains', () => {
    const q1 = QueryRouter.analyze('What is the total expense ratio TER and exit load?');
    const q2 = QueryRouter.analyze('Show me 3-year and 5-year CAGR performance returns');
    const q3 = QueryRouter.analyze('Which stocks and companies are in the top 10 portfolio holdings?');
    const q4 = QueryRouter.analyze('Who is the fund manager and what is the current AUM and NAV?');
    const q5 = QueryRouter.analyze('Compare HDFC Large Cap versus HDFC Mid Cap');

    if (q1.intent !== 'costs_and_terms') throw new Error(`Expected costs_and_terms, got ${q1.intent}`);
    if (q2.intent !== 'performance') throw new Error(`Expected performance, got ${q2.intent}`);
    if (q3.intent !== 'holdings') throw new Error(`Expected holdings, got ${q3.intent}`);
    if (q4.intent !== 'overview') throw new Error(`Expected overview, got ${q4.intent}`);
    if (q5.intent !== 'comparison') throw new Error(`Expected comparison, got ${q5.intent}`);
  });

  await runTest('Unit 2: QueryRouter extracts target sub-categories and fund IDs', () => {
    const qLarge = QueryRouter.analyze('HDFC large cap bluechip fund facts');
    const qMid = QueryRouter.analyze('Tell me about HDFC midcap growth');
    const qSmall = QueryRouter.analyze('HDFC small cap emerging portfolio');
    const qElss = QueryRouter.analyze('Section 80C tax saver lock in');

    if (!qLarge.targetSubCategories.includes('Large Cap')) throw new Error('Failed to extract Large Cap');
    if (!qMid.targetSubCategories.includes('Mid Cap')) throw new Error('Failed to extract Mid Cap');
    if (!qSmall.targetSubCategories.includes('Small Cap')) throw new Error('Failed to extract Small Cap');
    if (!qElss.targetSubCategories.includes('ELSS')) throw new Error('Failed to extract ELSS');
  });

  await runTest('Unit 3: QueryRouter expands domain keywords (TER, 80C, CAGR)', () => {
    const qTer = QueryRouter.analyze('What is the TER of this fund?');
    const q80c = QueryRouter.analyze('Can I save tax under 80C?');

    if (!qTer.expandedKeywords.includes('expense ratio')) {
      throw new Error('TER not expanded to expense ratio');
    }
    if (!q80c.expandedKeywords.includes('3-year lock-in')) {
      throw new Error('80C not expanded to 3-year lock-in');
    }

    const expandedStr = QueryRouter.getExpandedQueryString(qTer);
    if (!expandedStr.includes('expense ratio')) {
      throw new Error('Expanded query string missing synonyms');
    }
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Reciprocal Rank Fusion (RRF)
  // -------------------------------------------------------------

  await runTest('Unit 4: ReciprocalRankFusion computes exact formula 1/(k+rank) with k=60', () => {
    const rrf = new ReciprocalRankFusion(60);

    const makeDummyDoc = (id: string): VectorDocument => ({
      id,
      fund_id: 'fund-1',
      fund_name: 'Test Fund',
      chunk_type: 'overview',
      title: 'Title',
      content: 'Content',
      source_url: 'https://groww.in/test',
      token_count: 50,
      embedding: [0.1],
      metadata: { category: 'Equity', sub_category: 'Mid Cap', aum: 1000, tags: ['hdfc'] },
      indexed_at: new Date().toISOString()
    });

    const docA = makeDummyDoc('doc-a');
    const docB = makeDummyDoc('doc-b');

    // docA is rank 1 in dense, rank 1 in sparse -> 1/61 + 1/61 = 2/61 ≈ 0.032787
    // docB is rank 2 in dense, rank 2 in sparse -> 1/62 + 1/62 = 2/62 ≈ 0.032258
    const dense: RankedItem[] = [
      { document: docA, score: 0.9, rank: 1 },
      { document: docB, score: 0.8, rank: 2 }
    ];
    const sparse: RankedItem[] = [
      { document: docA, score: 10.5, rank: 1 },
      { document: docB, score: 8.2, rank: 2 }
    ];

    const fused = rrf.fuse(dense, sparse);

    if (fused.length !== 2) throw new Error(`Expected 2 fused items, got ${fused.length}`);
    if (fused[0].document.id !== 'doc-a') throw new Error('Top fused item should be doc-a');
    if (Math.abs(fused[0].rrfScore - 0.032787) > 0.0001) {
      throw new Error(`Unexpected RRF score: ${fused[0].rrfScore}, expected ~0.032787`);
    }
    if (fused[0].finalRank !== 1 || fused[1].finalRank !== 2) {
      throw new Error('Final ranks should be 1 and 2');
    }
  });

  await runTest('Unit 5: ReciprocalRankFusion favors documents matching BOTH modalities over single modality', () => {
    const rrf = new ReciprocalRankFusion(60);

    const makeDummyDoc = (id: string): VectorDocument => ({
      id,
      fund_id: 'fund-1',
      fund_name: 'Test Fund',
      chunk_type: 'overview',
      title: 'Title',
      content: 'Content',
      source_url: 'https://groww.in/test',
      token_count: 50,
      embedding: [0.1],
      metadata: { category: 'Equity', sub_category: 'Mid Cap', aum: 1000, tags: ['hdfc'] },
      indexed_at: new Date().toISOString()
    });

    const docDual = makeDummyDoc('doc-dual'); // Rank 3 in dense, Rank 3 in sparse -> 1/63 + 1/63 = 0.031746
    const docSingle = makeDummyDoc('doc-single'); // Rank 1 in dense only -> 1/61 = 0.016393

    const dense: RankedItem[] = [
      { document: docSingle, score: 0.95, rank: 1 },
      { document: docDual, score: 0.82, rank: 3 }
    ];
    const sparse: RankedItem[] = [
      { document: docDual, score: 9.0, rank: 3 }
    ];

    const fused = rrf.fuse(dense, sparse);

    // docDual must beat docSingle because it was validated across both modalities!
    if (fused[0].document.id !== 'doc-dual') {
      throw new Error(`Dual-modality candidate should outrank single-modality candidate`);
    }
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Semantic Reranker & Context Builder
  // -------------------------------------------------------------

  await runTest('Unit 6: SemanticReranker applies contextual boosts based on query intent & target fund', () => {
    const reranker = new SemanticReranker();

    const makeDummyDoc = (id: string, chunk_type: any, sub_category: string, content: string): VectorDocument => ({
      id,
      fund_id: 'fund-1',
      fund_name: 'Test Fund',
      chunk_type,
      title: `Title for ${chunk_type}`,
      content,
      source_url: 'https://groww.in/test',
      token_count: 50,
      embedding: [0.1],
      metadata: { category: 'Equity', sub_category, aum: 1000, tags: ['hdfc'] },
      indexed_at: new Date().toISOString()
    });

    const docPerf = makeDummyDoc('mid-perf', 'performance', 'Mid Cap', '5-year CAGR return is 124.09% with high alpha.');
    const docHold = makeDummyDoc('mid-hold', 'holdings', 'Mid Cap', 'Top holdings include cash and Federal Bank.');

    const candidatePerf = { document: docPerf, rrfScore: 0.03, finalRank: 1 };
    const candidateHold = { document: docHold, rrfScore: 0.03, finalRank: 2 };

    const processedQuery = QueryRouter.analyze('What is the 5 year CAGR return of HDFC Mid Cap?');
    const reranked = reranker.rerank([candidateHold, candidatePerf], processedQuery, 2);

    if (reranked[0].document.id !== 'mid-perf') {
      throw new Error(`Expected performance chunk to be ranked #1 after re-ranking, got: ${reranked[0].document.id}`);
    }
    if (!reranked[0].relevanceRationale?.includes('chunk type match')) {
      throw new Error(`Missing rationale: ${reranked[0].relevanceRationale}`);
    }
  });

  await runTest('Unit 7: SemanticReranker enforces comparative diversity across multiple funds', () => {
    const reranker = new SemanticReranker();

    const makeDummyDoc = (id: string, sub_category: string): VectorDocument => ({
      id,
      fund_id: 'fund-1',
      fund_name: `HDFC ${sub_category}`,
      chunk_type: 'performance',
      title: `${sub_category} Performance`,
      content: `Returns and performance data for ${sub_category}`,
      source_url: 'https://groww.in/test',
      token_count: 50,
      embedding: [0.1],
      metadata: { category: 'Equity', sub_category, aum: 1000, tags: ['hdfc'] },
      indexed_at: new Date().toISOString()
    });

    // 3 Large Cap candidates with slightly higher initial scores, 1 Mid Cap
    const cLarge1 = { document: makeDummyDoc('large-1', 'Large Cap'), rrfScore: 0.035, finalRank: 1 };
    const cLarge2 = { document: makeDummyDoc('large-2', 'Large Cap'), rrfScore: 0.034, finalRank: 2 };
    const cMid1 = { document: makeDummyDoc('mid-1', 'Mid Cap'), rrfScore: 0.031, finalRank: 3 };

    const compQuery = QueryRouter.analyze('Compare HDFC Large Cap vs HDFC Mid Cap returns');
    const top2 = reranker.rerank([cLarge1, cLarge2, cMid1], compQuery, 2);

    // Diversity must guarantee both Large Cap and Mid Cap are in top 2!
    const categories = top2.map(c => c.document.metadata.sub_category);
    if (!categories.includes('Large Cap') || !categories.includes('Mid Cap')) {
      throw new Error(`Comparative diversity failed: got categories [${categories.join(', ')}]`);
    }
  });

  await runTest('Unit 8: SemanticReranker prunes low-relevance candidates below threshold', () => {
    const reranker = new SemanticReranker({ minRelevanceScore: 0.40 });

    const makeDummyDoc = (id: string, content: string): VectorDocument => ({
      id,
      fund_id: 'fund-1',
      fund_name: 'Test Fund',
      chunk_type: 'holdings',
      title: 'Holdings',
      content,
      source_url: 'https://groww.in/test',
      token_count: 50,
      embedding: [0.1],
      metadata: { category: 'Equity', sub_category: 'Small Cap', aum: 1000, tags: ['hdfc'] },
      indexed_at: new Date().toISOString()
    });

    const cIrrelevant = {
      document: makeDummyDoc('unrelated', 'Random noise without matching keywords or metrics.'),
      rrfScore: 0.005,
      finalRank: 1
    };

    const query = QueryRouter.analyze('ELSS Section 80C 3-year statutory lock-in');
    const reranked = reranker.rerank([cIrrelevant], query, 2);

    if (reranked.length !== 0) {
      throw new Error(`Expected irrelevant chunk to be pruned, got ${reranked.length} items`);
    }
  });

  await runTest('Unit 9: ContextBuilder creates prompt-ready Markdown with Groww source badges', () => {
    const doc: VectorDocument = {
      id: 'hdfc-mid-cap-costs',
      fund_id: 'hdfc-mid-cap-fund-direct-growth',
      fund_name: 'HDFC Mid Cap Fund Direct Growth',
      chunk_type: 'costs_and_terms',
      title: 'HDFC Mid Cap Fund Direct Growth - Expense Ratio, Exit Load & Tax Rules',
      content: 'Expense Ratio: 0.76%\nExit Load: 1% if redeemed within 1 year.',
      source_url: 'https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth',
      token_count: 80,
      embedding: [0.1],
      metadata: { category: 'Equity', sub_category: 'Mid Cap', aum: 108324.55, expense_ratio: 0.76, tags: ['hdfc'] },
      indexed_at: new Date().toISOString()
    };

    const candidate = {
      document: doc,
      rrfScore: 0.032,
      denseRank: 1,
      sparseRank: 1,
      rerankScore: 0.95,
      finalRank: 1,
      relevanceRationale: 'Exact match on TER'
    };

    const query = QueryRouter.analyze('HDFC Mid Cap expense ratio');
    const markdown = ContextBuilder.buildContextMarkdown([candidate], query);

    if (!markdown.includes('https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth')) {
      throw new Error('Markdown missing Groww source URL');
    }
    if (!markdown.includes('HDFC Mid Cap Fund Direct Growth')) {
      throw new Error('Markdown missing fund name');
    }
    if (!markdown.includes('Expense Ratio: 0.76%')) {
      throw new Error('Markdown missing chunk content');
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: Full Multi-Stage Retrieval Pipeline
  // -------------------------------------------------------------

  const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
  const allChunks: any[] = [];
  for (const f of allFunds) {
    allChunks.push(...SemanticChunker.chunkFund(f));
  }

  await runTest('Integration 10: Multi-stage pipeline retrieves ELSS costs & terms for 80C lock-in query', async () => {
    const engine = new Phase4RetrievalEngine();
    await engine.indexChunks(allChunks);

    const result = await engine.retrieve('What is the lock in period and tax benefit under 80C for HDFC ELSS?', 3);

    if (result.topChunks.length === 0) throw new Error('No chunks retrieved');
    const topChunk = result.topChunks[0].document;

    if (!topChunk.id.includes('elss')) {
      throw new Error(`Expected top chunk to be ELSS, got: ${topChunk.id}`);
    }
    if (topChunk.chunk_type !== 'costs_and_terms' && topChunk.chunk_type !== 'overview') {
      throw new Error(`Expected costs_and_terms chunk, got: ${topChunk.chunk_type}`);
    }
    if (!topChunk.content.includes('3 Years') && !topChunk.content.includes('80C')) {
      throw new Error('Retrieved content does not mention 3 Years or Section 80C');
    }
  });

  await runTest('Integration 11: Multi-stage pipeline retrieves Mid Cap performance chunk for 5Y CAGR query', async () => {
    const engine = new Phase4RetrievalEngine();
    await engine.indexChunks(allChunks);

    const result = await engine.retrieve('HDFC Mid Cap 5-year CAGR returns', 3);

    if (result.topChunks.length === 0) throw new Error('No chunks retrieved');
    const topChunk = result.topChunks[0].document;

    if (!topChunk.id.includes('mid-cap')) {
      throw new Error(`Expected Mid Cap chunk, got: ${topChunk.id}`);
    }
    if (topChunk.chunk_type !== 'performance') {
      throw new Error(`Expected performance chunk, got: ${topChunk.chunk_type}`);
    }
    if (!topChunk.content.includes('124.09%') && !topChunk.content.includes('5Y')) {
      throw new Error('Retrieved performance chunk missing 5Y CAGR return figures');
    }
  });

  await runTest('Integration 12: Multi-stage pipeline returns multi-fund candidates for comparison query', async () => {
    const engine = new Phase4RetrievalEngine();
    await engine.indexChunks(allChunks);

    const result = await engine.retrieve('Compare returns of HDFC Large Cap vs HDFC Small Cap', 4);

    if (result.topChunks.length < 2) throw new Error('Expected at least 2 candidates for comparison');

    const fundIds = result.topChunks.map(c => c.document.fund_id);
    const hasLargeCap = fundIds.some(id => id.includes('large-cap'));
    const hasSmallCap = fundIds.some(id => id.includes('small-cap'));

    if (!hasLargeCap || !hasSmallCap) {
      throw new Error(`Comparison retrieval failed to include both funds: found [${fundIds.join(', ')}]`);
    }
  });

  return results;
}
