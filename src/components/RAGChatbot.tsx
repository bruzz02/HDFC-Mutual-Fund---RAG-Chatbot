import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, RAGRetrievalResult } from '../types/mutualFund';
import { 
  Send, 
  Bot, 
  User, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  Database,
  ArrowRight,
  Info
} from 'lucide-react';

interface RAGChatbotProps {
  onSendMessage: (text: string) => Promise<void>;
  messages: ChatMessage[];
  isLoading: boolean;
}

export const RAGChatbot: React.FC<RAGChatbotProps> = ({
  onSendMessage,
  messages,
  isLoading
}) => {
  const [inputText, setInputText] = useState('');
  const [expandedInspectId, setExpandedInspectId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sampleQueries = [
    "Compare the 5-year returns and AUM of all 4 HDFC funds.",
    "Which fund has the lowest expense ratio and what is its exit load?",
    "Explain the tax benefits and mandatory lock-in period of HDFC ELSS Tax Saver.",
    "What are the top 5 stock holdings in HDFC Mid Cap Fund?",
    "Who manages HDFC Small Cap and what is its benchmark index?"
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText;
    setInputText('');
    onSendMessage(text);
  };

  const handleSampleClick = (query: string) => {
    if (isLoading) return;
    onSendMessage(query);
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Chatbot Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
              Interactive Prototype
            </span>
            <span className="text-xs text-slate-400">Phase 1-5 Live Generation</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center space-x-2">
            <span>HDFC Mutual Fund Chat Bot</span>
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Ask any question regarding the 4 ingested HDFC mutual funds. Powered by Gemini 3.8 Flash with grounded hybrid retrieval and source citations.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Knowledge Base: <strong>4 Funds / 16 Chunks</strong></span>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Suggested Financial Queries:
        </span>
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSampleClick(q)}
              disabled={isLoading}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 transition-all text-left flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>{q}</span>
              <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Message History Thread */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[460px] flex flex-col justify-between">
        <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[600px]">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="text-white font-bold text-base">HDFC Chat Bot Ready</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Click any prompt above or ask questions comparing Large Cap, Mid Cap, Small Cap, and ELSS Tax Saver funds based on live Groww data.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 text-sm ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-2xl rounded-xl p-4.5 ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-slate-850 border border-slate-800 text-slate-200 shadow-md'
              }`}>
                {/* Message Header */}
                <div className="flex items-center justify-between text-[11px] mb-2 font-mono">
                  <span className={msg.role === 'user' ? 'text-emerald-100 font-semibold' : 'text-slate-400 font-semibold'}>
                    {msg.role === 'user' ? 'You' : 'HDFC Chat Bot'}
                  </span>
                  <span className={msg.role === 'user' ? 'text-emerald-200' : 'text-slate-500'}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Content Render with Markdown Tables support */}
                <div className="prose prose-invert prose-xs max-w-none space-y-2 text-xs leading-relaxed overflow-x-auto">
                  {renderFormattedContent(msg.content)}
                </div>

                {/* Citations Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
                      Verified Groww Sources:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, i) => (
                        <a
                          key={i}
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-750 text-[11px] text-teal-300 hover:text-teal-200 transition-colors"
                        >
                          <span>{c.fundName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-500" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* RAG Context Retrieval Drawer Toggle */}
                {msg.retrievedChunks && msg.retrievedChunks.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => setExpandedInspectId(expandedInspectId === msg.id ? null : msg.id)}
                      className="flex items-center space-x-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        {expandedInspectId === msg.id ? 'Hide Retrieved RAG Chunks' : `Inspect ${msg.retrievedChunks.length} Retrieved Chunks`}
                      </span>
                      {expandedInspectId === msg.id ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {expandedInspectId === msg.id && (
                      <div className="mt-3 space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase font-mono mb-2">
                          Top Retrieved Chunks (Phase 4 Hybrid Score):
                        </div>
                        {msg.retrievedChunks.map((res, cIdx) => (
                          <div key={cIdx} className="bg-slate-900 p-2.5 rounded border border-slate-800 text-xs">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-bold text-white truncate max-w-[70%]">
                                {res.chunk.title}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                                Score: {res.score}
                              </span>
                            </div>
                            <p className="text-[10px] text-teal-400 font-mono mb-1">
                              Match: {res.matchReason}
                            </p>
                            <pre className="text-[11px] font-mono text-slate-300 bg-slate-950 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                              {res.chunk.content}
                            </pre>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-850 border border-slate-800 rounded-xl p-4 flex items-center space-x-3 text-slate-300 text-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Retrieving Groww fund chunks &amp; generating grounded financial response...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-slate-800 flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about returns, expense ratios, exit loads, top holdings, or tax lock-in..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Compliance Note */}
      <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>SEBI Compliance Guardrail:</strong> Grounded strictly on Phase 1 data scraped from Groww. Historical mutual fund returns do not guarantee future returns.
        </span>
      </div>
    </div>
  );
};

// Formatter to render tables and headers cleanly
function renderFormattedContent(content: string) {
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
        <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-lg border border-slate-750">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-750">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="py-2 px-3 font-mono">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950 font-mono">
              {rows.map((r, rIdx) => {
                const cols = parseRow(r);
                return (
                  <tr key={rIdx} className="hover:bg-slate-900/50">
                    {cols.map((c, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-slate-300">
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
        elements.push(<h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1">{line.replace('### ', '')}</h3>);
      } else if (line.startsWith('#### ')) {
        elements.push(<h4 key={idx} className="text-xs font-bold text-emerald-400 mt-2 mb-1">{line.replace('#### ', '')}</h4>);
      } else if (line.startsWith('- ')) {
        elements.push(
          <div key={idx} className="flex items-start space-x-1.5 pl-2 my-0.5">
            <span className="text-emerald-400 font-bold">&bull;</span>
            <span className="text-slate-300">{line.replace('- ', '')}</span>
          </div>
        );
      } else if (line.startsWith('*Disclaimer:')) {
        elements.push(<p key={idx} className="text-[11px] italic text-slate-400 mt-3 pt-2 border-t border-slate-800">{line}</p>);
      } else if (line.trim()) {
        elements.push(<p key={idx} className="text-slate-300">{line}</p>);
      }
    }
  });

  if (inTable) {
    flushTable();
  }

  return elements;
}
