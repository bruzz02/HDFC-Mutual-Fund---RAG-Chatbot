import { RagEvaluator } from './rag_evaluator';
import { SemanticCache } from './semantic_cache';
import { GOLDEN_RAG_DATASET } from './golden_dataset';
import { Phase4RetrievalEngine } from '../phase4/index';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { SemanticChunker } from '../phase2/chunker';
import { GrowwFundRecord } from '../phase1/schema';

async function main() {
  console.log('===============================================================');
  console.log('       MUTUAL FUND RAG - PHASE 9 CONTINUOUS EVALUATION         ');
  console.log('===============================================================\n');

  // Prepare engine
  const retrievalEngine = new Phase4RetrievalEngine();
  const allChunks = INITIAL_HDFC_FUNDS.flatMap(f => SemanticChunker.chunkFund(f as unknown as GrowwFundRecord));
  await retrievalEngine.indexChunks(allChunks);

  console.log('1. TESTING SEMANTIC VECTOR CACHE (Redis Simulation):');
  const cache = new SemanticCache();
  await cache.set(
    'What is HDFC Mid Cap expense ratio?',
    'HDFC Mid Cap expense ratio is 0.76%.',
    ['https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth']
  );

  const queryExact = 'What is HDFC Mid Cap expense ratio?';
  const querySimilar = 'What is the expense ratio of HDFC Mid Cap?';

  const hit1 = await cache.get(queryExact);
  console.log(`- Exact Query Lookup:   ${hit1.hit ? 'HIT' : 'MISS'} (Similarity: ${hit1.similarity})`);

  const hit2 = await cache.get(querySimilar);
  console.log(`- Semantic Near-Lookup: ${hit2.hit ? 'HIT' : 'MISS'} (Similarity: ${hit2.similarity})`);
  console.log(`- Cache Stats:`, cache.getStats());

  console.log('\n2. RUNNING RAG TRIAD AUTOMATED EVALUATION ON GOLDEN BENCHMARK:');
  const evaluator = new RagEvaluator(retrievalEngine);
  const suiteReport = await evaluator.evaluateSuite(GOLDEN_RAG_DATASET);

  console.log('\n---------------------------------------------------------------');
  console.log('RAG TRIAD BENCHMARK SUMMARY:');
  console.log('---------------------------------------------------------------');
  console.log(`Total Golden Test Cases:     ${suiteReport.totalCases}`);
  console.log(`Passed Cases:                ${suiteReport.passedCases}/${suiteReport.totalCases} (${Math.round((suiteReport.passedCases / suiteReport.totalCases) * 100)}%)`);
  console.log(`Avg Context Precision:       ${(suiteReport.averageContextPrecision * 100).toFixed(1)}% (Target: > 90%)`);
  console.log(`Avg Faithfulness / Grounded: ${(suiteReport.averageFaithfulness * 100).toFixed(1)}% (Target: > 95%)`);
  console.log(`Avg Answer Relevance:        ${(suiteReport.averageAnswerRelevance * 100).toFixed(1)}% (Target: > 90%)`);
  console.log(`Overall Composite RAG Score: ${(suiteReport.overallCompositeScore * 100).toFixed(1)}%\n`);

  console.log('CASE-BY-CASE BREAKDOWN:');
  for (const c of suiteReport.results) {
    console.log(`  [${c.passedThresholds ? 'PASS' : 'FAIL'}] ${c.caseId} (${c.latencyMs}ms)`);
    console.log(`         Query: "${c.query.slice(0, 50)}..."`);
    console.log(`         Precision: ${c.metrics.contextPrecision} | Faithfulness: ${c.metrics.faithfulness} | Relevance: ${c.metrics.answerRelevance}`);
  }

  console.log('\n===============================================================');
  console.log('PHASE 9 BENCHMARK EVALUATION COMPLETE');
  console.log('===============================================================');
}

main();
