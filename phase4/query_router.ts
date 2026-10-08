import { ProcessedQuery, QueryIntent } from './schema';

export class QueryRouter {
  /**
   * Analyzes raw user query to detect intent, targeted funds/sub-categories, and domain expansions.
   */
  static analyze(rawQuery: string): ProcessedQuery {
    const q = rawQuery.toLowerCase().trim();

    // 1. Detect Comparative intent
    const isComparative = /\b(compare|comparison|versus|vs\.?|difference|better|which fund|between)\b/i.test(q);

    // 2. Detect Primary Intent
    let intent: QueryIntent = 'general';

    if (isComparative) {
      intent = 'comparison';
    } else if (/\b(nav|net asset value)\b/i.test(q)) {
      intent = 'overview';
    } else if (/\b(expense ratio|ter|fee|exit load|taxation|tax benefit|tax deduction|80c|lock-?in|minimum sip|lump ?sum|charges)\b/i.test(q) || (/\btax\b/i.test(q) && !/\btax\s*sav/i.test(q))) {
      intent = 'costs_and_terms';
    } else if (/\b(return|returns|cagr|performance|alpha|1y|3y|5y|10y|track record|gain|profit)\b/i.test(q)) {
      intent = 'performance';
    } else if (/\b(holding|holdings|stock|stocks|company|companies|portfolio|sector|allocation|weight|top 10|infosys|icici|hdfc bank)\b/i.test(q)) {
      intent = 'holdings';
    } else if (/\b(fund manager|who manages|manager|aum|rating|riskometer|benchmark|inception|profile|category)\b/i.test(q)) {
      intent = 'overview';
    }

    // 3. Detect Targeted Sub-Categories
    const subCategories: string[] = [];
    if (/\b(large ?cap|largecap|bluechip|top 100)\b/i.test(q)) {
      subCategories.push('Large Cap');
    }
    if (/\b(mid ?cap|midcap|mid-sized)\b/i.test(q)) {
      subCategories.push('Mid Cap');
    }
    if (/\b(small ?cap|smallcap|emerging)\b/i.test(q)) {
      subCategories.push('Small Cap');
    }
    if (/\b(elss|tax saver|tax saving|80c|section 80c|lock ?in)\b/i.test(q)) {
      subCategories.push('ELSS');
    }

    // 4. Target Specific Fund IDs
    const targetFunds: string[] = [];
    if (subCategories.includes('Large Cap')) targetFunds.push('hdfc-large-cap-fund-direct-growth');
    if (subCategories.includes('Mid Cap')) targetFunds.push('hdfc-mid-cap-fund-direct-growth');
    if (subCategories.includes('Small Cap')) targetFunds.push('hdfc-small-cap-fund-direct-growth');
    if (subCategories.includes('ELSS')) targetFunds.push('hdfc-elss-tax-saver-fund-direct-plan-growth');

    // 5. Query Term Expansions for Sparse & Dense Broadening
    const expandedKeywords: string[] = [];
    if (/\bter\b/i.test(q)) {
      expandedKeywords.push('expense ratio', 'total expense ratio');
    }
    if (/\b80c\b/i.test(q)) {
      expandedKeywords.push('tax saver', '3-year lock-in', 'tax deduction');
    }
    if (/\bcagr\b/i.test(q)) {
      expandedKeywords.push('annualized returns', 'performance');
    }
    if (/\block ?in\b/i.test(q)) {
      expandedKeywords.push('statutory lock-in period', '3 years');
    }

    return {
      rawQuery,
      intent,
      targetFunds,
      targetSubCategories: subCategories,
      expandedKeywords,
      isComparative: isComparative || subCategories.length > 1
    };
  }

  /**
   * Generates enriched query string combining raw input with domain expansions.
   */
  static getExpandedQueryString(processed: ProcessedQuery): string {
    if (processed.expandedKeywords.length === 0) {
      return processed.rawQuery;
    }
    return `${processed.rawQuery} ${processed.expandedKeywords.join(' ')}`;
  }
}
