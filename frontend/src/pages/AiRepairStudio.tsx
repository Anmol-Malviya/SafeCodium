import React from 'react';
import { Wrench, Sparkles, Bot, ShieldCheck } from 'lucide-react';

export const AiRepairStudio: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">AI Repair Studio</h1>
          <p className="text-sm text-slate-400">
            Synthesize secure defensive C/C++ unified diffs with multi-provider AI reasoning.
          </p>
        </div>
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Provider:</span>
          <select className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200">
            <option value="gemini">Google Gemini API (Primary)</option>
            <option value="openai">OpenAI API (Critique)</option>
            <option value="ollama">Ollama Gemma 3 4B (Local)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-semibold">
            <Bot className="w-4 h-4" />
            <span>Root-Cause Explanation</span>
          </div>
          <p className="text-xs text-slate-400">
            AI reasoning breaks down the vulnerable pointer or array operation, tainted hardware sources, and the precise conditions required to exploit the fault.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-purple-400 text-sm font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Defensive Patch Strategy</span>
          </div>
          <p className="text-xs text-slate-400">
            Generates minimal unified diffs enforcing defensive bounds checks (`snprintf`, safe length bounds, NULL guards) preserving embedded semantics.
          </p>
        </div>
      </div>
    </div>
  );
};

