import crypto from 'crypto';

export class FinancialTokenizer {
  /**
   * Estimates token count for financial content with numbers, tables, and currency symbols.
   * Uses a fine-tuned subword heuristic: ~3.8 characters per token or punctuation/whitespace splitting.
   */
  static estimateTokenCount(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    
    // Split on whitespace and punctuation tokens
    const words = text.trim().split(/\s+/);
    let count = 0;

    for (const w of words) {
      if (w.length <= 4) {
        count += 1;
      } else if (w.length <= 8) {
        count += 2;
      } else {
        count += Math.ceil(w.length / 3.8);
      }
      
      // Numbers with decimal points, percentages, or symbols get extra subword tokens
      if (/[0-9]+[.,%₹]/.test(w)) {
        count += 1;
      }
    }

    return Math.max(1, count);
  }

  /**
   * Generates a stable SHA-256 hash of the chunk content for change-data-capture.
   */
  static computeContentHash(content: string, metadata: Record<string, any>): string {
    const raw = content + JSON.stringify(metadata);
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  }
}
