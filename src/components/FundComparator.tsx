import React from 'react';
import { FundData } from '../types/mutualFund';
import { GitCompare, ExternalLink, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

interface FundComparatorProps {
  funds: FundData[];
}

export const FundComparator: React.FC<FundComparatorProps> = ({ funds }) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-mono font-bold border border-blue-500/30">
            Multi-Fund Analytics
          </span>
          <span className="text-xs text-slate-400">Direct Scheme Comparison</span>
        </div>
        <h2 className="text-2xl font-bold text-white mt-1">
          HDFC Mutual Funds Comparison Matrix
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
          Side-by-side evaluation of all 4 HDFC funds ingested from Groww across market cap segments, expenses, risk profiles, and multi-year CAGR returns.
        </p>
      </div>

      {/* Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-850 border-b border-slate-800">
                <th className="py-4 px-4 w-48 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-900 sticky left-0 z-10 border-r border-slate-800">
                  Fund Dimension
                </th>
                {funds.map((fund) => (
                  <th key={fund.id} className="py-4 px-4 min-w-[220px] text-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        fund.sub_category === 'Large Cap' ? 'bg-blue-500/20 text-blue-300' :
                        fund.sub_category === 'Mid Cap' ? 'bg-emerald-500/20 text-emerald-300' :
                        fund.sub_category === 'Small Cap' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-amber-500/20 text-amber-300'
                      }`}>
                        {fund.sub_category}
                      </span>
                      <a
                        href={fund.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Groww scheme URL"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="font-bold text-sm text-white line-clamp-2">
                      {fund.scheme_name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 font-mono">
              {/* Fund Manager & Benchmark */}
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Fund Manager
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 font-sans text-slate-200 font-medium">
                    {f.fund_manager}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Benchmark Index
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 font-sans text-slate-300">
                    {f.benchmark_name}
                  </td>
                ))}
              </tr>

              {/* NAV & AUM */}
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Current NAV
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-white font-bold text-sm">
                    ₹{f.nav}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  AUM (₹ Crores)
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-emerald-400 font-bold text-sm">
                    ₹{f.aum.toLocaleString()} Cr
                  </td>
                ))}
              </tr>

              {/* Expense Ratio & Terms */}
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Expense Ratio (Direct)
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-teal-300 font-bold text-sm">
                    {f.expense_ratio}%
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Exit Load Policy
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 font-sans text-slate-300">
                    {f.exit_load}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Lock-in Period (80C)
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 font-sans font-semibold">
                    {f.lock_in ? (
                      <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {f.lock_in}
                      </span>
                    ) : (
                      <span className="text-slate-500">None (Open-ended)</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Section Header: Trailing Returns */}
              <tr className="bg-slate-950 font-sans text-emerald-400 font-bold">
                <td colSpan={funds.length + 1} className="py-2.5 px-4 uppercase tracking-wider text-[11px]">
                  Historical Trailing Returns (Groww Normalized)
                </td>
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  1-Year Return
                </td>
                {funds.map((f) => (
                  <td key={f.id} className={`py-3 px-4 font-bold ${
                    (f.returns.return1y || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {f.returns.return1y !== undefined ? `${f.returns.return1y}%` : 'N/A'}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  3-Year Return (CAGR)
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-emerald-400 font-bold text-sm">
                    {f.returns.return3y !== undefined ? `${f.returns.return3y}%` : 'N/A'}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  5-Year Return (CAGR)
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-emerald-400 font-extrabold text-sm">
                    {f.returns.return5y !== undefined ? `${f.returns.return5y}%` : 'N/A'}
                  </td>
                ))}
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  10-Year Return (CAGR)
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 text-teal-300 font-bold">
                    {f.returns.return10y !== undefined ? `${f.returns.return10y}%` : 'N/A'}
                  </td>
                ))}
              </tr>

              {/* Top Holdings Sample */}
              <tr className="bg-slate-950 font-sans text-teal-400 font-bold">
                <td colSpan={funds.length + 1} className="py-2.5 px-4 uppercase tracking-wider text-[11px]">
                  Top 3 Company Holdings
                </td>
              </tr>

              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-sans font-semibold text-slate-300 bg-slate-900 sticky left-0 border-r border-slate-800">
                  Holdings Preview
                </td>
                {funds.map((f) => (
                  <td key={f.id} className="py-3 px-4 font-sans space-y-1">
                    {f.holdings.slice(0, 3).map((h, i) => (
                      <div key={i} className="text-slate-300 text-[11px]">
                        <span className="font-semibold text-white">{h.company_name}</span> ({h.corpus_per}%)
                      </div>
                    ))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
