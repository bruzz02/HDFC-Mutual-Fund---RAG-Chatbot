import { GrowwExtractor } from '../extractor';
import { GrowwNormalizer } from '../normalizer';
import { Phase1Storage } from '../storage';
import { Phase1IngestionPipeline, TARGET_HDFC_FUNDS } from '../index';
import { GrowwFundRecordSchema } from '../schema';

export interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

export async function runAllPhase1Tests(): Promise<TestResult[]> {
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

  // -------------------------------------------------------------
  // UNIT TESTS: Extractor & Normalizer
  // -------------------------------------------------------------

  await runTest('Unit 1: GrowwExtractor correctly parses __NEXT_DATA__ from SSR HTML', () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>Groww Mutual Fund</title></head>
        <body>
          <div id="__next">Fund Page</div>
          <script id="__NEXT_DATA__" type="application/json">
            {
              "props": {
                "pageProps": {
                  "mfServerSideData": {
                    "scheme_name": "HDFC Test Fund",
                    "nav": 123.45,
                    "aum": 5000.5,
                    "expense_ratio": 0.85
                  }
                }
              }
            }
          </script>
        </body>
      </html>
    `;

    const data = GrowwExtractor.extractNextData(mockHtml);
    if (!data.mfServerSideData) throw new Error('mfServerSideData was not extracted');
    if (data.mfServerSideData.scheme_name !== 'HDFC Test Fund') {
      throw new Error(`Expected scheme_name 'HDFC Test Fund', got ${data.mfServerSideData.scheme_name}`);
    }
    if (data.mfServerSideData.nav !== 123.45) {
      throw new Error(`Expected nav 123.45, got ${data.mfServerSideData.nav}`);
    }
  });

  await runTest('Unit 2: GrowwExtractor throws descriptive error on missing __NEXT_DATA__', () => {
    const invalidHtml = `<html><body><div>No data script here</div></body></html>`;
    let threw = false;
    try {
      GrowwExtractor.extractNextData(invalidHtml);
    } catch (err: any) {
      threw = true;
      if (!err.message.includes('__NEXT_DATA__')) {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }
    if (!threw) throw new Error('Extractor should have thrown error on missing script tag');
  });

  await runTest('Unit 3: GrowwNormalizer validates and normalizes raw payload into Zod schema', () => {
    const rawPayload = {
      search_id: 'hdfc-test-growth',
      scheme_name: 'HDFC Test Cap Fund Direct Growth',
      category: 'Equity',
      sub_category: 'Mid Cap',
      fund_house: 'HDFC Mutual Fund',
      fund_manager: 'Chirag Setalvad',
      launch_date: '2013-01-01',
      aum: 10500.25,
      nav: 215.8,
      nav_date: '01-Oct-2026',
      expense_ratio: '0.78',
      exit_load: 'Exit load of 1% if redeemed within 1 year',
      benchmark_name: 'NIFTY Midcap 150 TRI',
      simple_return: {
        return1y: 12.5,
        return3y: 45.2,
        return5y: 110.4
      },
      holdings: [
        { company_name: 'Company A', sector_name: 'Financial', corpus_per: 8.5 },
        { company_name: 'Company B', sector_name: 'Financial', corpus_per: 6.2 },
        { company_name: 'Company C', sector_name: 'Technology', corpus_per: 5.1 }
      ]
    };

    const record = GrowwNormalizer.normalize(rawPayload, 'https://groww.in/test', 'hdfc-test-growth');
    
    // Validate schema
    GrowwFundRecordSchema.parse(record);

    if (record.scheme_name !== 'HDFC Test Cap Fund Direct Growth') throw new Error('Incorrect scheme name');
    if (record.expense_ratio !== 0.78) throw new Error(`Expected expense_ratio 0.78, got ${record.expense_ratio}`);
    if (record.holdings.length !== 3) throw new Error('Holdings count mismatch');
    if (record.returns.return5y !== 110.4) throw new Error('5Y return mismatch');
  });

  await runTest('Unit 4: Sector allocation aggregation computes accurate weights', () => {
    const rawPayload = {
      scheme_name: 'HDFC Sector Test Fund',
      category: 'Equity',
      sub_category: 'Large Cap',
      aum: 20000,
      nav: 500,
      nav_date: '01-Oct-2026',
      expense_ratio: 1.0,
      holdings: [
        { company_name: 'Bank 1', sector_name: 'Financial', corpus_per: 10.0 },
        { company_name: 'Bank 2', sector_name: 'Financial', corpus_per: 5.5 },
        { company_name: 'Tech 1', sector_name: 'Technology', corpus_per: 8.0 }
      ]
    };

    const record = GrowwNormalizer.normalize(rawPayload, 'https://groww.in/test', 'test-id');
    const finSector = record.sector_allocation.find(s => s.sector === 'Financial');
    const techSector = record.sector_allocation.find(s => s.sector === 'Technology');

    if (!finSector || finSector.percentage !== 15.5) {
      throw new Error(`Expected Financial sector 15.5%, got ${finSector?.percentage}`);
    }
    if (!techSector || techSector.percentage !== 8.0) {
      throw new Error(`Expected Technology sector 8.0%, got ${techSector?.percentage}`);
    }
  });

  await runTest('Unit 5: Section 80C 3-year statutory lock-in and Nil exit load applied for ELSS', () => {
    const rawElss = {
      scheme_name: 'HDFC ELSS Tax Saver Fund Direct Plan Growth',
      category: 'Equity',
      sub_category: 'ELSS',
      aum: 15000,
      nav: 1200,
      nav_date: '01-Oct-2026',
      expense_ratio: 1.15
    };

    const record = GrowwNormalizer.normalize(rawElss, 'https://groww.in/elss', 'hdfc-elss');

    if (!record.lock_in || !record.lock_in.includes('3 Years')) {
      throw new Error(`ELSS must have 3-year lock-in, got: ${record.lock_in}`);
    }
    if (record.exit_load !== 'Nil') {
      throw new Error(`ELSS exit load must be 'Nil', got: ${record.exit_load}`);
    }
  });

  await runTest('Unit 6: Phase1Storage detects changes (CDC diff) accurately', () => {
    const storage = new Phase1Storage();
    const oldRecords: any[] = [
      { id: 'fund-1', nav: 100.0, aum: 1000, holdings: [{ company_name: 'A' }] }
    ];
    const newRecords: any[] = [
      { id: 'fund-1', nav: 102.5, aum: 1050, holdings: [{ company_name: 'A' }] }
    ];

    const diffs = storage.computeDiff(oldRecords, newRecords);
    if (diffs.length !== 1) throw new Error('Expected 1 diff entry');
    if (!diffs[0].hasChanged || !diffs[0].navChanged) {
      throw new Error('Storage failed to detect NAV change');
    }
  });

  // -------------------------------------------------------------
  // INTEGRATION TESTS: Live Ingestion across 4 Target Groww URLs
  // -------------------------------------------------------------

  const pipeline = new Phase1IngestionPipeline();

  await runTest('Integration 7: Live crawl & schema validation for HDFC Large Cap Direct Growth', async () => {
    const target = TARGET_HDFC_FUNDS[0]; // Large Cap
    const record = await pipeline.ingestSingleFund(target);

    GrowwFundRecordSchema.parse(record);
    if (!record.scheme_name.toLowerCase().includes('large cap')) {
      throw new Error(`Expected Large Cap scheme name, got ${record.scheme_name}`);
    }
    if (record.nav <= 0) throw new Error(`Invalid NAV: ${record.nav}`);
    if (record.aum <= 0) throw new Error(`Invalid AUM: ${record.aum}`);
    if (record.holdings.length === 0) throw new Error('Expected non-empty holdings array');
  });

  await runTest('Integration 8: Live crawl & schema validation for HDFC Mid Cap Direct Growth', async () => {
    const target = TARGET_HDFC_FUNDS[1]; // Mid Cap
    const record = await pipeline.ingestSingleFund(target);

    GrowwFundRecordSchema.parse(record);
    if (!record.scheme_name.toLowerCase().includes('mid cap')) {
      throw new Error(`Expected Mid Cap scheme name, got ${record.scheme_name}`);
    }
    if (record.aum < 50000) {
      throw new Error(`HDFC Mid Cap AUM should exceed ₹50,000 Cr, got ${record.aum}`);
    }
    if (record.expense_ratio > 1.5) {
      throw new Error(`Direct plan expense ratio should be <= 1.5%, got ${record.expense_ratio}`);
    }
  });

  await runTest('Integration 9: Live crawl & schema validation for HDFC Small Cap Direct Growth', async () => {
    const target = TARGET_HDFC_FUNDS[2]; // Small Cap
    const record = await pipeline.ingestSingleFund(target);

    GrowwFundRecordSchema.parse(record);
    if (!record.scheme_name.toLowerCase().includes('small cap')) {
      throw new Error(`Expected Small Cap scheme name, got ${record.scheme_name}`);
    }
    if (record.nav <= 0) throw new Error(`Invalid NAV: ${record.nav}`);
    if (record.holdings.length === 0) throw new Error('Expected non-empty holdings');
  });

  await runTest('Integration 10: Live crawl & schema validation for HDFC ELSS Tax Saver Direct Plan Growth', async () => {
    const target = TARGET_HDFC_FUNDS[3]; // ELSS
    const record = await pipeline.ingestSingleFund(target);

    GrowwFundRecordSchema.parse(record);
    if (!record.lock_in || !record.lock_in.includes('3 Years')) {
      throw new Error(`ELSS must have 3-year lock-in under Section 80C, got: ${record.lock_in}`);
    }
    if (record.exit_load !== 'Nil') {
      throw new Error(`ELSS must have Nil exit load, got: ${record.exit_load}`);
    }
  });

  await runTest('Integration 11: End-to-End Pipeline ingestAll() processes all 4 funds with diffs', async () => {
    const result = await pipeline.ingestAll();

    if (result.records.length !== 4) {
      throw new Error(`Expected 4 records, got ${result.records.length}`);
    }
    if (result.summary.total !== 4) {
      throw new Error(`Expected summary total 4, got ${result.summary.total}`);
    }
    if (result.diffs.length !== 4) {
      throw new Error(`Expected 4 diff results, got ${result.diffs.length}`);
    }
  });

  return results;
}
