import React, { useState } from 'react';
import { FundData, RAGChunk } from '../types/mutualFund';
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Layers, 
  PieChart, 
  TrendingUp, 
  ShieldCheck, 
  FileJson, 
  Terminal, 
  DollarSign, 
  Clock, 
  ArrowUpRight,
  Database,
  Search,
  BookOpen
} from 'lucide-react';
import { generateChunksFromFunds } from '../utils/ragChunker';

interface Phase1IngestionStudioProps {
  funds: FundData[];
  onTriggerIngest: () => Promise<void>;
  isIngesting: boolean;
  logs: any[];
}

export const Phase1IngestionStudio: React.FC<Phase1IngestionStudioProps> = ({
  funds,
  onTriggerIngest,
  isIngesting,
  logs
}) => {
  const [selectedFundId, setSelectedFundId] = useState<string>(funds[0]?.id || 'hdfc-mid-cap-fund-direct-growth');
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'holdings' | 'chunks' | 'raw_json'>('metrics');
  const [showLogs, setShowLogs] = useState<boolean>(false);

  const selectedFund = funds.find(f => f.id === selectedFundId) || funds[0];
  const allChunks = generateChunksFromFunds(funds);
  const fundChunks = allChunks.filter(c => c.fund_id === selectedFund?.id);

  return (
    <div className="space-y-6 pb-12">
      {/* Studio Header & Ingestion Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-xs font-mono font-bold border border-teal-500/30">
              Phase 1 Implementation
            </span>
            <span className="text-xs text-slate-400">Data Extraction Engine</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1">
            Groww Mutual Fund Ingestion Studio
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Real-time scraping and schema extraction pipeline for the 4 target HDFC mutual fund schemes directly from Groww.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>{showLogs ? 'Hide Ingestion Logs' : 'View Ingestion Logs'}</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[10px]">
              {logs.length}
            </span>
          </button>

          <button
            onClick={onTriggerIngest}
            disabled={isIngesting}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md ${
              isIngesting
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isIngesting ? 'animate-spin text-teal-400' : ''}`} />
            <span>{isIngesting ? 'Extracting from Groww...' : 'Trigger Live Scrape'}</span>
          </button>
        </div>
      </div>

      {/* Live Ingestion Log Console (Collapsible) */}
      {showLogs && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-slate-400 font-bold flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Live Ingestion Log Stream (Cheerio SSR Extractor)</span>
            </span>
            <span className="text-[10px] text-slate-500">Auto-refreshing</span>
          </div>
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-2">
            {logs.map((log, idx) => (
              <div key={idx} className="flex items-start space-x-2">
                <span className="text-slate-500 shrink-0 text-[11px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded shrink-0 ${
                  log.level === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                  log.level === 'error' ? 'bg-rose-500/20 text-rose-400' :
                  log.level === 'warn' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {log.level}
                </span>
                <span className="text-slate-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Target Fund Selector Cards (4 Groww Funds) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {funds.map((fund) => {
          const isSelected = selectedFund?.id === fund.id;
          return (
            <div
              key={fund.id}
              onClick={() => setSelectedFundId(fund.id)}
              className={`cursor-pointer rounded-xl p-4 border transition-all text-left relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-850 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
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
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                    title="Open on Groww"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <h3 className="font-bold text-white text-sm line-clamp-2 leading-snug">
                  {fund.scheme_name}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Current NAV:</span>
                  <span className="font-mono font-semibold text-white">₹{fund.nav}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">AUM:</span>
                  <span className="font-mono font-semibold text-white">₹{fund.aum.toLocaleString()} Cr</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">5Y Return:</span>
                  <span className={`font-mono font-bold ${
                    (fund.returns.return5y || 0) > 0 ? 'text-emerald-400' : 'text-slate-300'
                  }`}>
                    {fund.returns.return5y ? `${fund.returns.return5y}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Expense Ratio:</span>
                  <span className="font-mono font-semibold text-teal-300">{fund.expense_ratio}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Fund Detail Workbench */}
      {selectedFund && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {/* Fund Banner Header */}
          <div className="bg-slate-850 p-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-mono">
                  Groww Scheme ID: {selectedFund.search_id}
                </span>
                <span className="flex items-center space-x-1 text-xs text-emerald-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Schema Verified</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                {selectedFund.scheme_name}
              </h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300">
                <span>Fund House: <strong>{selectedFund.fund_house}</strong></span>
                <span>&bull;</span>
                <span>Fund Manager: <strong>{selectedFund.fund_manager}</strong></span>
                <span>&bull;</span>
                <span>Benchmark: <strong>{selectedFund.benchmark_name}</strong></span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={selectedFund.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
              >
                <span>View on Groww.in</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Sub-tabs Navigation */}
          <div className="bg-slate-950 px-6 border-b border-slate-800 flex space-x-6 text-sm">
            <button
              onClick={() => setActiveSubTab('metrics')}
              className={`py-3.5 border-b-2 font-medium text-xs sm:text-sm transition-colors flex items-center space-x-2 ${
                activeSubTab === 'metrics'
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Financial Metrics & Returns</span>
            </button>

            <button
              onClick={() => setActiveSubTab('holdings')}
              className={`py-3.5 border-b-2 font-medium text-xs sm:text-sm transition-colors flex items-center space-x-2 ${
                activeSubTab === 'holdings'
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Portfolio Holdings ({selectedFund.holdings.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('chunks')}
              className={`py-3.5 border-b-2 font-medium text-xs sm:text-sm transition-colors flex items-center space-x-2 ${
                activeSubTab === 'chunks'
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>RAG Chunks ({fundChunks.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('raw_json')}
              className={`py-3.5 border-b-2 font-medium text-xs sm:text-sm transition-colors flex items-center space-x-2 ${
                activeSubTab === 'raw_json'
                  ? 'border-emerald-500 text-emerald-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileJson className="w-4 h-4" />
              <span>Raw JSON Extract</span>
            </button>
          </div>

          {/* Sub-tab 1: Financial Metrics & Returns */}
          {activeSubTab === 'metrics' && (
            <div className="p-6 space-y-6">
              {/* Primary KPI Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">NAV ({selectedFund.nav_date})</span>
                  <span className="text-lg font-bold font-mono text-white mt-0.5 block">₹{selectedFund.nav}</span>
                </div>
                <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Fund AUM</span>
                  <span className="text-lg font-bold font-mono text-white mt-0.5 block">₹{selectedFund.aum.toLocaleString()} Cr</span>
                </div>
                <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Expense Ratio</span>
                  <span className="text-lg font-bold font-mono text-teal-400 mt-0.5 block">{selectedFund.expense_ratio}%</span>
                </div>
                <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Riskometer</span>
                  <span className="text-lg font-bold text-amber-400 mt-0.5 block text-sm">{selectedFund.risk}</span>
                </div>
                <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Min SIP / Lump Sum</span>
                  <span className="text-sm font-bold font-mono text-white mt-1 block">₹{selectedFund.min_sip_investment} / ₹{selectedFund.min_investment_amount}</span>
                </div>
                <div className="bg-slate-850 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-medium">Exit Load / Lock-in</span>
                  <span className="text-xs font-semibold text-slate-200 mt-1 block truncate" title={selectedFund.lock_in || selectedFund.exit_load}>
                    {selectedFund.lock_in || selectedFund.exit_load}
                  </span>
                </div>
              </div>

              {/* Trailing Returns Comparison Table */}
              <div className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Trailing Returns Performance vs Category Benchmark</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Compounded Annual Growth Rate (CAGR)</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">Period</th>
                        <th className="py-2.5 px-4">Scheme Return (%)</th>
                        <th className="py-2.5 px-4">Category Average (%)</th>
                        <th className="py-2.5 px-4">Outperformance / Alpha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {[
                        { label: '1-Year', val: selectedFund.returns.return1y, cat: selectedFund.returns.cat_return1y },
                        { label: '3-Year (CAGR)', val: selectedFund.returns.return3y, cat: selectedFund.returns.cat_return3y },
                        { label: '5-Year (CAGR)', val: selectedFund.returns.return5y, cat: selectedFund.returns.cat_return5y },
                        { label: '7-Year (CAGR)', val: selectedFund.returns.return7y, cat: undefined },
                        { label: '10-Year (CAGR)', val: selectedFund.returns.return10y, cat: undefined },
                        { label: 'Since Inception', val: selectedFund.returns.return_since_created, cat: undefined }
                      ].map((row, idx) => {
                        const alpha = row.val != null && row.cat != null ? (row.val - row.cat).toFixed(2) : null;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-sans font-medium text-slate-300">{row.label}</td>
                            <td className={`py-2.5 px-4 font-bold ${
                              (row.val || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {row.val != null ? `${row.val}%` : 'N/A'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {row.cat != null ? `${row.cat}%` : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              {alpha ? (
                                <span className={`font-semibold ${Number(alpha) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {Number(alpha) >= 0 ? `+${alpha}%` : `${alpha}%`}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Portfolio Holdings */}
          {activeSubTab === 'holdings' && (
            <div className="p-6 space-y-6">
              {/* Sector Allocation Breakdown */}
              {selectedFund.sector_allocation && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Top Sector Allocation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedFund.sector_allocation.map((sec, idx) => (
                      <div key={idx} className="bg-slate-850 p-3 rounded-lg border border-slate-800">
                        <div className="text-xs text-slate-300 font-medium truncate">{sec.sector}</div>
                        <div className="text-sm font-bold font-mono text-emerald-400 mt-1">{sec.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Holdings Table */}
              <div className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                    <PieChart className="w-4 h-4 text-emerald-400" />
                    <span>Top Ingested Company Holdings</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">Source: Groww SSR Data</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4">#</th>
                        <th className="py-2.5 px-4">Company Name</th>
                        <th className="py-2.5 px-4">Sector</th>
                        <th className="py-2.5 px-4">Instrument</th>
                        <th className="py-2.5 px-4 text-right">Portfolio Weight (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {selectedFund.holdings.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-4 text-slate-500 font-sans">{i + 1}</td>
                          <td className="py-2.5 px-4 font-sans font-semibold text-white">{h.company_name}</td>
                          <td className="py-2.5 px-4 text-slate-400 font-sans">{h.sector_name}</td>
                          <td className="py-2.5 px-4 text-slate-400">{h.instrument_name}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400">{h.corpus_per}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 3: Generated RAG Chunks */}
          {activeSubTab === 'chunks' && (
            <div className="p-6 space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                <strong>Phase 2 Semantic Chunker Output:</strong> The raw Groww data for <em>{selectedFund.scheme_name}</em> has been decomposed into {fundChunks.length} specialized chunks, isolating returns, holdings, and costs to avoid embedding dilution.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fundChunks.map((chunk) => (
                  <div key={chunk.chunk_id} className="bg-slate-850 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                          {chunk.chunk_type}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ~{chunk.token_count} tokens
                        </span>
                      </div>
                      <h4 className="font-bold text-white text-sm mb-2">{chunk.title}</h4>
                      <pre className="text-xs font-mono bg-slate-950 p-3 rounded-lg text-slate-300 whitespace-pre-wrap leading-relaxed border border-slate-800/80">
                        {chunk.content}
                      </pre>
                    </div>

                    <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-1">
                      {chunk.metadata.tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 4: Raw JSON AST */}
          {activeSubTab === 'raw_json' && (
            <div className="p-6">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-xs">
                  <span className="text-slate-400 font-mono">Extracted Schema AST (Groww mfServerSideData)</span>
                  <span className="text-slate-500">{new Date(selectedFund.last_ingested_at).toLocaleString()}</span>
                </div>
                <pre className="text-xs font-mono text-emerald-300 max-h-96 overflow-y-auto leading-relaxed">
                  {JSON.stringify(selectedFund, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
