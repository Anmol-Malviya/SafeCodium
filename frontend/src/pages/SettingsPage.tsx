import React, { useEffect, useState } from 'react';
import { Settings, Key, Cpu, Shield, Database, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { getAiProviders, ProviderStatusData } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [providers, setProviders] = useState<ProviderStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProviders = async () => {
    setIsLoading(true);
    try {
      const data = await getAiProviders();
      setProviders(data);
    } catch (err) {
      console.error('Failed to load AI providers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System & AI Engine Settings</h1>
          <p className="text-sm text-slate-400">
            Real-time multi-provider routing status, API credentials, and local model availability.
          </p>
        </div>
        <button
          onClick={fetchProviders}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-mono text-slate-300 flex items-center space-x-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Probe Providers</span>
        </button>
      </div>

      <div className="space-y-4">
        {providers.map((p) => {
          const isGemini = p.provider_name === 'gemini';
          const isOpenAI = p.provider_name === 'openai';

          return (
            <div key={p.provider_name} className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isGemini
                        ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                        : isOpenAI
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                        : 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                    }`}
                  >
                    {isGemini ? <Key className="w-5 h-5" /> : isOpenAI ? <Shield className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-semibold text-white capitalize">
                        {p.provider_name === 'gemini' ? 'Google Gemini API' : p.provider_name === 'openai' ? 'OpenAI API' : 'Ollama Local Runtime'}
                      </h3>
                      {p.is_primary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                          PRIMARY REASONING
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Model: {p.model_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  {p.is_available ? (
                    <span className="flex items-center space-x-1 text-emerald-400 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ONLINE</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-slate-400 px-2.5 py-1 rounded bg-slate-800 border border-slate-700">
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>STANDBY</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>Status Diagnostic:</span>
                <span className={p.is_available ? 'text-emerald-300' : 'text-slate-400'}>
                  {p.status_message}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
