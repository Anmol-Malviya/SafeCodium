import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Wrench,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  Layers,
  ArrowRight,
  Loader2,
  FilePlus,
  Zap
} from 'lucide-react';
import {
  sendVibeChatMessage,
  applyVibeChatPatch,
  VibeChatResponseData
} from '../../services/api';

interface VibeMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  data?: VibeChatResponseData;
  applied?: boolean;
}

interface VibeChatPanelProps {
  projectId: string;
  currentFilePath: string;
  currentCode: string;
  onCodeUpdated?: (newCode: string, targetPath?: string) => void;
  selectedProvider?: string;
}

export const VibeChatPanel: React.FC<VibeChatPanelProps> = ({
  projectId,
  currentFilePath,
  currentCode,
  onCodeUpdated,
  selectedProvider = 'gemini'
}) => {
  const [messages, setMessages] = useState<VibeMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 Hi! I'm your **SAFE-CODIUM Copilot**.\nTell me what to build or fix in this firmware codebase (e.g. *\"Create calculator.cpp\"*, *\"Fix buffer overflow in this file\"*, or *\"Add bounds checking\"*). Once approved, I will synthesize and create the verified code directly in your codebase!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const quickPrompts = [
    '✨ Create calculator.cpp in codebase',
    '🛡️ Fix memory vulnerabilities in this file',
    '⚡ Check buffer bounds & snprintf',
    '🔍 Add NULL guards before pointer dereferences',
  ];

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMsg: VibeMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const res = await sendVibeChatMessage({
        project_id: projectId,
        file_path: currentFilePath,
        code_snippet: currentCode,
        prompt: textToSend,
        provider: selectedProvider.toLowerCase()
      });

      const assistantMsg: VibeMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: res
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: VibeMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Error communicating with Copilot:** ${err?.response?.data?.detail || err.message || 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (msgId: string, data?: VibeChatResponseData) => {
    if (!data || (!data.repaired_code && !data.unified_diff)) return;

    try {
      const res = await applyVibeChatPatch({
        project_id: projectId,
        file_path: (data as any).target_file || currentFilePath,
        patched_code: data.repaired_code,
        unified_diff: data.unified_diff
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m))
      );

      if (data.repaired_code && onCodeUpdated) {
        onCodeUpdated(data.repaired_code, res.file_path || currentFilePath);
      }
    } catch (err: any) {
      alert(`Failed to apply code: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleCopy = (id: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-slate-800">
      {/* Header — Light VS Code Studio Matching Theme */}
      <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-tight flex items-center space-x-1.5">
              <span>SAFE-CODIUM COPILOT</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold">
                READY
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[210px]">
              Active: {currentFilePath || 'No file selected'}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 py-2 bg-[#FFFFFF] border-b border-[#E2E8F0] flex items-center space-x-2 overflow-x-auto no-scrollbar">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp)}
            disabled={isLoading || !projectId}
            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 whitespace-nowrap transition border border-slate-200 shadow-2xs disabled:opacity-40"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAFC]/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center space-x-1.5 mb-1 px-1">
              {m.sender === 'user' ? (
                <>
                  <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                  <span className="text-[11px] font-semibold text-blue-600">You</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white font-bold">
                    SC
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800">
                    Safe-Codium AI
                  </span>
                  <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                </>
              )}
            </div>

            <div
              className={`p-3.5 rounded-xl max-w-[94%] text-xs leading-relaxed shadow-xs transition-all ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none shadow-blue-500/10'
                  : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{m.text}</div>

              {/* Repaired Code / Unified Diff Approval Card */}
              {m.data?.has_patch && (
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-emerald-700 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {(m.data as any).target_file && (m.data as any).target_file !== currentFilePath
                          ? `New File: ${(m.data as any).target_file}`
                          : 'Synthesized Verified Code'}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        handleCopy(
                          m.id,
                          m.data?.repaired_code || m.data?.unified_diff
                        )
                      }
                      className="text-slate-400 hover:text-slate-700 flex items-center space-x-1"
                    >
                      {copiedId === m.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-[10px] text-emerald-600 font-semibold">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[10px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {m.data.unified_diff && (
                    <pre className="p-2.5 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 shadow-inner">
                      {m.data.unified_diff}
                    </pre>
                  )}

                  {m.data.repaired_code && !m.data.unified_diff && (
                    <pre className="p-2.5 rounded-lg bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 shadow-inner">
                      {m.data.repaired_code}
                    </pre>
                  )}

                  {/* Approve and Create in Codebase Action Button */}
                  <div className="pt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Verified: Updates live project codebase</span>
                    </span>
                    <button
                      onClick={() => handleApply(m.id, m.data)}
                      disabled={m.applied}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs ${
                        m.applied
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-default'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-98'
                      }`}
                    >
                      {m.applied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Created &amp; In Codebase</span>
                        </>
                      ) : (
                        <>
                          <FilePlus className="w-3.5 h-3.5" />
                          <span>Approve &amp; Create in Codebase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs py-2 px-1">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>SAFE-CODIUM Copilot is generating verified code...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form — Matches Light Theme */}
      <div className="p-3 bg-white border-t border-[#E2E8F0]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              projectId
                ? `Ask Copilot: "Create calculator.cpp" or "Fix error in this file"...`
                : 'Please select a project first...'
            }
            disabled={isLoading || !projectId}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !projectId}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow-xs disabled:opacity-50 active:scale-95"
            title="Send vibe instruction"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
