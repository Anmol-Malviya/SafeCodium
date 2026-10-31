import React, { useEffect, useState } from 'react';
import {
  Settings,
  Sparkles,
  Cpu,
  Shield,
  Key,
  Link2,
  Lock,
  EyeOff,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Sliders,
  Database,
  Terminal,
  Activity,
  X,
  AlertTriangle,
  Info,
  Server,
  Zap,
} from 'lucide-react';
import {
  getAiProviders,
  configureAiProvider,
  getRoutingSettings,
  updateRoutingSettings,
  getAdvancedSettings,
  updateAdvancedSettings,
  getLocalModels,
  ProviderStatusData,
  RoutingSettingsData,
  AdvancedSettingsData,
  LocalModelData,
} from '../services/api';

type TabType = 'providers' | 'routing' | 'local-models' | 'advanced';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('providers');
  const [providers, setProviders] = useState<ProviderStatusData[]>([]);
  const [routing, setRouting] = useState<RoutingSettingsData>({
    primary_provider: 'gemini',
    secondary_provider: 'openai',
    fallback_provider: 'ollama',
    request_timeout_seconds: 30,
    retry_policy_max_retries: 3,
    automatic_fallback_enabled: true,
  });
  const [advanced, setAdvanced] = useState<AdvancedSettingsData>({
    request_timeout_seconds: 30,
    max_retries: 3,
    log_level: 'INFO',
    strict_bounds_enforcement: true,
    cache_model_responses: false,
  });
  const [localModels, setLocalModels] = useState<LocalModelData[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isProbing, setIsProbing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatusData | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [provs, rout, adv, loc] = await Promise.all([
        getAiProviders(),
        getRoutingSettings().catch(() => routing),
        getAdvancedSettings().catch(() => advanced),
        getLocalModels().catch(() => []),
      ]);
      setProviders(provs);
      if (rout) setRouting(rout);
      if (adv) setAdvanced(adv);
      if (loc) setLocalModels(loc);
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleProbeProviders = async () => {
    setIsProbing(true);
    setMessage(null);
    try {
      const res = await getAiProviders();
      setProviders(res);
      setMessage({ type: 'success', text: 'All AI providers probed successfully. Health status updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to complete provider health probe.' });
    } finally {
      setIsProbing(false);
    }
  };

  const handleToggleProvider = async (provider: ProviderStatusData) => {
    const updatedEnabled = !(provider.enabled ?? true);
    try {
      const res = await configureAiProvider({
        provider_name: provider.provider_name,
        enabled: updatedEnabled,
      });
      setProviders((prev) =>
        prev.map((p) => (p.provider_name === provider.provider_name ? { ...p, enabled: updatedEnabled } : p))
      );
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to update ${provider.provider_name} state.` });
    }
  };

  const handleOpenConfigure = (p: ProviderStatusData) => {
    setSelectedProvider(p);
    setSelectedModel(p.model_name);
    setNewApiKey('');
    setCustomEndpoint('');
    setModalOpen(true);
  };

  const handleSaveModalConfig = async () => {
    if (!selectedProvider) return;
    setIsSavingConfig(true);
    setMessage(null);
    try {
      const res = await configureAiProvider({
        provider_name: selectedProvider.provider_name,
        api_key: newApiKey.trim() || undefined,
        model_name: selectedModel || undefined,
        endpoint: customEndpoint.trim() || undefined,
      });
      setProviders((prev) =>
        prev.map((p) => (p.provider_name === selectedProvider.provider_name ? res : p))
      );
      setModalOpen(false);
      setMessage({ type: 'success', text: `Configuration updated and verified for ${selectedProvider.provider_name}.` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update provider configuration.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveRouting = async () => {
    setIsSavingConfig(true);
    setMessage(null);
    try {
      const res = await updateRoutingSettings(routing);
      setRouting(res);
      setMessage({ type: 'success', text: 'Routing policies successfully applied to AI Engine.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update routing configuration.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleSaveAdvanced = async () => {
    setIsSavingConfig(true);
    setMessage(null);
    try {
      const res = await updateAdvancedSettings(advanced);
      setAdvanced(res);
      setMessage({ type: 'success', text: 'Advanced engine parameters updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update advanced settings.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-14 text-slate-800">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <span>System &amp; AI Engine Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage AI providers, routing preferences, and local model availability.
          </p>
        </div>

        <button
          onClick={handleProbeProviders}
          disabled={isProbing}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 shadow-xs transition-all active:scale-[0.98]"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isProbing ? 'animate-spin' : ''}`} />
          <span>Probe Providers</span>
        </button>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
              : 'bg-rose-50/80 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Personalized LLM Architecture Indicator */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white border border-blue-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-900">Safe Podium Personalized Engine</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                Core Domain-Specific Intelligence
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Specialized for C/C++ firmware vulnerability comprehension, AST verification, and secure patch synthesis. External providers below provide reasoning support and critique.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-700">Domain Models Active</span>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'providers'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Providers</span>
        </button>

        <button
          onClick={() => setActiveTab('routing')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'routing'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Routing</span>
        </button>

        <button
          onClick={() => setActiveTab('local-models')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'local-models'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Local Models</span>
        </button>

        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all flex items-center space-x-2 border-b-2 ${
            activeTab === 'advanced'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Advanced</span>
        </button>
      </div>

      {/* 4. Tab Content: AI Providers */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          {providers.map((p) => {
            const isGemini = p.provider_name.toLowerCase() === 'gemini';
            const isOpenAI = p.provider_name.toLowerCase() === 'openai';
            const isOllama = p.provider_name.toLowerCase() === 'ollama';

            const providerTitle = isGemini
              ? 'Google Gemini'
              : isOpenAI
              ? 'OpenAI'
              : 'Ollama (Local Runtime)';

            const badgeText = isGemini ? 'Primary' : isOpenAI ? 'Secondary' : 'Local';
            const badgeClass = isGemini
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : isOpenAI
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-purple-50 text-purple-700 border-purple-200';

            const description = isGemini
              ? 'High-quality reasoning for code analysis and patch generation.'
              : isOpenAI
              ? 'Reliable provider for diverse coding and security tasks.'
              : 'Run open-source models locally for privacy and offline analysis.';

            const leftBorder = isGemini
              ? 'border-l-4 border-l-blue-500'
              : isOpenAI
              ? 'border-l-4 border-l-emerald-500'
              : 'border-l-4 border-l-purple-500';

            const isEnabled = p.enabled ?? true;

            return (
              <div
                key={p.provider_name}
                className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all ${leftBorder}`}
              >
                {/* Upper Card Row */}
                <div className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    {/* Provider Custom Icon/Logo */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isGemini
                          ? 'bg-blue-50 text-blue-600'
                          : isOpenAI
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      {isGemini ? (
                        <Sparkles className="w-6 h-6" />
                      ) : isOpenAI ? (
                        <Shield className="w-6 h-6" />
                      ) : (
                        <Cpu className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <h3 className="text-base font-bold text-slate-900">{providerTitle}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 max-w-xl">{description}</p>
                    </div>
                  </div>

                  {/* Availability Status & Switch Toggle */}
                  <div className="flex items-center space-x-4 self-end md:self-center">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p.is_available ? 'bg-emerald-500' : 'bg-slate-300'
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        {p.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    {/* Enabled / Disabled Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleProvider(p)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                        isEnabled ? 'bg-blue-600' : 'bg-slate-200'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                          isEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Lower Card Bar — Strictly Masked & Zero Secret Leaks */}
                <div className="bg-slate-50/70 border-t border-slate-100 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-6 text-slate-600">
                    {/* Credential Masked Pill */}
                    <div className="flex items-center space-x-2">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-500">
                        {isOllama ? 'Model Name' : 'API Credentials'}
                      </span>
                      <span className="font-mono text-slate-400 text-sm tracking-wider">
                        ••••••••••••••••
                      </span>
                      <EyeOff className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    </div>

                    {/* Endpoint Masked Pill */}
                    <div className="flex items-center space-x-2">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-500">
                        {isOllama ? 'Base URL' : 'Endpoint'}
                      </span>
                      <span className="font-mono text-slate-400 text-sm tracking-wider">
                        ••••••••••••••••
                      </span>
                      <EyeOff className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                    </div>
                  </div>

                  {/* Configure Action Button */}
                  <button
                    onClick={() => handleOpenConfigure(p)}
                    className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-2xs hover:border-slate-300 self-end sm:self-auto"
                  >
                    <span>Configure</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Tab Content: Routing Settings */}
      {activeTab === 'routing' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Multi-Provider Routing &amp; Fallback Policy</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure priority order and automated failover when synthesizing unified diff patches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Primary Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Primary Reasoning Provider</label>
              <select
                value={routing.primary_provider}
                onChange={(e) => setRouting({ ...routing, primary_provider: e.target.value })}
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="gemini">Google Gemini (Default)</option>
                <option value="openai">OpenAI</option>
                <option value="ollama">Ollama Local</option>
              </select>
            </div>

            {/* Secondary Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Secondary Review Provider</label>
              <select
                value={routing.secondary_provider}
                onChange={(e) => setRouting({ ...routing, secondary_provider: e.target.value })}
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="openai">OpenAI (Default)</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama Local</option>
              </select>
            </div>

            {/* Fallback Provider */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Fallback Provider</label>
              <select
                value={routing.fallback_provider}
                onChange={(e) => setRouting({ ...routing, fallback_provider: e.target.value })}
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ollama">Ollama Local (Offline Fallback)</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Request Timeout (Seconds)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={routing.request_timeout_seconds}
                onChange={(e) => setRouting({ ...routing, request_timeout_seconds: parseInt(e.target.value) || 30 })}
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Retry Policy (Max Attempts)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={routing.retry_policy_max_retries}
                onChange={(e) => setRouting({ ...routing, retry_policy_max_retries: parseInt(e.target.value) || 3 })}
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Toggle Fallback */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Automatic Failover &amp; Fallback</div>
              <div className="text-[11px] text-slate-500">
                Automatically attempt secondary or local model if primary provider experiences rate limits or network timeout.
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setRouting({ ...routing, automatic_fallback_enabled: !routing.automatic_fallback_enabled })
              }
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                routing.automatic_fallback_enabled ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                  routing.automatic_fallback_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveRouting}
              disabled={isSavingConfig}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Save Routing Policy
            </button>
          </div>
        </div>
      )}

      {/* 6. Tab Content: Local Models */}
      {activeTab === 'local-models' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Local Runtime Models (Ollama)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dynamic inspection of locally installed models on the host machine.
              </p>
            </div>
            <button
              onClick={fetchAllData}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rescan Local Daemon</span>
            </button>
          </div>

          {localModels.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {localModels.map((m) => (
                <div key={m.name} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Database className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">{m.name}</div>
                      <div className="text-[11px] text-slate-400">Size: {m.size_gb} GB</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Installed
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{m.enabled ? 'Active Engine' : 'Standby'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-50 border border-slate-200/60 text-center space-y-2">
              <Server className="w-8 h-8 text-slate-400 mx-auto opacity-50" />
              <div className="text-xs font-semibold text-slate-700">No Local Ollama Models Detected</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Local runtime is optional. To enable offline inference, install Ollama and run <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">ollama pull gemma3:4b</code>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 7. Tab Content: Advanced */}
      {activeTab === 'advanced' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Advanced Engine Governance &amp; Security Validation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Deterministic AST checks, boundary enforcement, and execution timeout parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Deterministic AST Bounds Check</div>
                <div className="text-[11px] text-slate-500">
                  Enforces static AST verification before accepting synthesized patches.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAdvanced({ ...advanced, strict_bounds_enforcement: !advanced.strict_bounds_enforcement })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  advanced.strict_bounds_enforcement ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    advanced.strict_bounds_enforcement ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800">Prompt Response Caching</div>
                <div className="text-[11px] text-slate-500">
                  Enable deterministic cache replay for identical vulnerability code snippets.
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAdvanced({ ...advanced, cache_model_responses: !advanced.cache_model_responses })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  advanced.cache_model_responses ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    advanced.cache_model_responses ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-w-xs">
            <label className="text-xs font-semibold text-slate-700">Audit Log Verbosity</label>
            <select
              value={advanced.log_level}
              onChange={(e) => setAdvanced({ ...advanced, log_level: e.target.value })}
              className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="INFO">INFO (Standard Audit)</option>
              <option value="DEBUG">DEBUG (Detailed AST &amp; Diffs)</option>
              <option value="WARNING">WARNING (Only Alerts)</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveAdvanced}
              disabled={isSavingConfig}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Save Advanced Governance
            </button>
          </div>
        </div>
      )}

      {/* 8. Configuration Modal (Secure by Default) */}
      {modalOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Configure {selectedProvider.provider_name.toUpperCase()}
                  </h3>
                  <p className="text-[11px] text-slate-500">Update credentials and active model selection</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* API Key Input (Never Prefills Existing Secrets) */}
              {selectedProvider.provider_name.toLowerCase() !== 'ollama' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-700">New API Key / Token</label>
                    <span className="text-[10px] text-slate-400">Leave blank to retain current key</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="password"
                      placeholder="Enter new API key to replace existing..."
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Keys are stored securely on the server and are never returned to client browsers.
                  </p>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Model Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-mono"
                />
              </div>

              {/* Optional Custom Endpoint for Local / Private Proxy */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Custom Gateway Endpoint (Optional)</label>
                <input
                  type="text"
                  placeholder="https://... or http://localhost:11434"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:bg-white focus:border-blue-500 font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalConfig}
                disabled={isSavingConfig}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                {isSavingConfig ? 'Saving & Verifying...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
