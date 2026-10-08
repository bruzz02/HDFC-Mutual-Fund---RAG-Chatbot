import { GrowwCrawler } from './crawler';
import { GrowwExtractor } from './extractor';
import { GrowwNormalizer } from './normalizer';
import { Phase1Storage, StorageDiff } from './storage';
import { GrowwFundRecord, TargetFundConfig } from './schema';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';

export * from './schema';
export * from './crawler';
export * from './extractor';
export * from './normalizer';
export * from './storage';

export const TARGET_HDFC_FUNDS: TargetFundConfig[] = [
  {
    id: 'hdfc-large-cap-fund-direct-growth',
    url: 'https://groww.in/mutual-funds/hdfc-large-cap-fund-direct-growth',
    expectedName: 'HDFC Large Cap Fund Direct Growth',
    subCategory: 'Large Cap'
  },
  {
    id: 'hdfc-mid-cap-fund-direct-growth',
    url: 'https://groww.in/mutual-funds/hdfc-mid-cap-fund-direct-growth',
    expectedName: 'HDFC Mid Cap Fund Direct Growth',
    subCategory: 'Mid Cap'
  },
  {
    id: 'hdfc-small-cap-fund-direct-growth',
    url: 'https://groww.in/mutual-funds/hdfc-small-cap-fund-direct-growth',
    expectedName: 'HDFC Small Cap Fund Direct Growth',
    subCategory: 'Small Cap'
  },
  {
    id: 'hdfc-elss-tax-saver-fund-direct-plan-growth',
    url: 'https://groww.in/mutual-funds/hdfc-elss-tax-saver-fund-direct-plan-growth',
    expectedName: 'HDFC ELSS Tax Saver Fund Direct Plan Growth',
    subCategory: 'ELSS'
  }
];

export interface IngestionExecutionResult {
  records: GrowwFundRecord[];
  diffs: StorageDiff[];
  summary: {
    total: number;
    success: number;
    failed: number;
    totalDurationMs: number;
    timestamp: string;
  };
}

export class Phase1IngestionPipeline {
  private crawler: GrowwCrawler;
  private storage: Phase1Storage;

  constructor() {
    this.crawler = new GrowwCrawler();
    this.storage = new Phase1Storage();
  }

  async ingestSingleFund(config: TargetFundConfig): Promise<GrowwFundRecord> {
    try {
      const { html } = await this.crawler.fetchHtml(config.url);
      const { mfServerSideData } = GrowwExtractor.extractNextData(html);
      return GrowwNormalizer.normalize(mfServerSideData, config.url, config.id);
    } catch (err: any) {
      console.warn(`[Phase 1] Live crawl failed for ${config.url}: ${err.message}. Applying verified baseline snapshot.`);
      const fallback = INITIAL_HDFC_FUNDS.find((f) => f.id === config.id);
      if (!fallback) {
        throw err;
      }
      return {
        ...fallback,
        extracted_at: new Date().toISOString(),
        ingestion_status: 'fallback_applied'
      } as GrowwFundRecord;
    }
  }

  async ingestAll(): Promise<IngestionExecutionResult> {
    const startTime = Date.now();
    const existingRecords = this.storage.readSnapshot();
    const records: GrowwFundRecord[] = [];

    for (const config of TARGET_HDFC_FUNDS) {
      const record = await this.ingestSingleFund(config);
      records.push(record);
    }

    const diffs = this.storage.computeDiff(existingRecords, records);
    this.storage.writeSnapshot(records);

    const totalDurationMs = Date.now() - startTime;

    return {
      records,
      diffs,
      summary: {
        total: records.length,
        success: records.filter((r) => r.ingestion_status === 'success').length,
        failed: records.filter((r) => r.ingestion_status === 'failed').length,
        totalDurationMs,
        timestamp: new Date().toISOString()
      }
    };
  }
}
