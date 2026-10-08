import React, { useState } from 'react';
import { ARCHITECTURE_PHASES, ArchitecturePhase } from '../data/architectureSpecs';
import { 
  ArrowRight, 
  CheckCircle2, 
  Code2, 
  Database, 
  Layers, 
  ShieldAlert, 
  Copy, 
  Check, 
  Workflow, 
  Terminal,
  Activity,
  Play,
  RotateCw,
  Server,
  Layout,
  Clock,
  CheckCircle
} from 'lucide-react';

export const PhaseArchitectureView: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<ArchitecturePhase>(ARCHITECTURE_PHASES[0]);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'core_rag' | 'automation' | 'backend' | 'frontend'>('all');
  const [copiedSnippetIndex, setCopiedSnippetIndex] = useState<number | null>(null);

  // Live Scheduler Cascade execution state
  const [isRunningCascade, setIsRunningCascade] = useState<boolean>(false);
  const [cascadeReport, setCascadeReport] = useState<any | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippetIndex(idx);
    setTimeout(() => setCopiedSnippetIndex(null), 2000);
  };

  const handleRunCascade = async () => {
    setIsRunningCascade(true);
    setCascadeReport(null);
    try {
      const res = await fetch('/api/scheduler/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setCascadeReport(data.report);
      } else {
        throw new Error(data.error || 'Pipeline cascade failed');
      }
    } catch (err: any) {
      console.error('Cascade error:', err);
    } finally {
      setIsRunningCascade(false);
    }
  };

  const filteredPhases = categoryFilter === 'all'
    ? ARCHITECTURE_PHASES
    : ARCHITECTURE_PHASES.filter(p => p.category === categoryFilter);

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner / Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Workflow className="w-3.5 h-3.5" />
            <span>Complete Full-Stack Architecture Blueprint</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Mutual Fund RAG Chatbot: Phase-Wise System Architecture
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed">
            An end-to-end production architecture featuring Phase 1 Groww data ingestion, automated recurring cron scheduler cascading (Phase 6), modular backend API microservices (Phase 7), high-density financial frontend workbench (Phase 8), and continuous evaluation (Phase 9).
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
            <div>
              <div className="text-xs text-slate-400 font-medium">Phase 1 Data Target</div>
              <div className="text-emerald-400 font-bold text-sm mt-0.5">Groww Next.js SSR</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Automated Scheduler</div>
              <div className="text-teal-300 font-bold text-sm mt-0.5">Daily &amp; Monthly Cascade</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Backend &amp; API</div>
              <div className="text-white font-bold text-sm mt-0.5">Node.js Express Gateway</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Frontend UX</div>
              <div className="text-white font-bold text-sm mt-0.5">React 19 + Tailwind v4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Phases ({ARCHITECTURE_PHASES.length})
          </button>
          <button
            onClick={() => setCategoryFilter('core_rag')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
              categoryFilter === 'core_rag'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>RAG Core</span>
          </button>
          <button
            onClick={() => setCategoryFilter('automation')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
              categoryFilter === 'automation'
                ? 'bg-teal-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduler &amp; Cascade</span>
          </button>
          <button
            onClick={() => setCategoryFilter('backend')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
              categoryFilter === 'backend'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Backend Gateway</span>
          </button>
          <button
            onClick={() => setCategoryFilter('frontend')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
              categoryFilter === 'frontend'
                ? 'bg-purple-600 text-white font-bold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Frontend UX</span>
          </button>
        </div>

        {/* Live Cascade Execution Button */}
        <button
          onClick={handleRunCascade}
          disabled={isRunningCascade}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
            isRunningCascade
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-emerald-600/20 active:scale-95'
          }`}
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRunningCascade ? 'animate-spin text-teal-300' : ''}`} />
          <span>{isRunningCascade ? 'Cascading Pipeline...' : 'Test Full Pipeline Cascade'}</span>
        </button>
      </div>

      {/* Live Cascade Execution Report (if run) */}
      {cascadeReport && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-5 shadow-lg shadow-emerald-500/5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white text-sm">
                Automated Pipeline Cascade Run: {cascadeReport.runId}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                {cascadeReport.totalDurationMs}ms Total
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Triggered By: {cascadeReport.triggeredBy}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            {cascadeReport.steps.map((st: any) => (
              <div key={st.step} className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-mono text-slate-400">Step {st.step}</span>
                  <span className="text-emerald-400 font-bold font-mono">{st.durationMs}ms</span>
                </div>
                <div className="font-bold text-white text-xs mb-1 line-clamp-1">{st.name.replace(/^Phase \d+:\s*/, '')}</div>
                <div className="text-[11px] text-slate-300 leading-tight">{st.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Phase Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPhases.map((phase) => {
          const isSelected = selectedPhase.phaseNumber === phase.phaseNumber;

          return (
            <button
              key={phase.phaseNumber}
              onClick={() => setSelectedPhase(phase)}
              className={`text-left p-5 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-800/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              {phase.phaseNumber === 1 && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                  Phase 1 Live Scraper
                </div>
              )}
              {phase.phaseNumber === 6 && (
                <div className="absolute top-0 right-0 bg-teal-500 text-slate-950 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                  Automated Scheduler
                </div>
              )}
              {phase.phaseNumber === 7 && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                  Backend API
                </div>
              )}
              {phase.phaseNumber === 8 && (
                <div className="absolute top-0 right-0 bg-purple-500 text-white font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                  Frontend UX
                </div>
              )}

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}>
                    Phase {phase.phaseNumber}
                  </span>
                  <span className="text-xs text-slate-400 truncate font-medium">
                    {phase.subtitle}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base leading-snug">
                  {phase.title.replace(/^Phase \d+:\s*/, '')}
                </h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {phase.objective}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">
                  {phase.components.length} Subsystems
                </span>
                <span className={`font-semibold flex items-center space-x-1 ${
                  isSelected ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  <span>Inspect Spec</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Phase Deep Dive Spec */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-slate-850 px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-xs font-bold font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Phase {selectedPhase.phaseNumber} Deep Dive
              </span>
              <span className="text-xs text-slate-400 font-mono capitalize">
                Category: {selectedPhase.category.replace('_', ' ')}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {selectedPhase.title}
            </h2>
          </div>

          <div className="text-sm text-slate-300 max-w-md bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs uppercase tracking-wider block font-semibold">Phase Goal</span>
            <span className="text-xs text-slate-200">{selectedPhase.objective}</span>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Data Transformation Pipeline Box */}
          <div className="bg-slate-950 rounded-xl p-5 border border-slate-800/80">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Data Transformation Pipeline</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 font-bold block mb-1">1. Inputs</span>
                <span className="text-slate-200 font-mono">{selectedPhase.dataFlow.input}</span>
              </div>
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                <span className="text-teal-400 font-bold block mb-1">2. Processing Logic</span>
                <span className="text-slate-200 font-mono">{selectedPhase.dataFlow.process}</span>
              </div>
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">3. Deliverable Output</span>
                <span className="text-slate-200 font-mono">{selectedPhase.dataFlow.output}</span>
              </div>
            </div>
          </div>

          {/* Subsystem Components */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Architectural Subsystems &amp; Design Decisions</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedPhase.components.map((comp, idx) => (
                <div key={idx} className="bg-slate-850 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1">{comp.name}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{comp.description}</p>
                    
                    <div className="space-y-1.5 mb-3">
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                        Design Decisions:
                      </span>
                      {comp.keyDesignDecisions.map((decision, dIdx) => (
                        <div key={dIdx} className="flex items-start space-x-1.5 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{decision}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider mb-1">
                      Tech Stack:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comp.techStack.map((tech, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 bg-slate-900 border border-slate-750 text-slate-300 text-[11px] font-mono rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Challenges & Mitigations */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Production Challenges &amp; Hardened Mitigations</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedPhase.challengesAndMitigations.map((item, idx) => (
                <div key={idx} className="bg-slate-850 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-start space-x-2 text-xs text-amber-300 font-semibold mb-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/30">Risk</span>
                    <span>{item.challenge}</span>
                  </div>
                  <div className="flex items-start space-x-2 text-xs text-slate-300 pl-2 border-l-2 border-emerald-500/60 mt-2">
                    <span><strong>Mitigation:</strong> {item.mitigation}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Blueprints */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>Production Code Blueprints &amp; Architecture DDL</span>
            </h3>
            <div className="space-y-4">
              {selectedPhase.codeSnippets.map((snippet, idx) => (
                <div key={idx} className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-200 font-mono">{snippet.title}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-slate-800 text-slate-400 rounded">
                        {snippet.language}
                      </span>
                    </div>
                    <button
                      onClick={() => copyCode(snippet.code, idx)}
                      className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 px-2.5 py-1 rounded transition-colors"
                    >
                      {copiedSnippetIndex === idx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
