import { Phase2ChunkingPipeline } from './index';
import { Phase1Storage } from '../phase1/storage';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';
import { GrowwFundRecord } from '../phase1/schema';

async function main() {
  console.log('===============================================================');
  console.log('       MUTUAL FUND RAG - PHASE 2 CHUNKING ENGINE CLI          ');
  console.log('===============================================================\n');

  // Load Phase 1 data from snapshot or baseline
  const phase1Storage = new Phase1Storage();
  let funds: GrowwFundRecord[] = phase1Storage.readSnapshot();

  if (funds.length === 0) {
    console.log('No existing Phase 1 snapshot found on disk. Using verified baseline dataset...');
    funds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
  }

  console.log(`Processing ${funds.length} Phase 1 Mutual Fund schemes into orthogonal chunks...\n`);

  const pipeline = new Phase2ChunkingPipeline();
  const result = await pipeline.processFunds(funds);

  console.log('CHUNKING EXECUTION SUMMARY:');
  console.log(`- Funds Processed:      ${result.summary.totalFundsProcessed}`);
  console.log(`- Total Chunks Created: ${result.summary.totalChunksGenerated}`);
  console.log(`- Average Tokens/Chunk: ~${result.summary.avgTokensPerChunk} tokens`);
  console.log(`- Execution Time:       ${result.summary.durationMs}ms`);
  console.log('\nCHUNKS BY TYPE:');
  for (const [type, count] of Object.entries(result.summary.chunksByType)) {
    if (count > 0) {
      console.log(`  • ${type.padEnd(16)}: ${count} chunks`);
    }
  }

  console.log('\n---------------------------------------------------------------');
  console.log('SAMPLE CHUNK PREVIEW (HDFC Mid Cap - Performance):');
  console.log('---------------------------------------------------------------');

  const sampleChunk = result.chunks.find(c => c.chunk_id.includes('mid-cap') && c.chunk_type === 'performance');
  if (sampleChunk) {
    console.log(`Title:       ${sampleChunk.title}`);
    console.log(`Chunk ID:    ${sampleChunk.chunk_id}`);
    console.log(`Token Count: ~${sampleChunk.token_count}`);
    console.log(`Source URL:  ${sampleChunk.source_url}`);
    console.log(`Hash:        ${sampleChunk.content_hash}`);
    console.log('\nContent:\n' + sampleChunk.content);
  }

  console.log('\n===============================================================');
  console.log('PHASE 2 CHUNKING COMPLETED SUCCESSFULLY');
  console.log('===============================================================');
}

main();
