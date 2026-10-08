import { Phase5GenerationPipeline } from './index';
import { Phase4RetrievalEngine } from '../phase4/index';
import { Phase2Storage } from '../phase2/storage';
import { Phase2ChunkingPipeline } from '../phase2/index';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { GrowwFundRecord } from '../phase1/schema';

async function main() {
  console.log('===============================================================');
  console.log('    MUTUAL FUND RAG - PHASE 5 GUARDRAILED GENERATION ENGINE    ');
  console.log('===============================================================\n');

  // Load Phase 2 chunks or generate
  const phase2Storage = new Phase2Storage();
  let chunks = phase2Storage.readChunks();

  if (chunks.length === 0) {
    console.log('Generating chunks from Phase 1 baseline...');
    const chunkPipeline = new Phase2ChunkingPipeline();
    const result = chunkPipeline.processFunds(INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[]);
    chunks = result.chunks;
  }

  const retrievalEngine = new Phase4RetrievalEngine();
  await retrievalEngine.indexChunks(chunks);

  const pipeline = new Phase5GenerationPipeline({
    retrievalEngine,
    generatorOptions: { mode: 'auto' }
  });

  const query = 'What is the expense ratio and lock-in period for HDFC ELSS Tax Saver Fund?';
  console.log(`QUERY: "${query}"\n`);
  console.log('Executing Phase 4 retrieval + Phase 5 guardrailed generation...\n');

  const answer = await pipeline.answer(query, 3);

  console.log('---------------------------------------------------------------');
  console.log('FINAL GUARDRAILED ANSWER:');
  console.log('---------------------------------------------------------------');
  console.log(answer.finalAnswerMarkdown);
  console.log('\n---------------------------------------------------------------');
  console.log('FACT CHECK & VERIFICATION REPORT:');
  console.log(`- Status:               [${answer.factCheckReport.status.toUpperCase()}]`);
  console.log(`- Model Used:           ${answer.model}`);
  console.log(`- Total Figures Tested: ${answer.factCheckReport.totalFiguresChecked}`);
  console.log(`- Grounded Figures:     ${answer.factCheckReport.groundedFiguresCount}`);
  console.log(`- Hallucinations Found: ${answer.factCheckReport.hallucinatedFigures.length}`);
  console.log(`- Confidence Score:     ${Math.round(answer.factCheckReport.confidenceScore * 100)}%`);
  console.log(`- SEBI Disclaimer:      ${answer.factCheckReport.hasSebiDisclaimer ? 'YES (Verified)' : 'NO'}`);
  console.log(`- ELSS Lock-in Notice:  ${answer.factCheckReport.hasElssLockInNotice ? 'YES (Verified)' : 'N/A'}`);
  console.log(`- Latency:              ${answer.latencyMs}ms`);
  console.log('===============================================================');
}

main();
