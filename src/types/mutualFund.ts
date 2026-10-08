export interface FundHolding {
  company_name: string;
  sector_name: string;
  instrument_name: string;
  market_value?: number | null;
  corpus_per: number; // percentage weight
  stock_search_id?: string | null;
}

export interface FundReturns {
  return1d?: number | null;
  return1w?: number | null;
  return1m?: number | null;
  return3m?: number | null;
  return6m?: number | null;
  return1y?: number | null;
  return2y?: number | null;
  return3y?: number | null;
  return5y?: number | null;
  return7y?: number | null;
  return10y?: number | null;
  return_since_created?: number | null;
  cat_return1y?: number | null;
  cat_return3y?: number | null;
  cat_return5y?: number | null;
}

export interface FundData {
  id: string; // e.g., 'hdfc-large-cap'
  search_id: string;
  url: string;
  scheme_name: string;
  category: string;
  sub_category: string;
  fund_house: string;
  fund_manager: string;
  launch_date: string;
  aum: number; // in Crores
  nav: number;
  nav_date: string;
  expense_ratio: number;
  exit_load: string;
  lock_in: string | null;
  benchmark_name: string;
  risk: string;
  min_investment_amount: number;
  min_sip_investment: number;
  crisil_rating?: number | null;
  groww_rating?: number | null;
  description?: string;
  returns: FundReturns;
  holdings: FundHolding[];
  sector_allocation?: { sector: string; percentage: number }[];
  last_ingested_at: string;
  ingestion_status: 'success' | 'failed' | 'in_progress';
}

export interface RAGChunk {
  chunk_id: string;
  fund_id: string;
  fund_name: string;
  chunk_type: 'overview' | 'performance' | 'holdings' | 'costs_and_terms' | 'peer_context';
  title: string;
  content: string;
  token_count: number;
  source_url: string;
  metadata: {
    category: string;
    sub_category: string;
    expense_ratio?: number | null;
    aum?: number | null;
    nav?: number | null;
    return1y?: number | null;
    return3y?: number | null;
    return5y?: number | null;
    exit_load?: string;
    lock_in?: string | null;
    tags: string[];
  };
}

export interface RAGRetrievalResult {
  chunk: RAGChunk;
  score: number;
  matchReason: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  retrievedChunks?: RAGRetrievalResult[];
  citations?: {
    title: string;
    url: string;
    fundName: string;
    category: string;
  }[];
  modelUsed?: string;
  pipelineTrace?: {
    intent: string;
    latencyMs: number;
    factCheckReport?: {
      status: string;
      confidenceScore: number;
      totalFiguresChecked: number;
      groundedFiguresCount: number;
      hallucinatedFigures: string[];
      citationsFound: string[];
      hasSebiDisclaimer: boolean;
      hasElssLockInNotice: boolean;
    };
    candidates?: {
      id: string;
      fundName: string;
      chunkType: string;
      title: string;
      denseScore?: number;
      sparseScore?: number;
      rrfScore: number;
      rerankScore?: number;
      finalRank: number;
    }[];
  };
}
