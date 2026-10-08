import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types/mutualFund';
import { 
  Send, 
  Bot, 
  User, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Database,
  ArrowRight,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Info,
  RotateCcw,
  Table as TableIcon,
  Lock,
  Percent,
  TrendingUp,
  Building2,
  Zap
} from 'lucide-react';

interface M3RAGChatbotProps {
  onSendMessage: (text: string) => Promise<void>;
  messages: ChatMessage[];
  isLoading: boolean;
  onClearChat?: () => void;
}

export const M3RAGChatbot: React.FC<M3RAGChatbotProps> = ({
  onSendMessage,
  messages,
  isLoading,
  onClearChat
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFundScope, setSelectedFundScope] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, 'up' | 'down'>>({});
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fundScopes = [
    { id: 'all', label: 'All 4 HDFC Schemes', icon: Sparkles },
    { id: 'large-cap', label: 'Large Cap Direct', icon: Building2 },
    { id: 'mid-cap', label: 'Mid Cap Direct', icon: TrendingUp },
    { id: 'small-cap', label: 'Small Cap Direct', icon: Zap },
    { id: 'elss', label: 'ELSS Tax Saver Direct', icon: Lock },
  ];

  const quickPrompts = [
    {
      title: 'Compare Returns Matrix',
      query: 'Compare 1Y, 3Y, and 5Y CAGR returns across all 4 HDFC mutual funds in a table.',
      icon: TableIcon
    },
    {
      title: 'Lowest Expense Ratio',
      query: 'Which HDFC mutual fund has the lowest direct expense ratio and what is its exit load policy?',
      icon: Percent
    },
    {
      title: 'ELSS 3-Year Lock-in & 80C',
      query: 'What is the lock in period and tax benefit of HDFC ELSS?',
      icon: Lock
    },
    {
      title: 'Top 5 Mid Cap Holdings',
      query: 'What are the top 5 stock holdings of HDFC Mid Cap Fund?',
      icon: Building2
    },
    {
      title: 'Small Cap 5-Year CAGR',
      query: 'What is the 5-year CAGR return of HDFC Small Cap Fund Direct Growth?',
      icon: TrendingUp
    }
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const showSnackbar = (text: string) => {
    setSnackbarMessage(text);
    setTimeout(() => {
      setSnackbarMessage(null);
    }, 2500);
  };

  const handleCopy = (id: string, text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showSnackbar('Copied response to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleFeedback = (id: string, type: 'up' | 'down') => {
    setFeedbackState(prev => ({ ...prev, [id]: type }));
    showSnackbar(type === 'up' ? 'Feedback recorded: Helpful!' : 'Feedback recorded.');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    
    let queryToSend = inputText.trim();
    if (selectedFundScope !== 'all') {
      const scopeLabel = fundScopes.find(s => s.id === selectedFundScope)?.label;
      if (scopeLabel && !queryToSend.toLowerCase().includes(scopeLabel.toLowerCase().split(' ')[0])) {
        queryToSend = `[Focus: ${scopeLabel}] ${queryToSend}`;
      }
    }

    const text = queryToSend;
    setInputText('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePromptSelect = (query: string) => {
    if (isLoading) return;
    onSendMessage(query);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto font-sans">
      {/* M3 Elevation Container / Chat Top Surface */}
      <div className="bg-slate-900/90 dark:bg-[#16242e] border border-slate-800 dark:border-[#283a48] rounded-[28px] p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white dark:text-[#e1e7ec]">
              HDFC Mutual Fund Chat Bot
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 dark:text-slate-300 max-w-2xl leading-relaxed">
              Provides direct, fact-checked answers with verified source links for HDFC Large Cap, Mid Cap, Small Cap, and ELSS Tax Saver schemes.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 dark:bg-[#111c24] border border-slate-800 dark:border-[#283a48] text-slate-300">
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span>4 Ingested Schemes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/80 dark:bg-[#111c24] border border-slate-800 dark:border-[#283a48] text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SEBI Grounded</span>
            </div>
            {onClearChat && messages.length > 0 && (
              <button
                onClick={onClearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* M3 Filter Chips: Target Fund Scope */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 dark:border-[#283a48]/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Select Fund Context Scope:
            </span>
            <span className="text-[11px] text-teal-400 font-mono">
              {selectedFundScope === 'all' ? 'All Schemes Included' : 'Target Scoped'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {fundScopes.map(scope => {
              const Icon = scope.icon;
              const isSelected = selectedFundScope === scope.id;
              return (
                <button
                  key={scope.id}
                  onClick={() => setSelectedFundScope(scope.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                      : 'bg-slate-800/80 dark:bg-[#1c2d3a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 dark:border-[#283a48]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-teal-400'}`} />
                  <span>{scope.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* M3 Assist Chips / Suggested Prompts */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">
          Financial Assist Prompts:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {quickPrompts.map((p, idx) => {
            const Icon = p.icon;
            return (
              <button
                key={idx}
                onClick={() => handlePromptSelect(p.query)}
                disabled={isLoading}
                className="text-left p-3 rounded-[18px] bg-slate-900/60 dark:bg-[#16242e]/80 hover:bg-slate-850 dark:hover:bg-[#1c2d3a] border border-slate-800 dark:border-[#283a48] hover:border-teal-500/50 transition-all flex items-start gap-2.5 text-xs text-slate-300 hover:text-white group disabled:opacity-50"
              >
                <div className="w-7 h-7 rounded-full bg-teal-500/10 dark:bg-teal-900/40 text-teal-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white group-hover:text-teal-300 transition-colors flex items-center justify-between">
                    <span>{p.title}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {p.query}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* M3 Chat Thread Container */}
      <div className="bg-slate-900/90 dark:bg-[#16242e] border border-slate-800 dark:border-[#283a48] rounded-[28px] overflow-hidden shadow-2xl min-h-[500px] flex flex-col justify-between">
        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-h-[640px]">
          {messages.length === 0 && !isLoading && (
            <div className="min-h-[360px] flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 dark:bg-teal-900/30 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-semibold text-white">Ask About HDFC Mutual Funds</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select an assist prompt above or ask any question below to get direct answers on expense ratios, returns, holdings, or lock-in rules.
                </p>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 text-sm ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot className="w-5 h-5" />
                </div>
              )}

              <div
                className={`max-w-3xl rounded-[24px] p-5 sm:p-6 transition-all shadow-md ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white rounded-br-[4px] shadow-teal-700/20'
                    : 'bg-slate-850 dark:bg-[#1c2d3a] border border-slate-800 dark:border-[#283a48] text-slate-100 rounded-bl-[4px]'
                }`}
              >
                {/* Message Header Bar */}
                <div className="flex items-center justify-between text-xs mb-3 font-mono opacity-80 border-b pb-2 border-white/10 dark:border-slate-700/40">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">
                      {msg.role === 'user' ? 'Investor Query' : 'HDFC Chat Bot'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1 rounded-md hover:bg-black/20 text-slate-300 hover:text-white transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-teal-300" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Content Render with Markdown Tables & Typography */}
                <div className="prose prose-invert prose-sm max-w-none text-xs sm:text-sm leading-relaxed overflow-x-auto space-y-2">
                  {renderM3FormattedContent(msg.content)}
                </div>

                {/* Direct Source Attribution Links (Only if citations exist) */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3.5 pt-2.5 border-t border-slate-700/50 dark:border-[#283a48] flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[11px] text-slate-400 font-medium">Source:</span>
                    {msg.citations.map((c, i) => (
                      <a
                        key={i}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 dark:bg-[#111c24] border border-slate-750 dark:border-[#283a48] text-[11px] text-teal-300 hover:text-teal-200 hover:border-teal-500/40 transition-all shadow-sm"
                      >
                        <span>{c.fundName}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Message Feedback Footer */}
                {msg.role === 'assistant' && (
                  <div className="mt-3 pt-2 border-t border-slate-700/40 dark:border-[#283a48] flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleFeedback(msg.id, 'up')}
                      className={`p-1.5 rounded-full transition-colors ${
                        feedbackState[msg.id] === 'up'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Good answer"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, 'down')}
                      className={`p-1.5 rounded-full transition-colors ${
                        feedbackState[msg.id] === 'down'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                      title="Needs improvement"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 text-sm">
              <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-slate-850 dark:bg-[#1c2d3a] border border-slate-800 dark:border-[#283a48] rounded-[24px] p-5 flex items-center gap-3 text-slate-300 text-xs shadow-md">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-white">Retrieving Grounded Answer...</div>
                  <div className="text-[11px] text-slate-400">
                    Sourcing directly from Groww fund records
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* M3 Search / Text Input Bar */}
        <div className="p-4 bg-slate-950/80 dark:bg-[#111c24] border-t border-slate-800/80 dark:border-[#283a48]">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="flex-1 flex items-center bg-slate-900 dark:bg-[#16242e] border border-slate-800 dark:border-[#283a48] focus-within:border-teal-500 dark:focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-500/20 rounded-full px-4 py-2 transition-all">
              <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mr-2" />
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about returns, expense ratios, exit loads, top holdings, or tax lock-in..."
                disabled={isLoading}
                className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none resize-none disabled:opacity-50 py-1"
                style={{ maxHeight: '120px' }}
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="w-11 h-11 rounded-full bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20 transition-all font-bold disabled:shadow-none"
              title="Send query"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-2">
            <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
            <span>Grounding: <strong>Official Groww Datasets</strong></span>
          </div>
        </div>
      </div>

      {/* M3 Snackbar Toast */}
      {snackbarMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-full border border-teal-500/40 shadow-2xl flex items-center gap-2 text-xs font-medium animate-fade-in">
          <Info className="w-4 h-4 text-teal-400" />
          <span>{snackbarMessage}</span>
        </div>
      )}
    </div>
  );
};

// Formatter to render tables, bullets, and typography in M3 style
function renderM3FormattedContent(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      const headerLine = tableBuffer[0];
      const rows = tableBuffer.slice(2); // Skip separator row

      const parseRow = (line: string) => line.split('|').slice(1, -1).map(c => c.trim());
      const headers = parseRow(headerLine);

      elements.push(
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-[16px] border border-slate-750 dark:border-[#283a48] shadow-sm">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 dark:bg-[#111c24] text-teal-300 font-bold border-b border-slate-750 dark:border-[#283a48]">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3.5 font-mono tracking-tight">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 dark:divide-[#283a48] bg-slate-950/60 dark:bg-[#16242e] font-mono">
              {rows.map((r, rIdx) => {
                const cols = parseRow(r);
                return (
                  <tr key={rIdx} className="hover:bg-slate-900/50 dark:hover:bg-[#1c2d3a] transition-colors">
                    {cols.map((c, cIdx) => (
                      <td key={cIdx} className="py-2 px-3.5 text-slate-300">
                        {c.replace(/\*\*/g, '')}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableBuffer = [];
      inTable = false;
    }
  };

  lines.forEach((line, idx) => {
    if (line.trim().startsWith('|')) {
      inTable = true;
      tableBuffer.push(line);
    } else {
      if (inTable) {
        flushTable();
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={idx} className="text-sm sm:text-base font-bold text-white dark:text-[#e1e7ec] mt-3 mb-1.5 flex items-center gap-2">
            <span>{line.replace('### ', '')}</span>
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={idx} className="text-xs sm:text-sm font-bold text-teal-400 mt-2.5 mb-1">
            {line.replace('#### ', '')}
          </h4>
        );
      } else if (line.startsWith('- ')) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 pl-2 my-1">
            <span className="text-teal-400 font-bold">&bull;</span>
            <span className="text-slate-300 dark:text-slate-300">{line.replace('- ', '')}</span>
          </div>
        );
      } else if (line.startsWith('*Disclaimer:')) {
        elements.push(
          <div key={idx} className="text-[11px] italic text-slate-400 dark:text-slate-400 mt-3 pt-2.5 border-t border-slate-800/80 dark:border-[#283a48] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span>{line}</span>
          </div>
        );
      } else if (line.trim()) {
        elements.push(<p key={idx} className="text-slate-300 dark:text-slate-300">{line}</p>);
      }
    }
  });

  if (inTable) {
    flushTable();
  }

  return elements;
}
