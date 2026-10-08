export class FinancialUiFormatters {
  /**
   * Formats AUM in Indian Crores with symbol: e.g. 108324.55 -> ₹1,08,324.55 Cr
   */
  static formatAumCr(aum: number | null | undefined): string {
    if (aum === null || aum === undefined || isNaN(aum)) return 'N/A';
    return `₹${aum.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  }

  /**
   * Formats NAV in Rupees: e.g. 219.44 -> ₹219.44
   */
  static formatNav(nav: number | null | undefined): string {
    if (nav === null || nav === undefined || isNaN(nav)) return 'N/A';
    return `₹${nav.toFixed(2)}`;
  }

  /**
   * Formats returns percentage with explicit +/- sign: e.g. 124.09 -> +124.09%
   */
  static formatPercentReturn(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  }

  /**
   * Returns Tailwind color classes based on return value.
   */
  static getReturnColorClass(val: number | null | undefined): string {
    if (val === null || val === undefined || isNaN(val)) return 'text-slate-400';
    if (val > 0) return 'text-emerald-400';
    if (val < 0) return 'text-rose-400';
    return 'text-slate-300';
  }

  /**
   * Returns risk badge background and text colors.
   */
  static getRiskBadgeClass(riskometer: string | null | undefined): string {
    const r = (riskometer || '').toLowerCase();
    if (r.includes('very high')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    if (r.includes('high')) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (r.includes('moderate')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  }
}
