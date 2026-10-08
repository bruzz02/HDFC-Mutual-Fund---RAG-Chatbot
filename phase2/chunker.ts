import { GrowwFundRecord } from '../phase1/schema';
import { SemanticChunk, SemanticChunkSchema, ChunkingOptions } from './schema';
import { FinancialCleaner } from './cleaner';
import { FinancialTokenizer } from './tokenizer';

export class SemanticChunker {
  /**
   * Generates orthogonal domain chunks for a normalized mutual fund record.
   */
  static chunkFund(fund: GrowwFundRecord, options: Partial<ChunkingOptions> = {}): SemanticChunk[] {
    const maxHoldings = options.maxHoldingsInChunk ?? 15;
    const chunks: SemanticChunk[] = [];

    // 1. Overview & Governance Chunk
    chunks.push(this.buildOverviewChunk(fund));

    // 2. Trailing Returns & Performance Chunk
    chunks.push(this.buildPerformanceChunk(fund));

    // 3. Portfolio Holdings & Sectors Chunk
    chunks.push(this.buildHoldingsChunk(fund, maxHoldings));

    // 4. Costs, Terms & Tax Lock-in Chunk
    chunks.push(this.buildCostsChunk(fund));

    return chunks;
  }

  private static buildOverviewChunk(fund: GrowwFundRecord): SemanticChunk {
    const content = FinancialCleaner.cleanText(`
Scheme Name: ${fund.scheme_name}
Fund House: ${fund.fund_house}
Category: ${fund.category} (${fund.sub_category})
Fund Manager: ${fund.fund_manager}
Benchmark Index: ${fund.benchmark_name}
Current NAV: ₹${fund.nav} (as of ${fund.nav_date})
Assets Under Management (AUM): ₹${FinancialCleaner.formatCrores(fund.aum)} Crores
Riskometer Rating: ${fund.risk}
CRISIL Rating: ${fund.crisil_rating ? fund.crisil_rating + ' Stars' : 'N/A'} | Groww Rating: ${fund.groww_rating ? fund.groww_rating + ' Stars' : 'N/A'}
Investment Objective: ${fund.description || 'Long-term capital growth through disciplined equity allocation.'}
Source Reference: ${fund.url}
    `);

    const metadata = {
      category: fund.category,
      sub_category: fund.sub_category,
      aum: fund.aum,
      nav: fund.nav,
      expense_ratio: fund.expense_ratio,
      exit_load: fund.exit_load,
      lock_in: fund.lock_in,
      as_of_date: fund.nav_date,
      tags: [fund.sub_category.toLowerCase(), 'nav', 'aum', 'fund manager', 'benchmark', 'overview', 'rating']
    };

    const tokenCount = FinancialTokenizer.estimateTokenCount(content);
    const contentHash = FinancialTokenizer.computeContentHash(content, metadata);

    return SemanticChunkSchema.parse({
      chunk_id: `${fund.id}-overview`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'overview',
      title: `${fund.scheme_name} - Fund Overview & Profile`,
      content,
      token_count: tokenCount,
      source_url: fund.url,
      content_hash: contentHash,
      metadata,
      created_at: new Date().toISOString()
    });
  }

  private static buildPerformanceChunk(fund: GrowwFundRecord): SemanticChunk {
    const r = fund.returns;
    const content = FinancialCleaner.cleanText(`
Fund: ${fund.scheme_name} (${fund.sub_category})
Benchmark: ${fund.benchmark_name}
Trailing Compound Annual Growth Rate (CAGR) Returns:
| Period | Scheme Return (%) | Category Average (%) | Outperformance Alpha |
| :--- | :--- | :--- | :--- |
| 1-Month | ${FinancialCleaner.formatPercent(r.return1m)} | N/A | N/A |
| 6-Month | ${FinancialCleaner.formatPercent(r.return6m)} | N/A | N/A |
| 1-Year | ${FinancialCleaner.formatPercent(r.return1y)} | ${FinancialCleaner.formatPercent(r.cat_return1y)} | ${r.return1y != null && r.cat_return1y != null ? (r.return1y - r.cat_return1y).toFixed(2) + '%' : 'N/A'} |
| 3-Year | ${FinancialCleaner.formatPercent(r.return3y)} | ${FinancialCleaner.formatPercent(r.cat_return3y)} | ${r.return3y != null && r.cat_return3y != null ? (r.return3y - r.cat_return3y).toFixed(2) + '%' : 'N/A'} |
| 5-Year | ${FinancialCleaner.formatPercent(r.return5y)} | ${FinancialCleaner.formatPercent(r.cat_return5y)} | ${r.return5y != null && r.cat_return5y != null ? (r.return5y - r.cat_return5y).toFixed(2) + '%' : 'N/A'} |
| 7-Year | ${FinancialCleaner.formatPercent(r.return7y)} | N/A | N/A |
| 10-Year | ${FinancialCleaner.formatPercent(r.return10y)} | N/A | N/A |
| Since Inception | ${FinancialCleaner.formatPercent(r.return_since_created)} | N/A | N/A |

Performance Summary: Over 5 years, ${fund.scheme_name} generated ${FinancialCleaner.formatPercent(r.return5y)} CAGR.
Source Reference: ${fund.url}
    `);

    const metadata = {
      category: fund.category,
      sub_category: fund.sub_category,
      nav: fund.nav,
      aum: fund.aum,
      expense_ratio: fund.expense_ratio,
      return1y: r.return1y,
      return3y: r.return3y,
      return5y: r.return5y,
      as_of_date: fund.nav_date,
      tags: ['returns', 'performance', 'cagr', '1y', '3y', '5y', '10y', 'alpha', fund.sub_category.toLowerCase()]
    };

    const tokenCount = FinancialTokenizer.estimateTokenCount(content);
    const contentHash = FinancialTokenizer.computeContentHash(content, metadata);

    return SemanticChunkSchema.parse({
      chunk_id: `${fund.id}-performance`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'performance',
      title: `${fund.scheme_name} - Historical Trailing Returns & Performance`,
      content,
      token_count: tokenCount,
      source_url: fund.url,
      content_hash: contentHash,
      metadata,
      created_at: new Date().toISOString()
    });
  }

  private static buildHoldingsChunk(fund: GrowwFundRecord, maxHoldings: number): SemanticChunk {
    const topHoldings = fund.holdings.slice(0, maxHoldings);
    const holdingsRows = topHoldings
      .map((h, i) => `| ${i + 1} | ${h.company_name} | ${h.sector_name} | ${h.corpus_per}% |`)
      .join('\n');

    const topSectors = (fund.sector_allocation || []).slice(0, 6)
      .map(s => `- ${s.sector}: ${s.percentage}%`)
      .join('\n');

    const content = FinancialCleaner.cleanText(`
Fund: ${fund.scheme_name} (${fund.sub_category})
Total Holdings Count: ${fund.holdings.length} Companies
Portfolio Concentration (Top Holdings):
| # | Company Name | Sector | Weight (%) |
| :--- | :--- | :--- | :--- |
${holdingsRows}

Key Sector Allocation:
${topSectors}

Portfolio Strategy: Actively managed portfolio focused on ${fund.sub_category} market capitalization under fund manager ${fund.fund_manager}.
Source Reference: ${fund.url}
    `);

    const metadata = {
      category: fund.category,
      sub_category: fund.sub_category,
      nav: fund.nav,
      aum: fund.aum,
      expense_ratio: fund.expense_ratio,
      as_of_date: fund.nav_date,
      tags: ['holdings', 'stocks', 'portfolio', 'sectors', 'companies', 'equity', fund.sub_category.toLowerCase()]
    };

    const tokenCount = FinancialTokenizer.estimateTokenCount(content);
    const contentHash = FinancialTokenizer.computeContentHash(content, metadata);

    return SemanticChunkSchema.parse({
      chunk_id: `${fund.id}-holdings`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'holdings',
      title: `${fund.scheme_name} - Top Stock Holdings & Sector Allocation`,
      content,
      token_count: tokenCount,
      source_url: fund.url,
      content_hash: contentHash,
      metadata,
      created_at: new Date().toISOString()
    });
  }

  private static buildCostsChunk(fund: GrowwFundRecord): SemanticChunk {
    const isElss = fund.sub_category === 'ELSS' || fund.scheme_name.toLowerCase().includes('elss');

    const content = FinancialCleaner.cleanText(`
Fund: ${fund.scheme_name}
Expense Ratio (Total Expense Ratio / TER): ${fund.expense_ratio}% (Direct Plan)
Exit Load Policy: ${fund.exit_load}
Lock-in Period: ${fund.lock_in || 'None (Open-ended scheme)'}
Minimum Lump Sum Investment: ₹${fund.min_investment_amount}
Minimum SIP Investment: ₹${fund.min_sip_investment}

Taxation & Regulatory Rules:
${isElss
  ? '- Section 80C Tax Deduction: Qualifies for tax deduction up to ₹1.5 Lakh per financial year.\n- Mandatory Lock-in: Statutory lock-in of 3 years from the date of investment (longest lock-in among mutual funds, shortest among 80C instruments).\n- Capital Gains Tax: LTCG above ₹1.25 Lakh taxed at 12.5%.'
  : '- Standard Equity Mutual Fund Taxation: Short Term Capital Gains (STCG) taxed at 20% if held < 1 year.\n- Long Term Capital Gains (LTCG) taxed at 12.5% for gains exceeding ₹1.25 Lakh per financial year.'}
Source Reference: ${fund.url}
    `);

    const metadata = {
      category: fund.category,
      sub_category: fund.sub_category,
      nav: fund.nav,
      aum: fund.aum,
      expense_ratio: fund.expense_ratio,
      exit_load: fund.exit_load,
      lock_in: fund.lock_in,
      as_of_date: fund.nav_date,
      tags: ['expense ratio', 'ter', 'exit load', 'fees', 'sip', 'tax', 'lock in', '80c', fund.sub_category.toLowerCase()]
    };

    const tokenCount = FinancialTokenizer.estimateTokenCount(content);
    const contentHash = FinancialTokenizer.computeContentHash(content, metadata);

    return SemanticChunkSchema.parse({
      chunk_id: `${fund.id}-costs`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'costs_and_terms',
      title: `${fund.scheme_name} - Expense Ratio, Exit Load & Tax Rules`,
      content,
      token_count: tokenCount,
      source_url: fund.url,
      content_hash: contentHash,
      metadata,
      created_at: new Date().toISOString()
    });
  }
}
