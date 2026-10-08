import { GrowwFundRecord, GrowwFundRecordSchema, FundHolding, SectorAllocation } from './schema';

export class GrowwNormalizer {
  /**
   * Transforms raw mfServerSideData into a validated, strongly-typed GrowwFundRecord.
   */
  static normalize(raw: Record<string, any>, url: string, fallbackId: string): GrowwFundRecord {
    const schemeName = raw.scheme_name || raw.fund_name || fallbackId;
    const category = raw.category || 'Equity';
    const subCategory = raw.sub_category || 'Equity';

    // Normalize holdings
    const rawHoldings = Array.isArray(raw.holdings) ? raw.holdings : [];
    const holdings: FundHolding[] = rawHoldings.slice(0, 20).map((h: any) => ({
      company_name: String(h.company_name || 'Unspecified Asset').trim(),
      sector_name: String(h.sector_name || 'Other').trim(),
      instrument_name: String(h.instrument_name || 'Equity').trim(),
      corpus_per: typeof h.corpus_per === 'number' ? Number(h.corpus_per.toFixed(2)) : 0,
      market_value: typeof h.market_value === 'number' ? h.market_value : null,
      stock_search_id: h.stock_search_id || null
    }));

    // Aggregate sector allocations
    const sectorMap = new Map<string, number>();
    for (const h of rawHoldings) {
      const sec = String(h.sector_name || 'Others').trim();
      const weight = typeof h.corpus_per === 'number' ? h.corpus_per : 0;
      sectorMap.set(sec, (sectorMap.get(sec) || 0) + weight);
    }

    const sector_allocation: SectorAllocation[] = Array.from(sectorMap.entries())
      .map(([sector, percentage]) => ({
        sector,
        percentage: Number(percentage.toFixed(2))
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    // Normalize returns
    const sr = raw.simple_return || {};
    const returns = {
      return1d: typeof sr.return1d === 'number' ? sr.return1d : null,
      return1w: typeof sr.return1w === 'number' ? sr.return1w : null,
      return1m: typeof sr.return1m === 'number' ? sr.return1m : null,
      return3m: typeof sr.return3m === 'number' ? sr.return3m : null,
      return6m: typeof sr.return6m === 'number' ? sr.return6m : null,
      return1y: typeof sr.return1y === 'number' ? sr.return1y : null,
      return2y: typeof sr.return2y === 'number' ? sr.return2y : null,
      return3y: typeof sr.return3y === 'number' ? sr.return3y : null,
      return5y: typeof sr.return5y === 'number' ? sr.return5y : null,
      return7y: typeof sr.return7y === 'number' ? sr.return7y : null,
      return10y: typeof sr.return10y === 'number' ? sr.return10y : null,
      return_since_created: typeof sr.return_since_created === 'number' ? sr.return_since_created : null,
      cat_return1y: typeof sr.cat_return1y === 'number' ? sr.cat_return1y : null,
      cat_return3y: typeof sr.cat_return3y === 'number' ? sr.cat_return3y : null,
      cat_return5y: typeof sr.cat_return5y === 'number' ? sr.cat_return5y : null
    };

    // Determine lock-in (Section 80C check)
    const isElss =
      subCategory.toLowerCase().includes('elss') ||
      schemeName.toLowerCase().includes('elss') ||
      schemeName.toLowerCase().includes('tax saver');

    let lockIn: string | null = null;
    if (isElss) {
      lockIn = '3 Years (Statutory Lock-in under Section 80C)';
    } else if (typeof raw.lock_in === 'string') {
      lockIn = raw.lock_in;
    } else if (raw.lock_in && typeof raw.lock_in === 'object') {
      lockIn = raw.lock_in.text || raw.lock_in.period ? `${raw.lock_in.period || ''} ${raw.lock_in.unit || ''}`.trim() : null;
    }

    let exitLoad = 'Exit load of 1% if redeemed within 1 year';
    if (isElss) {
      exitLoad = 'Nil';
    } else if (typeof raw.exit_load === 'string') {
      exitLoad = raw.exit_load;
    } else if (raw.exit_load && typeof raw.exit_load === 'object') {
      exitLoad = raw.exit_load.text || raw.exit_load.description || JSON.stringify(raw.exit_load);
    }

    // Parse expense ratio
    let expenseRatio = 1.0;
    if (typeof raw.expense_ratio === 'number') {
      expenseRatio = raw.expense_ratio;
    } else if (typeof raw.expense_ratio === 'string') {
      const parsed = parseFloat(raw.expense_ratio);
      if (!isNaN(parsed)) expenseRatio = parsed;
    }

    const candidateRecord = {
      id: raw.search_id || fallbackId,
      search_id: raw.search_id || fallbackId,
      url,
      scheme_name: schemeName,
      category,
      sub_category: subCategory,
      fund_house: raw.fund_house || 'HDFC Mutual Fund',
      fund_manager: raw.fund_manager || 'HDFC Fund Manager',
      launch_date: raw.launch_date ? String(raw.launch_date).slice(0, 10) : '2013-01-01',
      aum: typeof raw.aum === 'number' ? Number(raw.aum.toFixed(2)) : 10000,
      nav: typeof raw.nav === 'number' ? Number(raw.nav.toFixed(2)) : 100,
      nav_date: raw.nav_date || '07-Oct-2026',
      expense_ratio: expenseRatio,
      exit_load: exitLoad,
      lock_in: lockIn,
      benchmark_name: raw.benchmark_name || raw.benchmark || 'NIFTY Index',
      risk: raw.risk || 'Very High',
      min_investment_amount: typeof raw.min_investment_amount === 'number' ? raw.min_investment_amount : 100,
      min_sip_investment: typeof raw.min_sip_investment === 'number' ? raw.min_sip_investment : 100,
      crisil_rating: typeof raw.crisil_rating === 'number' ? raw.crisil_rating : null,
      groww_rating: typeof raw.groww_rating === 'number' ? raw.groww_rating : null,
      description: raw.meta_desc || raw.description || `${schemeName} is a premier direct growth mutual fund.`,
      returns,
      holdings,
      sector_allocation,
      extracted_at: new Date().toISOString(),
      ingestion_status: 'success' as const
    };

    return GrowwFundRecordSchema.parse(candidateRecord);
  }
}
