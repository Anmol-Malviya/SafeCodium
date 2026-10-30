import React from 'react';
import { Settings, Key, Cpu, Shield, Database } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">System & AI Engine Settings</h1>
        <p className="text-sm text-slate-400">
          Configure AI provider endpoints, API credentials, and local model parameters.
        </p>
      </div>

      <div className="space-y-4">
        {/* Google Gemini API */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Google Gemini API (Primary Engine)</h3>
                <p className="text-xs text-slate-400">Primary model for deep vulnerability reasoning and unified diff synthesis</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              google-genai v2.29.0
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Model Identifier</label>
              <input
                type="text"
                value="gemini-2.5-flash"
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">API Key Status</label>
              <input
                type="text"
                value="Loaded via .env (GEMINI_API_KEY)"
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 italic"
              />
            </div>
          </div>
        </div>

        {/* Local Gemma / Ollama */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Local Ollama Runtime (Optional Offline Engine)</h3>
                <p className="text-xs text-slate-400">Local inference targeting Gemma 3 4B (RTX 3050 6GB VRAM)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-[11px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
              OFFLINE / OPTIONAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Ollama Endpoint</label>
              <input
                type="text"
                value="http://localhost:11434"
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Local Model</label>
              <input
                type="text"
                value="gemma3:4b (4-bit Q4)"
                readOnly
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
