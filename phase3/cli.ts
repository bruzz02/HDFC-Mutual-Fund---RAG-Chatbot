import { Phase3IndexingPipeline } from './index';
import { Phase2Storage } from '../phase2/storage';
import { Phase2ChunkingPipeline } from '../phase2/index';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { GrowwFundRecord } from '../phase1/schema';

async function main() {
  console.log('===============================================================');
  console.log('       MUTUAL FUND RAG - PHASE 3 INDEXING ENGINE CLI          ');
  console.log('===============================================================\n');

  // Load Phase 2 chunks from storage or generate fresh
  const phase2Storage = new Phase2Storage();
  let chunks = phase2Storage.readChunks();

  if (chunks.length === 0) {
    console.log('No existing Phase 2 chunks found. Generating chunks from Phase 1 baseline...');
    const chunkPipeline = new Phase2ChunkingPipeline();
    const result = chunkPipeline.processFunds(INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[]);
    chunks = result.chunks;
  }

  console.log(`Embedding and indexing ${chunks.length} chunks into Hybrid Vector Store (768-dim + BM25)...\n`);

  const pipeline = new Phase3IndexingPipeline();
  const summary = await pipeline.indexChunks(chunks);

  console.log('INDEXING EXECUTION SUMMARY:');
  console.log(`- Documents Indexed:     ${summary.totalDocumentsIndexed}`);
  console.log(`- Dense Vector Dim:      ${summary.vectorDimension}-dimensional`);
  console.log(`- Sparse BM25 Vocab:     ${summary.sparseVocabularySize} terms`);
  console.log(`- Indexing Latency:      ${summary.indexDurationMs}ms\n`);

  console.log('---------------------------------------------------------------');
  console.log('TESTING HYBRID SEARCH RETRIEVAL (Query: "HDFC Mid Cap expense ratio"):');
  console.log('---------------------------------------------------------------');

  const testQuery = 'HDFC Mid Cap expense ratio';
  const results = await pipeline.search(testQuery, 3);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`\n[Rank ${i + 1}] Hybrid Score: ${r.hybridScore} (Dense Rank: ${r.denseRank}, BM25 Rank: ${r.sparseRank})`);
    console.log(`Title:    ${r.document.title}`);
    console.log(`Category: ${r.document.metadata.sub_category} | Type: ${r.document.chunk_type}`);
    console.log(`Source:   ${r.document.source_url}`);
    console.log(`Preview:  ${r.document.content.slice(0, 140)}...`);
  }

  console.log('\n===============================================================');
  console.log('PHASE 3 INDEXING COMPLETED SUCCESSFULLY');
  console.log('===============================================================');
}

main();
