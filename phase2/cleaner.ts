export class FinancialCleaner {
  /**
   * Cleans text, decodes HTML entities, and removes repetitive whitespace.
   */
  static cleanText(input: string): string {
    if (!input) return '';
    return input
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Formats numbers into Indian currency notation (Crores).
   */
  static formatCrores(amount: number): string {
    if (isNaN(amount) || amount === 0) return '0';
    return amount.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /**
   * Formats percentage with sign.
   */
  static formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
}
