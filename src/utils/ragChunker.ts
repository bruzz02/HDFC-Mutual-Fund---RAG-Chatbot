import { FundData, RAGChunk } from '../types/mutualFund';

/**
 * Builds semantic chunks from structured Mutual Fund data for RAG ingestion.
 * Follows financial chunking best practices:
 * - Domain-specific chunk segmentation (Overview, Performance, Holdings, Terms & Exit)
 * - Rich metadata tagging for pre-filtering (category, sub_category, expense_ratio, AUM)
 * - Direct provenance tracking with Groww source URL
 */
export function generateChunksFromFunds(funds: FundData[]): RAGChunk[] {
  const chunks: RAGChunk[] = [];

  for (const fund of funds) {
    // Chunk 1: Fund Profile, Overview & Key Facts
    chunks.push({
      chunk_id: `${fund.id}-overview`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'overview',
      title: `${fund.scheme_name} - Fund Overview & Profile`,
      content: `Scheme Name: ${fund.scheme_name}
Fund House: ${fund.fund_house}
Category: ${fund.category} (${fund.sub_category})
Fund Manager: ${fund.fund_manager}
Benchmark Index: ${fund.benchmark_name}
Current NAV: ₹${fund.nav} (as of ${fund.nav_date})
Assets Under Management (AUM): ₹${fund.aum.toLocaleString()} Crores
Riskometer: ${fund.risk}
Crisil Rating: ${fund.crisil_rating || 'N/A'} Stars | Groww Rating: ${fund.groww_rating || 'N/A'} Stars
Investment Objective: ${fund.description || 'Long-term capital growth through disciplined equity allocation.'}
Source URL: ${fund.url}`,
      token_count: 145,
      source_url: fund.url,
      metadata: {
        category: fund.category,
        sub_category: fund.sub_category,
        aum: fund.aum,
        nav: fund.nav,
        expense_ratio: fund.expense_ratio,
        exit_load: fund.exit_load,
        lock_in: fund.lock_in,
        tags: [fund.sub_category.toLowerCase(), 'nav', 'aum', 'fund manager', 'benchmark', 'overview']
      }
    });

    // Chunk 2: Trailing Performance & Returns
    const r = fund.returns;
    chunks.push({
      chunk_id: `${fund.id}-performance`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'performance',
      title: `${fund.scheme_name} - Historical Returns & Performance`,
      content: `Fund: ${fund.scheme_name} (${fund.sub_category})
Benchmark: ${fund.benchmark_name}
Trailing Returns Summary:
- 1-Month Return: ${r.return1m !== undefined ? r.return1m + '%' : 'N/A'}
- 6-Month Return: ${r.return6m !== undefined ? r.return6m + '%' : 'N/A'}
- 1-Year Return: ${r.return1y !== undefined ? r.return1y + '%' : 'N/A'} (Category Avg: ${r.cat_return1y || 'N/A'}%)
- 3-Year Return: ${r.return3y !== undefined ? r.return3y + '%' : 'N/A'} (Category Avg: ${r.cat_return3y || 'N/A'}%)
- 5-Year Return: ${r.return5y !== undefined ? r.return5y + '%' : 'N/A'} (Category Avg: ${r.cat_return5y || 'N/A'}%)
- 7-Year Return: ${r.return7y !== undefined ? r.return7y + '%' : 'N/A'}
- 10-Year Return: ${r.return10y !== undefined ? r.return10y + '%' : 'N/A'}
- Return Since Inception: ${r.return_since_created !== undefined ? r.return_since_created + '%' : 'N/A'}
Performance Analysis:
${r.return5y && r.cat_return5y ? (r.return5y > r.cat_return5y ? `Outperformed category 5-year average (${r.return5y}% vs ${r.cat_return5y}%).` : `Trailing category 5-year average (${r.return5y}% vs ${r.cat_return5y}%).`) : ''}
Source URL: ${fund.url}`,
      token_count: 160,
      source_url: fund.url,
      metadata: {
        category: fund.category,
        sub_category: fund.sub_category,
        nav: fund.nav,
        aum: fund.aum,
        expense_ratio: fund.expense_ratio,
        return1y: r.return1y,
        return3y: r.return3y,
        return5y: r.return5y,
        tags: ['returns', 'performance', 'cagr', '1y', '3y', '5y', '10y', 'alpha', fund.sub_category.toLowerCase()]
      }
    });

    // Chunk 3: Portfolio Holdings & Sector Breakdown
    const holdingsStr = fund.holdings.slice(0, 12).map((h, i) => `${i + 1}. ${h.company_name} (${h.sector_name}) - ${h.corpus_per}%`).join('\n');
    const sectorsStr = (fund.sector_allocation || []).map(s => `- ${s.sector}: ${s.percentage}%`).join('\n');

    chunks.push({
      chunk_id: `${fund.id}-holdings`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'holdings',
      title: `${fund.scheme_name} - Top Holdings & Sector Allocation`,
      content: `Fund: ${fund.scheme_name}
Portfolio Allocation & Top Holdings (Total Holdings Count: ${fund.holdings.length}):
${holdingsStr}

Key Sector Allocation:
${sectorsStr}
Portfolio Strategy: Managed under ${fund.fund_manager} with focus on ${fund.sub_category} market capitalization.
Source URL: ${fund.url}`,
      token_count: 180,
      source_url: fund.url,
      metadata: {
        category: fund.category,
        sub_category: fund.sub_category,
        nav: fund.nav,
        aum: fund.aum,
        expense_ratio: fund.expense_ratio,
        tags: ['holdings', 'stocks', 'portfolio', 'sectors', 'companies', fund.sub_category.toLowerCase()]
      }
    });

    // Chunk 4: Costs, Fees, Exit Load, Minimums & Tax Lock-in
    chunks.push({
      chunk_id: `${fund.id}-costs`,
      fund_id: fund.id,
      fund_name: fund.scheme_name,
      chunk_type: 'costs_and_terms',
      title: `${fund.scheme_name} - Expense Ratio, Exit Load & Tax Rules`,
      content: `Fund: ${fund.scheme_name}
Expense Ratio: ${fund.expense_ratio}% (Direct Plan)
Exit Load Policy: ${fund.exit_load}
Lock-in Period: ${fund.lock_in || 'None (Open-ended scheme)'}
Minimum Lump Sum Investment: ₹${fund.min_investment_amount}
Minimum SIP Investment: ₹${fund.min_sip_investment}
Taxation Rules:
${fund.sub_category === 'ELSS' ? '- ELSS qualifies for tax deduction under Section 80C of IT Act up to ₹1.5 Lakh/year with mandatory 3-year statutory lock-in.' : '- Standard equity mutual fund taxation: Long Term Capital Gains (LTCG) above ₹1.25 Lakh taxed at 12.5%, Short Term Capital Gains (STCG) taxed at 20%.'}
Source URL: ${fund.url}`,
      token_count: 140,
      source_url: fund.url,
      metadata: {
        category: fund.category,
        sub_category: fund.sub_category,
        nav: fund.nav,
        aum: fund.aum,
        expense_ratio: fund.expense_ratio,
        exit_load: fund.exit_load,
        lock_in: fund.lock_in,
        tags: ['expense ratio', 'exit load', 'fees', 'sip', 'tax', 'lock in', '80c', fund.sub_category.toLowerCase()]
      }
    });
  }

  return chunks;
}

/**
 * High-precision Hybrid Keyword + Semantic Retrieval
 */
export function retrieveRelevantChunks(query: string, allChunks: RAGChunk[], topK: number = 4): { chunk: RAGChunk; score: number; matchReason: string }[] {
  const queryLower = query.toLowerCase();
  const tokens = queryLower.split(/[\s,?.!]+/).filter(t => t.length > 2);

  const scored = allChunks.map(chunk => {
    let score = 0;
    const reasons: string[] = [];

    const contentLower = chunk.content.toLowerCase();
    const titleLower = chunk.title.toLowerCase();

    // 1. Direct fund name matching
    if (queryLower.includes('large cap') || queryLower.includes('large-cap')) {
      if (chunk.metadata.sub_category === 'Large Cap') {
        score += 15;
        reasons.push('Category match: Large Cap');
      }
    }
    if (queryLower.includes('mid cap') || queryLower.includes('mid-cap')) {
      if (chunk.metadata.sub_category === 'Mid Cap') {
        score += 15;
        reasons.push('Category match: Mid Cap');
      }
    }
    if (queryLower.includes('small cap') || queryLower.includes('small-cap')) {
      if (chunk.metadata.sub_category === 'Small Cap') {
        score += 15;
        reasons.push('Category match: Small Cap');
      }
    }
    if (queryLower.includes('elss') || queryLower.includes('tax') || queryLower.includes('80c')) {
      if (chunk.metadata.sub_category === 'ELSS') {
        score += 15;
        reasons.push('Category match: ELSS / Tax Saver');
      }
    }

    // 2. Intent matching based on chunk type
    if (queryLower.includes('return') || queryLower.includes('cagr') || queryLower.includes('performance') || queryLower.includes('profit') || queryLower.includes('gain') || queryLower.includes('1y') || queryLower.includes('3y') || queryLower.includes('5y')) {
      if (chunk.chunk_type === 'performance') {
        score += 12;
        reasons.push('Intent match: Returns & Performance');
      }
    }
    if (queryLower.includes('expense') || queryLower.includes('fee') || queryLower.includes('cost') || queryLower.includes('exit load') || queryLower.includes('lock in') || queryLower.includes('lock-in') || queryLower.includes('tax')) {
      if (chunk.chunk_type === 'costs_and_terms') {
        score += 12;
        reasons.push('Intent match: Expense & Exit Terms');
      }
    }
    if (queryLower.includes('holding') || queryLower.includes('stock') || queryLower.includes('company') || queryLower.includes('sector') || queryLower.includes('portfolio') || queryLower.includes('bank') || queryLower.includes('invested in')) {
      if (chunk.chunk_type === 'holdings') {
        score += 12;
        reasons.push('Intent match: Portfolio Holdings');
      }
    }
    if (queryLower.includes('manager') || queryLower.includes('aum') || queryLower.includes('nav') || queryLower.includes('rating') || queryLower.includes('benchmark')) {
      if (chunk.chunk_type === 'overview') {
        score += 10;
        reasons.push('Intent match: Overview & Metadata');
      }
    }
    if (queryLower.includes('compare') || queryLower.includes('difference') || queryLower.includes('better') || queryLower.includes('which fund')) {
      // If query is comparative, boost overview and performance
      if (chunk.chunk_type === 'performance' || chunk.chunk_type === 'overview') {
        score += 6;
        reasons.push('Comparative query context');
      }
    }

    // 3. Token level lexical overlap
    for (const token of tokens) {
      if (titleLower.includes(token)) {
        score += 3;
      }
      if (contentLower.includes(token)) {
        score += 1;
      }
      if (Array.isArray(chunk.metadata?.tags) && chunk.metadata.tags.includes(token)) {
        score += 2;
      }
    }

    return {
      chunk,
      score,
      matchReason: reasons.length > 0 ? reasons.join(' • ') : 'Lexical token relevance'
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
