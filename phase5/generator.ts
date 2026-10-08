import { GoogleGenAI } from '@google/genai';
import { RetrievalResult } from '../phase4/schema';
import { PromptTemplates, SEBI_REGULATORY_DISCLAIMER, ELSS_STATUTORY_LOCK_IN_NOTICE } from './prompt_templates';
import { INITIAL_HDFC_FUNDS } from '../src/data/defaultFundData';

export interface GeneratorOptions {
  model?: string;
  temperature?: number;
  mode?: 'gemini' | 'deterministic' | 'auto';
  timeoutMs?: number;
}

export class GuardrailedGenerator {
  private model: string;
  private temperature: number;
  private mode: 'gemini' | 'deterministic' | 'auto';
  private timeoutMs: number;
  private aiClient: GoogleGenAI | null = null;

  constructor(options: GeneratorOptions = {}) {
    this.model = options.model ?? 'gemini-3.8-flash';
    this.temperature = options.temperature ?? 0.2;
    this.mode = options.mode ?? (process.env.USE_LIVE_GEMINI_GENERATION === 'true' ? 'gemini' : 'auto');
    this.timeoutMs = options.timeoutMs ?? 6000;
    this.initGemini();
  }

  private initGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
      } catch (err) {
        this.aiClient = null;
      }
    }
  }

  /**
   * Generates answer using Gemini 3.8 Flash or deterministic financial synthesis fallback.
   */
  async generate(retrievalResult: RetrievalResult): Promise<{ text: string; modelUsed: string }> {
    const systemInstruction = PromptTemplates.getSystemInstruction();
    const userPrompt = PromptTemplates.buildUserPrompt(retrievalResult);

    if (this.mode !== 'deterministic' && this.aiClient) {
      try {
        const apiCall = this.aiClient.models.generateContent({
          model: this.model,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: this.temperature
          }
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Generation timeout')), this.timeoutMs)
        );

        const response: any = await Promise.race([apiCall, timeoutPromise]);
        const text = response?.text?.();
        if (text && text.trim().length > 0) {
          return { text, modelUsed: this.model };
        }
      } catch (err: any) {
        // Fall back to rule-based financial synthesis
      }
    }

    // Deterministic Rule-Based Financial Synthesis Fallback
    const synthesized = this.synthesizeFromContext(retrievalResult);
    return { text: synthesized, modelUsed: 'deterministic-financial-synthesizer' };
  }

  /**
   * Generates authoritative, fact-grounded response directly from verified retrieved context.
   */
  synthesizeFromContext(retrievalResult: RetrievalResult): string {
    const { processedQuery, topChunks } = retrievalResult;
    const lines: string[] = [];

    if (topChunks.length === 0) {
      return `I could not find verified data matching your query in the current HDFC mutual fund catalog.\n\n*Disclaimer: ${SEBI_REGULATORY_DISCLAIMER}*`;
    }

    // Comparative Queries: Format Markdown Table
    if (processedQuery.isComparative || processedQuery.intent === 'comparison') {
      lines.push(`### HDFC Mutual Fund Comparative Analysis\n`);
      lines.push(`Based on verified data retrieved from Groww, here is the side-by-side comparison:\n`);
      lines.push(`| Parameter | ${topChunks.map(c => c.document.fund_name.replace(' Direct Growth', '').replace(' Direct Plan Growth', '')).join(' | ')} |`);
      lines.push(`| :--- | ${topChunks.map(() => ':---').join(' | ')} |`);
      lines.push(`| **Category** | ${topChunks.map(c => c.document.metadata.sub_category).join(' | ')} |`);
      lines.push(`| **Expense Ratio (TER)** | ${topChunks.map(c => c.document.metadata.expense_ratio ? `${c.document.metadata.expense_ratio}%` : 'N/A').join(' | ')} |`);
      lines.push(`| **AUM (₹ Crores)** | ${topChunks.map(c => c.document.metadata.aum ? `₹${c.document.metadata.aum.toLocaleString()} Cr` : 'N/A').join(' | ')} |`);
      lines.push(`| **1-Year Return** | ${topChunks.map(c => c.document.metadata.return1y !== undefined && c.document.metadata.return1y !== null ? `${c.document.metadata.return1y}%` : 'N/A').join(' | ')} |`);
      lines.push(`| **5-Year CAGR** | ${topChunks.map(c => c.document.metadata.return5y ? `${c.document.metadata.return5y}%` : 'N/A').join(' | ')} |`);
      lines.push(`| **Lock-in Period** | ${topChunks.map(c => c.document.metadata.sub_category === 'ELSS' ? '3 Years (Sec 80C)' : 'None (Open-ended)').join(' | ')} |\n`);

      lines.push(`#### Key Highlights:`);
      for (const chunk of topChunks) {
        lines.push(`- **${chunk.document.fund_name}**: ${chunk.document.content.split('\n')[1] || chunk.document.title}`);
      }
    } else {
      // Single Intent Query - Provide ONLY direct answer to what was asked
      const q = processedQuery.rawQuery.toLowerCase();
      const primaryChunk = topChunks[0];
      const fundName = primaryChunk.document.fund_name;
      const meta = primaryChunk.document.metadata;

      // Robust metric extraction across top chunks, content match, or baseline funds
      let fundNav: number | null | undefined = meta.nav;
      if (fundNav === undefined || fundNav === null || isNaN(fundNav)) {
        for (const c of topChunks) {
          if (c.document.metadata.nav !== undefined && c.document.metadata.nav !== null && !isNaN(c.document.metadata.nav)) {
            fundNav = c.document.metadata.nav;
            break;
          }
          const navMatch = c.document.content.match(/Current NAV:\s*₹?([\d,.]+)/i);
          if (navMatch) {
            fundNav = parseFloat(navMatch[1].replace(/,/g, ''));
            break;
          }
        }
      }
      if (fundNav === undefined || fundNav === null || isNaN(fundNav)) {
        const found = INITIAL_HDFC_FUNDS.find(f => 
          fundName.toLowerCase().includes(f.sub_category.toLowerCase()) || 
          f.scheme_name.toLowerCase().includes(fundName.toLowerCase()) ||
          fundName.toLowerCase().includes(f.scheme_name.toLowerCase()) ||
          (fundName.toLowerCase().includes('elss') && f.sub_category === 'ELSS')
        );
        if (found) {
          fundNav = found.nav;
        }
      }

      let fundAum: number | null | undefined = meta.aum;
      if (fundAum === undefined || fundAum === null || isNaN(fundAum)) {
        for (const c of topChunks) {
          if (c.document.metadata.aum !== undefined && c.document.metadata.aum !== null && !isNaN(c.document.metadata.aum)) {
            fundAum = c.document.metadata.aum;
            break;
          }
          const aumMatch = c.document.content.match(/Assets Under Management \(AUM\):\s*₹?([\d,.]+)/i);
          if (aumMatch) {
            fundAum = parseFloat(aumMatch[1].replace(/,/g, ''));
            break;
          }
        }
      }
      if (fundAum === undefined || fundAum === null || isNaN(fundAum)) {
        const found = INITIAL_HDFC_FUNDS.find(f => 
          fundName.toLowerCase().includes(f.sub_category.toLowerCase()) || 
          f.scheme_name.toLowerCase().includes(fundName.toLowerCase()) ||
          fundName.toLowerCase().includes(f.scheme_name.toLowerCase()) ||
          (fundName.toLowerCase().includes('elss') && f.sub_category === 'ELSS')
        );
        if (found) {
          fundAum = found.aum;
        }
      }

      let answered = false;

      if (q.includes('expense') || q.includes('ter') || q.includes('ratio') || q.includes('fee')) {
        if (topChunks.length > 1 && (q.includes('all') || q.includes('which') || q.includes('lowest') || q.includes('compare'))) {
          const seen = new Set<string>();
          for (const c of topChunks) {
            if (c.document.metadata.expense_ratio !== undefined && !seen.has(c.document.fund_name)) {
              seen.add(c.document.fund_name);
              lines.push(`Expense ratio of ${c.document.fund_name} is ${c.document.metadata.expense_ratio}%.`);
            }
          }
        } else {
          lines.push(`Expense ratio of ${fundName} is ${meta.expense_ratio}%.`);
        }
        answered = true;
      }

      const asksLockIn = q.includes('lock') || q.includes('lock-in') || q.includes('80c') || q.includes('deduction') || (q.includes('tax') && !q.includes('tax saver') && !q.includes('tax-saver'));
      if (asksLockIn && !q.includes('nav')) {
        if (meta.sub_category === 'ELSS' || q.includes('elss')) {
          lines.push(`The mandatory statutory lock-in period for ${fundName} is 3 Years under Section 80C of the Income Tax Act with tax deduction benefits up to ₹1,50,000 per financial year.`);
        } else {
          lines.push(`${fundName} is an open-ended mutual fund scheme with no mandatory lock-in period.`);
        }
        answered = true;
      }

      if (q.includes('return') || q.includes('cagr') || q.includes('performance') || q.includes('5y') || q.includes('5 year') || q.includes('3y') || q.includes('1y')) {
        if (q.includes('5') || q.includes('5y') || q.includes('5-year')) {
          lines.push(`5-year return of ${fundName} is ${meta.return5y}%.`);
        } else if (q.includes('3') || q.includes('3y') || q.includes('3-year')) {
          lines.push(`3-year return of ${fundName} is ${meta.return3y}%.`);
        } else if (q.includes('1') || q.includes('1y') || q.includes('1-year')) {
          lines.push(`1-year return of ${fundName} is ${meta.return1y}%.`);
        } else {
          lines.push(`Returns for ${fundName}: 1-Year: ${meta.return1y}%, 3-Year: ${meta.return3y}%, 5-Year: ${meta.return5y}%.`);
        }
        answered = true;
      }

      if (q.includes('aum')) {
        lines.push(`AUM of ${fundName} is ₹${(fundAum ?? meta.aum)?.toLocaleString()} Crores.`);
        answered = true;
      }

      if (q.includes('nav')) {
        lines.push(`NAV of ${fundName} is ₹${fundNav ?? meta.nav}.`);
        answered = true;
      }

      if (q.includes('exit load')) {
        lines.push(`Exit load of ${fundName} is ${meta.exit_load}.`);
        answered = true;
      }

      if (q.includes('holding') || q.includes('stock') || q.includes('company')) {
        lines.push(`Top stock holdings of ${fundName}:`);
        const holdingLines = primaryChunk.document.content.split('\n').filter(l => /^\d+\./.test(l.trim()));
        if (holdingLines.length > 0) {
          lines.push(...holdingLines.slice(0, 5));
        } else {
          lines.push(primaryChunk.document.content);
        }
        answered = true;
      }

      if (!answered) {
        const firstInfoLine = primaryChunk.document.content.split('\n').find(l => l.trim().length > 0 && !l.startsWith('Fund:')) || primaryChunk.document.content;
        lines.push(`${fundName}: ${firstInfoLine}`);
      }
    }

    // ELSS Statutory Notice
    const hasElss = topChunks.some(c => c.document.metadata.sub_category === 'ELSS');
    if (hasElss) {
      lines.push(`\n> **${ELSS_STATUTORY_LOCK_IN_NOTICE}**`);
    }

    // Source Citations
    const uniqueSources = Array.from(new Set(topChunks.map(c => c.document.source_url)));
    lines.push(`\n**Verified Sources:**`);
    for (const url of uniqueSources) {
      lines.push(`- [Groww Direct Fund Record](${url})`);
    }

    // SEBI Regulatory Disclaimer
    lines.push(`\n---\n*Disclaimer: ${SEBI_REGULATORY_DISCLAIMER}*`);

    return lines.join('\n');
  }
}
