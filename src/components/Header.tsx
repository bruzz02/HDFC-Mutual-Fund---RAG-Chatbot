import React from 'react';
import { Database, Cpu, Layers, GitCompare, MessageSquareCode, Moon, Sun, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'architecture' | 'phase1' | 'compare' | 'chat';
  setActiveTab: (tab: 'architecture' | 'phase1' | 'compare' | 'chat') => void;
  fundCount: number;
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/95 dark:bg-[#111c24]/95 border-b border-slate-800 dark:border-[#283a48] text-white sticky top-0 z-40 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* App Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[14px] bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Sparkles className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white dark:text-[#e1e7ec]">
                  HDFC Mutual Fund Chat Bot
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 dark:text-teal-200 border border-teal-500/30">
                  Groww Data
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-400">
                Direct Answers &bull; Ingested HDFC Scheme Records
              </p>
            </div>
          </div>

          {/* Top right is completely empty as requested */}
        </div>
      </div>
    </header>
  );
};
