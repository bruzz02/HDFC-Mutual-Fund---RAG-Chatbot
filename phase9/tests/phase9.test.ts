import { RagEvaluator } from '../rag_evaluator';
import { SemanticCache } from '../semantic_cache';
import { GOLDEN_RAG_DATASET } from '../golden_dataset';
import { 
  EvaluationMetricsSchema, 
  EvaluationCaseResultSchema, 
  EvaluationSuiteReportSchema 
} from '../schema';
import { Phase4RetrievalEngine } from '../../phase4/index';
import { INITIAL_HDFC_FUNDS } from '../../src/data/defaultFundData';
import { SemanticChunker } from '../../phase2/chunker';
import { GrowwFundRecord } from '../../phase1/schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase9Tests(): Promise<TestResult[]> {
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

  const retrievalEngine = new Phase4RetrievalEngine();
  const allChunks = INITIAL_HDFC_FUNDS.flatMap(f => SemanticChunker.chunkFund(f as unknown as GrowwFundRecord));
  await retrievalEngine.indexChunks(allChunks);

  // -------------------------------------------------------------
  // UNIT TESTS: Schema & Semantic Cache
  // -------------------------------------------------------------

  await runTest('Unit 1: EvaluationMetricsSchema validates RAG Triad scores', () => {
    EvaluationMetricsSchema.parse({
      contextPrecision: 0.95,
      faithfulness: 0.98,
      answerRelevance: 0.92,
      compositeRagScore: 0.953
    });
  });

  await runTest('Unit 2: SemanticCache delivers cache hit on identical query', async () => {
    const cache = new SemanticCache();
    await cache.set('HDFC Mid Cap expense ratio', '0.76%');

    const res = await cache.get('HDFC Mid Cap expense ratio');
    if (!res.hit || !res.entry) throw new Error('Expected cache hit');
    if (res.entry.responseMarkdown !== '0.76%') throw new Error('Stored content mismatch');
  });

  await runTest('Unit 3: SemanticCache delivers cache hit on semantically close query', async () => {
    const cache = new SemanticCache(0.85); // Allow domain close queries
    await cache.set('HDFC Mid Cap expense ratio', '0.76%');

    const res = await cache.get('What is the expense ratio of HDFC Mid Cap?');
    if (!res.hit) throw new Error('Expected semantic cache hit');
    if ((res.similarity ?? 0) < 0.85) throw new Error(`Similarity too low: ${res.similarity}`);
  });

  await runTest('Unit 4: SemanticCache produces miss on completely unrelated query', async () => {
    const cache = new SemanticCache(0.85);
    await cache.set('HDFC Mid Cap expense ratio', '0.76%');

    const res = await cache.get('How to invest in gold bullion?');
    if (res.hit) throw new Error('Unrelated query should not hit cache');
  });

  await runTest('Unit 5: SemanticCache tracks hit and miss counts and hitRatio accurately', async () => {
    const cache = new SemanticCache();
    await cache.set('query-a', 'answer-a');

    await cache.get('query-a'); // Hit
    await cache.get('query-unrelated'); // Miss

    const stats = cache.getStats();
    if (stats.hits !== 1) throw new Error(`Expected 1 hit, got ${stats.hits}`);
    if (stats.misses !== 1) throw new Error(`Expected 1 miss, got ${stats.misses}`);
    if (stats.hitRatio !== 0.5) throw new Error(`Expected 0.5 hitRatio, got ${stats.hitRatio}`);
  });

  await runTest('Unit 6: SemanticCache invalidate flushes all entries (Phase 6 cascade hook)', async () => {
    const cache = new SemanticCache();
    await cache.set('q1', 'a1');
    await cache.set('q2', 'a2');

    const flushed = cache.invalidate();
    if (flushed !== 2) throw new Error(`Expected 2 flushed, got ${flushed}`);
    if (cache.getStats().size !== 0) throw new Error('Cache size should be 0');
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Golden Benchmark Dataset
  // -------------------------------------------------------------

  await runTest('Unit 7: GOLDEN_RAG_DATASET contains test cases covering all 4 mutual fund categories', () => {
    const categories = GOLDEN_RAG_DATASET.map(c => c.expectedCategory);
    if (!categories.includes('ELSS')) throw new Error('Missing ELSS test case');
    if (!categories.includes('Mid Cap')) throw new Error('Missing Mid Cap test case');
    if (!categories.includes('Small Cap')) throw new Error('Missing Small Cap test case');
    if (!categories.includes('Multi-Fund')) throw new Error('Missing Multi-Fund comparison test case');
  });

  await runTest('Unit 8: RagEvaluator generates valid metrics conforming to Zod schema', async () => {
    const evaluator = new RagEvaluator(retrievalEngine);
    const caseResult = await evaluator.evaluateCase(GOLDEN_RAG_DATASET[0]);

    EvaluationCaseResultSchema.parse(caseResult);
    if (caseResult.metrics.compositeRagScore < 0 || caseResult.metrics.compositeRagScore > 1) {
      throw new Error('Composite score out of bounds');
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: RAG Triad Evaluation Suite
  // -------------------------------------------------------------

  await runTest('Integration 9: ELSS golden test case achieves high faithfulness (> 0.85)', async () => {
    const evaluator = new RagEvaluator(retrievalEngine);
    const result = await evaluator.evaluateCase(GOLDEN_RAG_DATASET[0]);

    if (result.metrics.faithfulness < 0.85) {
      throw new Error(`ELSS faithfulness unexpectedly low: ${result.metrics.faithfulness}`);
    }
    if (!result.passedThresholds) {
      throw new Error('ELSS case should pass benchmark thresholds');
    }
  });

  await runTest('Integration 10: Mid Cap CAGR golden test case achieves high context precision (> 0.60)', async () => {
    const evaluator = new RagEvaluator(retrievalEngine);
    const result = await evaluator.evaluateCase(GOLDEN_RAG_DATASET[1]);

    if (result.metrics.contextPrecision < 0.60) {
      throw new Error(`Mid Cap context precision unexpectedly low: ${result.metrics.contextPrecision}`);
    }
  });

  await runTest('Integration 11: Multi-fund comparison case achieves high answer relevance (> 0.70)', async () => {
    const evaluator = new RagEvaluator(retrievalEngine);
    const result = await evaluator.evaluateCase(GOLDEN_RAG_DATASET[3]);

    if (result.metrics.answerRelevance < 0.70) {
      throw new Error(`Comparison answer relevance unexpectedly low: ${result.metrics.answerRelevance}`);
    }
  });

  await runTest('Integration 12: evaluateSuite aggregates metrics and validates against EvaluationSuiteReportSchema', async () => {
    const evaluator = new RagEvaluator(retrievalEngine);
    const suiteReport = await evaluator.evaluateSuite(GOLDEN_RAG_DATASET);

    EvaluationSuiteReportSchema.parse(suiteReport);

    if (suiteReport.totalCases !== GOLDEN_RAG_DATASET.length) {
      throw new Error(`Expected ${GOLDEN_RAG_DATASET.length} total cases`);
    }
    if (suiteReport.passedCases < 3) {
      throw new Error(`Expected at least 3 passing cases, got ${suiteReport.passedCases}`);
    }
    if (suiteReport.overallCompositeScore < 0.70) {
      throw new Error(`Overall composite score too low: ${suiteReport.overallCompositeScore}`);
    }
  });

  return results;
}
