import { Phase1IngestionPipeline, TARGET_HDFC_FUNDS } from '../phase1';
import { FundData } from '../src/types/mutualFund';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';

export const TARGET_GROWW_URLS = TARGET_HDFC_FUNDS;

export interface IngestionLog {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  fundUrl?: string;
  details?: any;
}

// In-memory store for currently active funds
let activeFunds: FundData[] = JSON.parse(JSON.stringify(INITIAL_HDFC_FUNDS));
let latestLogs: IngestionLog[] = [
  {
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Phase 1 initialized with verified baseline HDFC fund schemas from Groww.'
  }
];

export function getActiveFunds(): FundData[] {
  return activeFunds;
}

export function getLatestLogs(): IngestionLog[] {
  return latestLogs;
}

const pipeline = new Phase1IngestionPipeline();

export async function scrapeSingleFund(url: string, fundId: string): Promise<{ fund: FundData; logs: IngestionLog[] }> {
  const logs: IngestionLog[] = [];
  const log = (level: 'info' | 'success' | 'warn' | 'error', message: string, details?: any) => {
    const entry: IngestionLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      fundUrl: url,
      details
    };
    logs.push(entry);
    latestLogs.unshift(entry);
    if (latestLogs.length > 100) latestLogs.pop();
  };

  log('info', `Connecting to Groww: ${url}`);

  try {
    const config = TARGET_HDFC_FUNDS.find(t => t.id === fundId || t.url === url) || {
      id: fundId,
      url,
      expectedName: fundId,
      subCategory: 'Large Cap' as const
    };

    const record = await pipeline.ingestSingleFund(config);
    log('success', `Extracted & normalized ${record.scheme_name} (NAV: ₹${record.nav}, AUM: ₹${record.aum} Cr)`);
    const fundData: FundData = {
      ...record,
      last_ingested_at: record.extracted_at,
      ingestion_status: record.ingestion_status === 'failed' ? 'failed' : 'success'
    };
    return { fund: fundData, logs };
  } catch (err: any) {
    log('error', `Live crawl failed for ${url}: ${err.message}. Applying verified snapshot.`);
    const fallback = INITIAL_HDFC_FUNDS.find(f => f.id === fundId) || INITIAL_HDFC_FUNDS[0];
    return { fund: fallback, logs };
  }
}

export async function runPhase1FullIngestion(): Promise<{ funds: FundData[]; logs: IngestionLog[] }> {
  const combinedLogs: IngestionLog[] = [];

  latestLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Starting Phase 1 full batch ingestion across all 4 Groww HDFC mutual funds.'
  });

  const result = await pipeline.ingestAll();

  activeFunds = result.records.map(r => ({
    ...r,
    last_ingested_at: r.extracted_at,
    ingestion_status: r.ingestion_status === 'failed' ? 'failed' : 'success'
  }));

  for (const r of result.records) {
    combinedLogs.push({
      timestamp: new Date().toISOString(),
      level: 'success',
      message: `Parsed ${r.scheme_name} (AUM: ₹${r.aum} Cr, NAV: ₹${r.nav})`,
      fundUrl: r.url
    });
  }

  latestLogs.unshift({
    timestamp: new Date().toISOString(),
    level: 'success',
    message: `Phase 1 Ingestion completed: ${result.summary.success}/${result.summary.total} funds parsed and normalized (${result.summary.totalDurationMs}ms).`
  });

  return { funds: activeFunds, logs: combinedLogs };
}
