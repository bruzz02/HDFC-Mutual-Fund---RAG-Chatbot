import { FinancialCleaner } from '../cleaner';
import { FinancialTokenizer } from '../tokenizer';
import { SemanticChunker } from '../chunker';
import { Phase2Storage } from '../storage';
import { Phase2ChunkingPipeline } from '../index';
import { SemanticChunkSchema } from '../schema';
import { INITIAL_HDFC_FUNDS } from '../../src/data/defaultFundData';
import { GrowwFundRecord } from '../../phase1/schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export async function runAllPhase2Tests(): Promise<TestResult[]> {
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

  // -------------------------------------------------------------
  // UNIT TESTS: Cleaner & Tokenizer
  // -------------------------------------------------------------

  await runTest('Unit 1: FinancialCleaner decodes HTML entities and normalizes whitespace', () => {
    const raw = 'Fund &amp; Co.   &lt;Growth&gt; \n\n\n\n  Direct &quot;Plan&#39;s&quot;';
    const cleaned = FinancialCleaner.cleanText(raw);
    if (cleaned !== "Fund & Co. <Growth> \n\n Direct \"Plan's\"") {
      throw new Error(`Unexpected cleaned output: ${JSON.stringify(cleaned)}`);
    }
  });

  await runTest('Unit 2: FinancialCleaner formats Indian Crores and percentages with signs', () => {
    const cr = FinancialCleaner.formatCrores(108324.55);
    const posPercent = FinancialCleaner.formatPercent(12.5);
    const negPercent = FinancialCleaner.formatPercent(-4.2);
    const nullPercent = FinancialCleaner.formatPercent(null);

    if (!cr.includes('1,08,324.55')) throw new Error(`Invalid Crores format: ${cr}`);
    if (posPercent !== '+12.50%') throw new Error(`Expected +12.50%, got ${posPercent}`);
    if (negPercent !== '-4.20%') throw new Error(`Expected -4.20%, got ${negPercent}`);
    if (nullPercent !== 'N/A') throw new Error(`Expected N/A, got ${nullPercent}`);
  });

  await runTest('Unit 3: FinancialTokenizer estimates token count on financial tables & generates SHA-256 hash', () => {
    const text = '| Period | Return | Alpha |\n| 1Y | 12.5% | +2.1% |';
    const tokens = FinancialTokenizer.estimateTokenCount(text);
    const hash = FinancialTokenizer.computeContentHash(text, { tag: 'perf' });

    if (tokens < 5 || tokens > 50) throw new Error(`Unexpected token estimate: ${tokens}`);
    if (typeof hash !== 'string' || hash.length !== 16) throw new Error(`Invalid hash: ${hash}`);
  });

  // -------------------------------------------------------------
  // UNIT TESTS: Domain-Specific Chunker
  // -------------------------------------------------------------

  await runTest('Unit 4: SemanticChunker generates exactly 4 orthogonal chunks per mutual fund', () => {
    const chunks = SemanticChunker.chunkFund(sampleFund);
    if (chunks.length !== 4) {
      throw new Error(`Expected 4 chunks, got ${chunks.length}`);
    }
    const types = chunks.map(c => c.chunk_type).sort();
    const expected = ['costs_and_terms', 'holdings', 'overview', 'performance'].sort();
    if (JSON.stringify(types) !== JSON.stringify(expected)) {
      throw new Error(`Mismatch in chunk types: ${types.join(', ')}`);
    }
  });

  await runTest('Unit 5: Overview chunk adheres to Zod schema and token budget (100–250 tokens)', () => {
    const chunks = SemanticChunker.chunkFund(sampleFund);
    const overview = chunks.find(c => c.chunk_type === 'overview')!;

    SemanticChunkSchema.parse(overview);
    if (!overview.title.includes('Overview')) throw new Error('Invalid title for overview chunk');
    if (!overview.content.includes(sampleFund.fund_manager)) throw new Error('Overview must include fund manager');
    if (!overview.content.includes(sampleFund.benchmark_name)) throw new Error('Overview must include benchmark');
    if (overview.token_count < 80 || overview.token_count > 300) {
      throw new Error(`Token count out of bounds: ${overview.token_count}`);
    }
  });

  await runTest('Unit 6: Performance chunk formats markdown table and includes 1Y/3Y/5Y/10Y CAGR', () => {
    const chunks = SemanticChunker.chunkFund(sampleFund);
    const perf = chunks.find(c => c.chunk_type === 'performance')!;

    SemanticChunkSchema.parse(perf);
    if (!perf.content.includes('| Period | Scheme Return (%) |')) {
      throw new Error('Performance chunk missing markdown comparison table');
    }
    if (!perf.content.includes('5-Year')) throw new Error('Performance chunk missing 5-Year period');
    if (perf.metadata.return5y !== sampleFund.returns.return5y) {
      throw new Error(`Metadata return5y mismatch: ${perf.metadata.return5y} vs ${sampleFund.returns.return5y}`);
    }
  });

  await runTest('Unit 7: Holdings chunk formats top holdings and sector breakdown tables', () => {
    const chunks = SemanticChunker.chunkFund(sampleFund, { maxHoldingsInChunk: 10 });
    const holdingsChunk = chunks.find(c => c.chunk_type === 'holdings')!;

    SemanticChunkSchema.parse(holdingsChunk);
    if (!holdingsChunk.content.includes('| # | Company Name | Sector | Weight (%) |')) {
      throw new Error('Holdings chunk missing formatted markdown table');
    }
    if (!holdingsChunk.content.includes(sampleFund.holdings[0].company_name)) {
      throw new Error(`Holdings chunk missing top holding: ${sampleFund.holdings[0].company_name}`);
    }
    if (!holdingsChunk.content.includes('Key Sector Allocation:')) {
      throw new Error('Holdings chunk missing sector allocation');
    }
  });

  await runTest('Unit 8: Costs chunk accurately enforces Section 80C 3-year lock-in for ELSS vs open-ended', () => {
    const midCapChunks = SemanticChunker.chunkFund(sampleFund);
    const elssChunks = SemanticChunker.chunkFund(sampleElss);

    const midCapCosts = midCapChunks.find(c => c.chunk_type === 'costs_and_terms')!;
    const elssCosts = elssChunks.find(c => c.chunk_type === 'costs_and_terms')!;

    if (!elssCosts.content.includes('Section 80C Tax Deduction')) {
      throw new Error('ELSS costs chunk must specify Section 80C tax deduction');
    }
    if (!elssCosts.content.includes('3 years')) {
      throw new Error('ELSS costs chunk must specify 3-year mandatory statutory lock-in');
    }
    if (!midCapCosts.content.includes('Open-ended')) {
      throw new Error('Mid Cap costs chunk must specify open-ended nature');
    }
  });

  await runTest('Unit 9: Metadata enrichment injects verified tags and source Groww URL for provenance', () => {
    const chunks = SemanticChunker.chunkFund(sampleFund);
    for (const c of chunks) {
      if (!c.source_url.startsWith('https://groww.in/mutual-funds/')) {
        throw new Error(`Invalid source URL on chunk ${c.chunk_id}: ${c.source_url}`);
      }
      if (!Array.isArray(c.metadata.tags) || c.metadata.tags.length === 0) {
        throw new Error(`Missing metadata tags on chunk ${c.chunk_id}`);
      }
      if (c.metadata.sub_category !== sampleFund.sub_category) {
        throw new Error(`Sub-category mismatch on chunk ${c.chunk_id}`);
      }
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: Storage, CDC Diffs & End-to-End Pipeline
  // -------------------------------------------------------------

  await runTest('Integration 10: Phase2Storage computes Change-Data-Capture (CDC) chunk diffs', () => {
    const storage = new Phase2Storage();
    const chunks = SemanticChunker.chunkFund(sampleFund);

    // Initial diff should mark all chunks as isNew: true
    const diffs = storage.computeChunkDiff([], chunks);
    if (diffs.length !== 4) throw new Error(`Expected 4 diffs, got ${diffs.length}`);
    if (!diffs.every(d => d.isNew && d.hasChanged)) {
      throw new Error('Initial diffs should all be marked as isNew');
    }

    // Repeated diff against identical chunks should mark hasChanged: false
    const noChangeDiffs = storage.computeChunkDiff(chunks, chunks);
    if (noChangeDiffs.some(d => d.hasChanged)) {
      throw new Error('Identical chunks should not report changes');
    }
  });

  await runTest('Integration 11: End-to-End Phase2ChunkingPipeline processes all 4 HDFC funds', () => {
    const pipeline = new Phase2ChunkingPipeline();
    const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
    const result = pipeline.processFunds(allFunds);

    if (result.chunks.length !== 16) {
      throw new Error(`Expected exactly 16 chunks (4 per fund x 4 funds), got ${result.chunks.length}`);
    }
    if (result.summary.totalFundsProcessed !== 4) {
      throw new Error(`Expected 4 funds processed, got ${result.summary.totalFundsProcessed}`);
    }
    if (result.summary.chunksByType.overview !== 4) {
      throw new Error(`Expected 4 overview chunks, got ${result.summary.chunksByType.overview}`);
    }
    if (result.summary.chunksByType.performance !== 4) {
      throw new Error(`Expected 4 performance chunks, got ${result.summary.chunksByType.performance}`);
    }
  });

  await runTest('Integration 12: Every generated chunk passes strict Zod runtime schema validation', () => {
    const pipeline = new Phase2ChunkingPipeline();
    const allFunds = INITIAL_HDFC_FUNDS as unknown as GrowwFundRecord[];
    const result = pipeline.processFunds(allFunds);

    for (const chunk of result.chunks) {
      SemanticChunkSchema.parse(chunk);
    }
  });

  return results;
}
