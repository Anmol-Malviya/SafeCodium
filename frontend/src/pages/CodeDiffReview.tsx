import React from 'react';
import { GitCompare, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

export const CodeDiffReview: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Before / After Code Diff Review</h1>
          <p className="text-sm text-slate-400">
            Side-by-side unified diff inspection powered by Monaco Editor.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono flex items-center space-x-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject Patch</span>
          </button>
          <button className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-semibold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approve & Verify</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-slate-400">
            <span className="text-rose-400 font-bold">--- ORIGINAL (VULNERABLE)</span>
            <span>firmware_core.c:142</span>
          </div>
          <div className="p-4 bg-slate-950 text-slate-300 space-y-1 overflow-x-auto">
            <div className="text-slate-600">// Buffer copy without bounds check</div>
            <div className="text-slate-300">void handle_uart_rx(const uint8_t *stream, size_t len) &#123;</div>
            <div className="text-slate-300">    char buffer[64];</div>
            <div className="bg-rose-500/10 text-rose-300 px-1 py-0.5 rounded border border-rose-500/20">
              -    strcpy(buffer, (const char *)stream);
            </div>
            <div className="text-slate-300">    process_telemetry(buffer);</div>
            <div className="text-slate-300">&#125;</div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-slate-400">
            <span className="text-emerald-400 font-bold">+++ REPAIRED (DEFENSIVE BOUNDS)</span>
            <span>firmware_core.c:142</span>
          </div>
          <div className="p-4 bg-slate-950 text-slate-300 space-y-1 overflow-x-auto">
            <div className="text-slate-600">// Defensive bounds check with null termination</div>
            <div className="text-slate-300">void handle_uart_rx(const uint8_t *stream, size_t len) &#123;</div>
            <div className="text-slate-300">    char buffer[64];</div>
            <div className="bg-emerald-500/10 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/20">
              +    if (stream == NULL || len == 0) return;
            </div>
            <div className="bg-emerald-500/10 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/20">
              +    snprintf(buffer, sizeof(buffer), "%.*s", (int)(sizeof(buffer) - 1), (const char *)stream);
            </div>
            <div className="text-slate-300">    process_telemetry(buffer);</div>
            <div className="text-slate-300">&#125;</div>
          </div>
        </div>
      </div>
    </div>
  );
};
