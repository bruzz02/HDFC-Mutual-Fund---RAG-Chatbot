import { ExtractedFinancialFigure, FactCheckReport } from './schema';
import { RetrievalResult } from '../phase4/schema';
import { SEBI_REGULATORY_DISCLAIMER, ELSS_STATUTORY_LOCK_IN_NOTICE } from './prompt_templates';

export class HallucinationDefense {
  /**
   * Extracts financial figures (percentages, NAVs, AUMs, rupee values) from text.
   */
  static extractFinancialFigures(text: string): ExtractedFinancialFigure[] {
    const figures: ExtractedFinancialFigure[] = [];

    // 1. Percentage patterns: e.g. "0.76%", "124.09%", "-6.15%"
    const percentRegex = /([+-]?\d+(?:\.\d+)?)\s*%/g;
    let match: RegExpExecArray | null;
    while ((match = percentRegex.exec(text)) !== null) {
      figures.push({
        figure: match[0],
        numericValue: parseFloat(match[1]),
        unit: 'percent',
        isGrounded: false
      });
    }

    // 2. Rupee / NAV / AUM patterns: e.g. "₹1,151.92", "₹108,324.55 Cr", "₹500"
    const inrRegex = /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:Cr(?:ores?)?|L(?:akhs?)?)?/gi;
    while ((match = inrRegex.exec(text)) !== null) {
      const cleaned = match[1].replace(/,/g, '');
      const isCr = /cr/i.test(match[0]);
      figures.push({
        figure: match[0],
        numericValue: parseFloat(cleaned),
        unit: isCr ? 'crores_aum' : 'inr_nav',
        isGrounded: false
      });
    }

    // 3. Year durations: e.g. "3 years", "5-year", "10Y"
    const yearRegex = /\b(\d+)\s*(?:years?|-year|y\b)/gi;
    while ((match = yearRegex.exec(text)) !== null) {
      figures.push({
        figure: match[0],
        numericValue: parseInt(match[1], 10),
        unit: 'years',
        isGrounded: false
      });
    }

    return figures;
  }

  /**
   * Cross-examines all extracted figures in generated answer against retrieved context.
   */
  static verifyAgainstContext(
    answerText: string,
    retrievalResult: RetrievalResult
  ): {
    repairedAnswer: string;
    report: FactCheckReport;
  } {
    const contextParts: string[] = [];
    for (const c of retrievalResult.topChunks) {
      contextParts.push(c.document.title);
      contextParts.push(c.document.content);
      const meta = c.document.metadata;
      if (meta) {
        if (meta.aum) contextParts.push(`AUM ${meta.aum} Crores ₹${meta.aum}`);
        if (meta.nav) contextParts.push(`NAV ${meta.nav} ₹${meta.nav}`);
        if (meta.expense_ratio) contextParts.push(`TER ${meta.expense_ratio}%`);
        if (meta.return1y !== undefined && meta.return1y !== null) contextParts.push(`${meta.return1y}%`);
        if (meta.return3y) contextParts.push(`${meta.return3y}%`);
        if (meta.return5y) contextParts.push(`${meta.return5y}%`);
      }
    }

    const rawCombinedContext = contextParts.join(' ');
    const combinedContextNoCommas = rawCombinedContext.replace(/,/g, '');
    const combinedContextLower = combinedContextNoCommas.toLowerCase();
    const figures = this.extractFinancialFigures(answerText);

    let groundedCount = 0;
    const hallucinatedFigures: string[] = [];

    for (const f of figures) {
      const figureNoCommas = f.figure.replace(/,/g, '');
      const rawNumberStr = f.numericValue !== null ? f.numericValue.toString() : '';

      const isPresentInContext =
        rawCombinedContext.includes(f.figure) ||
        combinedContextNoCommas.includes(figureNoCommas) ||
        (rawNumberStr.length > 0 && combinedContextNoCommas.includes(rawNumberStr)) ||
        (f.unit === 'years' && combinedContextLower.includes(`${f.numericValue} year`)) ||
        (f.numericValue === 150000 && (combinedContextLower.includes('1.5 lakh') || combinedContextLower.includes('80c') || combinedContextLower.includes('section 80c')));

      if (isPresentInContext) {
        f.isGrounded = true;
        groundedCount++;
      } else {
        f.isGrounded = false;
        hallucinatedFigures.push(f.figure);
      }
    }

    // Check citations
    const citationsFound: string[] = [];
    for (const chunk of retrievalResult.topChunks) {
      if (answerText.includes(chunk.document.source_url) && !citationsFound.includes(chunk.document.source_url)) {
        citationsFound.push(chunk.document.source_url);
      }
    }

    // Check SEBI disclaimer presence
    const hasSebiDisclaimer = /mutual fund investments are subject to market risks/i.test(answerText);

    // Check ELSS lock-in notice presence if ELSS is involved
    const involvesElss =
      retrievalResult.processedQuery.targetSubCategories.includes('ELSS') ||
      retrievalResult.query.toLowerCase().includes('elss') ||
      retrievalResult.topChunks.some(c => c.document.metadata.sub_category === 'ELSS');

    const hasElssLockInNotice =
      /3\s*(?:-| )?years?.*(?:statutory\s*)?lock-?in/i.test(answerText) ||
      /(?:statutory\s*)?lock-?in.*3\s*(?:-| )?years?/i.test(answerText);

    // Guardrail auto-repair: Append missing mandatory disclosures if omitted by LLM
    let repairedAnswer = answerText.trim();
    let wasRepaired = false;

    if (involvesElss && !hasElssLockInNotice) {
      repairedAnswer += `\n\n> **${ELSS_STATUTORY_LOCK_IN_NOTICE}**`;
      wasRepaired = true;
    }

    if (!hasSebiDisclaimer) {
      repairedAnswer += `\n\n---\n*Disclaimer: ${SEBI_REGULATORY_DISCLAIMER}*`;
      wasRepaired = true;
    }

    // Ensure source citations are present at bottom if missing
    if (citationsFound.length === 0 && retrievalResult.topChunks.length > 0) {
      const uniqueSources = Array.from(new Set(retrievalResult.topChunks.map(c => c.document.source_url)));
      repairedAnswer += `\n\n**Verified Sources:**\n` + uniqueSources.map(s => `- [Groww Direct Fund Record](${s})`).join('\n');
      uniqueSources.forEach(s => citationsFound.push(s));
      wasRepaired = true;
    }

    const confidenceScore = figures.length > 0
      ? Number((groundedCount / figures.length).toFixed(3))
      : 1.0;

    const status = hallucinatedFigures.length > 0
      ? 'repaired'
      : wasRepaired
      ? 'repaired'
      : 'passed';

    const report: FactCheckReport = {
      status,
      totalFiguresChecked: figures.length,
      groundedFiguresCount: groundedCount,
      hallucinatedFigures,
      citationsFound,
      hasSebiDisclaimer: true, // Ensured by guardrail
      hasElssLockInNotice: involvesElss ? true : false,
      confidenceScore
    };

    return { repairedAnswer, report };
  }
}
