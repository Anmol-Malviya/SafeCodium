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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System &amp; AI Engine Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time multi-provider routing status, API credentials, and local model availability.
          </p>
        </div>
        <button
          onClick={fetchProviders}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-1.5 shadow-xs transition-colors self-start sm:self-center"
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
            <div key={p.provider_name} className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isGemini
                        ? 'bg-blue-50 text-blue-600'
                        : isOpenAI
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-purple-50 text-purple-600'
                    }`}
                  >
                    {isGemini ? <Key className="w-5 h-5" /> : isOpenAI ? <Shield className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {p.provider_name === 'gemini' ? 'Google Gemini API' : p.provider_name === 'openai' ? 'OpenAI API' : 'Ollama Local Runtime'}
                      </h3>
                      {p.is_primary && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          PRIMARY REASONING
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Model: {p.model_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  {p.is_available ? (
                    <span className="flex items-center space-x-1 text-emerald-700 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Online</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-slate-500 text-xs font-semibold bg-slate-100 px-2.5 py-1 rounded-full">
                      <XCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unavailable</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 flex items-center justify-between">
                <span>Endpoint / Context:</span>
                <span className="font-mono text-slate-700 text-[11px]">
                  {isGemini ? 'https://generativelanguage.googleapis.com' : isOpenAI ? 'https://api.openai.com/v1' : 'http://localhost:11434'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
