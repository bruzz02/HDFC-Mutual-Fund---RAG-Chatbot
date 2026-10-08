import { Phase4RetrievalEngine } from './index';
import { Phase2Storage } from '../phase2/storage';
import { Phase2ChunkingPipeline } from '../phase2/index';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { GrowwFundRecord } from '../phase1/schema';

async function main() {
  console.log('===============================================================');
  console.log('    MUTUAL FUND RAG - PHASE 4 MULTI-STAGE RETRIEVAL ENGINE     ');
  console.log('===============================================================\n');

  // Load Phase 2 chunks from storage or generate fresh
  const phase2Storage = new Phase2Storage();
  let chunks = phase2Storage.readChunks();

  if (chunks.length === 0) {
    console.log('No saved Phase 2 chunks found. Generating from Phase 1 baseline...');
    const chunkPipeline = new Phase2ChunkingPipeline();
    const result = chunkPipeline.processFunds(INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[]);
    chunks = result.chunks;
  }

  console.log(`Indexing ${chunks.length} chunks into Hybrid Vector Store...`);
  const engine = new Phase4RetrievalEngine();
  await engine.indexChunks(chunks);
  console.log('Indexing completed. Ready for multi-stage retrieval.\n');

  const testQueries = [
    'What is the expense ratio and lock-in period of HDFC ELSS Tax Saver Fund?',
    'Show me the 5-year CAGR returns for HDFC Mid Cap Fund vs Large Cap Fund',
    'What are the top stock holdings in HDFC Small Cap Fund?'
  ];

  for (const q of testQueries) {
    console.log('---------------------------------------------------------------');
    console.log(`QUERY: "${q}"`);
    console.log('---------------------------------------------------------------');

    const result = await engine.retrieve(q, 3);

    console.log(`Intent Detected:     [${result.processedQuery.intent.toUpperCase()}]`);
    console.log(`Target Categories:   ${result.processedQuery.targetSubCategories.join(', ') || 'All'}`);
    console.log(`Comparative Query:   ${result.processedQuery.isComparative ? 'YES' : 'NO'}`);
    console.log(`Candidates Examined: ${result.totalExamined} (Fusion RRF k=60)`);
    console.log(`Latency:             ${result.latencyMs}ms\n`);

    console.log('TOP RETRIEVED CHUNKS AFTER RE-RANKING:');
    result.topChunks.forEach((c, idx) => {
      console.log(`\n  [#${idx + 1}] ${c.document.title}`);
      console.log(`       Relevance Score: ${c.rerankScore} | RRF Score: ${c.rrfScore}`);
      console.log(`       Dense Rank: #${c.denseRank ?? 'N/A'} | BM25 Rank: #${c.sparseRank ?? 'N/A'}`);
      console.log(`       Category: ${c.document.metadata.sub_category} | Chunk Type: ${c.document.chunk_type}`);
      console.log(`       Rationale: ${c.relevanceRationale}`);
      console.log(`       Source URL: ${c.document.source_url}`);
      console.log(`       Preview: ${c.document.content.slice(0, 120).replace(/\n/g, ' ')}...`);
    });
    console.log('\n');
  }

  console.log('===============================================================');
  console.log('PHASE 4 RETRIEVAL PIPELINE DEMONSTRATION COMPLETE');
  console.log('===============================================================');
}

main();
