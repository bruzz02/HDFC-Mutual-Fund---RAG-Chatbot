/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { PhaseArchitectureView } from './components/PhaseArchitectureView';
import { Phase1IngestionStudio } from './components/Phase1IngestionStudio';
import { FundComparator } from './components/FundComparator';
import { M3RAGChatbot } from './components/M3RAGChatbot';
import { FundData, ChatMessage } from './types/mutualFund';
import { INITIAL_HDFC_FUNDS } from './data/defaultFundData';
import { processLocalRAGQuery } from './utils/ragChunker';
import { Shield, Sparkles, CheckCircle2, AlertCircle, Database, Layers } from 'lucide-react';

export default function App() {
  const getInitialTab = (): 'architecture' | 'phase1' | 'compare' | 'chat' => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'chat' || hash === 'compare' || hash === 'phase1' || hash === 'architecture') {
        return hash as any;
      }
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'chat' || tab === 'compare' || tab === 'phase1' || tab === 'architecture') {
        return tab as any;
      }
    }
    return 'chat'; // Default to chat so users immediately see the interactive Material Design 3 RAG Chatbot
  };

  const [activeTab, setActiveTab] = useState<'architecture' | 'phase1' | 'compare' | 'chat'>(getInitialTab());
  const [funds, setFunds] = useState<FundData[]>(INITIAL_HDFC_FUNDS);
  const [isIngesting, setIsIngesting] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(true);
  const [logs, setLogs] = useState<any[]>([
    {
      timestamp: new Date().toISOString(),
      level: 'success',
      message: 'Phase 1 initialized with verified baseline schemas for 4 Groww HDFC funds.'
    }
  ]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => !prev);
  };

  // Chatbot state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  const handleClearChat = () => {
    setMessages([]);
  };

  // Fetch initial funds & logs from server
  useEffect(() => {
    async function loadFunds() {
      try {
        const res = await fetch('/api/funds');
        if (res.ok) {
          const data = await res.json();
          if (data.funds && data.funds.length > 0) {
            setFunds(data.funds);
          }
        }
      } catch (err) {
        console.warn('Using baseline cached fund data:', err);
      }
    }

    async function loadLogs() {
      try {
        const res = await fetch('/api/funds/logs');
        if (res.ok) {
          const data = await res.json();
          if (data.logs && data.logs.length > 0) {
            setLogs(data.logs);
          }
        }
      } catch (err) {
        // Fallback logs
      }
    }

    loadFunds();
    loadLogs();
  }, []);

  // Trigger Phase 1 Ingestion
  const handleTriggerIngest = async () => {
    setIsIngesting(true);
    setNotification(null);
    try {
      const res = await fetch('/api/funds/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.funds) {
        setFunds(data.funds);
        if (data.logs) {
          setLogs(prev => [...data.logs, ...prev]);
        }
        setNotification({
          type: 'success',
          message: 'Phase 1 live extraction successfully fetched and normalized all 4 funds from Groww!'
        });
      } else {
        throw new Error(data.error || 'Ingestion returned an error');
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Scrape error: ${err.message}. Showing verified cached snapshot.`
      });
    } finally {
      setIsIngesting(false);
      setTimeout(() => setNotification(null), 6000);
    }
  };

  // Send message to RAG Chatbot
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/rag/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });

        if (res.ok) {
          data = await res.json();
        } else {
          console.warn(`Server returned status ${res.status}, activating client-side financial RAG pipeline.`);
        }
      } catch (fetchErr) {
        console.warn('Network or server unreachable, activating client-side financial RAG pipeline:', fetchErr);
      }

      // If backend was unreachable or returned non-200 (e.g. 500 on Vercel), seamlessly fall back to local RAG
      if (!data || !data.answer) {
        data = processLocalRAGQuery(text, funds.length > 0 ? funds : INITIAL_HDFC_FUNDS);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        retrievedChunks: data.retrievedChunks,
        citations: data.citations,
        modelUsed: data.modelUsed,
        pipelineTrace: data.pipelineTrace
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Chat error fallback:', err);
      const fallback = processLocalRAGQuery(text, funds.length > 0 ? funds : INITIAL_HDFC_FUNDS);
      const botMsg: ChatMessage = {
        id: `bot-fallback-${Date.now()}`,
        role: 'assistant',
        content: fallback.answer,
        timestamp: new Date().toISOString(),
        retrievedChunks: fallback.retrievedChunks,
        citations: fallback.citations,
        modelUsed: 'client-emergency-fallback',
        pipelineTrace: fallback.pipelineTrace
      };
      setMessages(prev => [...prev, botMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleTabChange = (tab: 'architecture' | 'phase1' | 'compare' | 'chat') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-[#0e1416] text-slate-100 dark:text-[#e1e3e3] flex flex-col font-sans selection:bg-teal-500 selection:text-slate-950 transition-colors">
      {/* Header */}
      <Header />

      {/* Ingestion Notification Toast */}
      {notification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className={`p-4 rounded-xl flex items-center space-x-3 text-xs sm:text-sm font-medium border shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main View Area: HDFC Mutual Fund Chat Bot */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        <M3RAGChatbot
          onSendMessage={handleSendMessage}
          messages={messages}
          isLoading={isChatLoading}
          onClearChat={handleClearChat}
        />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/80 dark:bg-[#111c24]/90 border-t border-slate-800/80 dark:border-[#283a48] py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-teal-400" />
            <span>HDFC Mutual Fund Chat Bot</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Sources: groww.in (HDFC Large Cap, Mid Cap, Small Cap, ELSS)</span>
            <span>&bull;</span>
            <span className="font-mono text-teal-400">Direct Verified Answers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
