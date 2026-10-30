import React from 'react';
import { ShieldAlert, Terminal, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

export const VerificationCenter: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Firmware Verification Center</h1>
        <p className="text-sm text-slate-400">
          Deterministic compiler verification, AddressSanitizer (ASan), UndefinedBehaviorSanitizer (UBSan), and regression fuzzing harnesses.
        </p>
      </div>

      {/* Protocol Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 text-xs font-mono">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="text-slate-300">
          Strict Verification Rule: Patches are only marked <strong className="text-emerald-400">VERIFIED</strong> upon passing exit-code verification (0), zero ASan crash reports, and zero test regressions. Otherwise marked <strong className="text-rose-400">REJECTED</strong> or <strong className="text-amber-400">INCONCLUSIVE</strong>.
        </span>
      </div>

      {/* Test Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>COMPILER STAGE</span>
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-white">Dual Clang/GCC</div>
          <p className="text-[11px] text-slate-500">Compares pre-patch exit code vs. post-patch compilation</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>SANITIZER STAGE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-white">ASan & UBSan</div>
          <p className="text-[11px] text-slate-500">Traps heap/stack overflow, memory corruption, NULL deref</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>REGRESSION STAGE</span>
            <Terminal className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-base font-bold text-white">Input Matrix</div>
          <p className="text-[11px] text-slate-500">Normal, boundary, malicious exploit, invalid pointer</p>
        </div>
      </div>

      {/* Live Console Output Placeholder */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs">
        <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <span className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verification Terminal Output</span>
          </span>
          <span className="text-slate-500">Target: Host Sandbox Harness</span>
        </div>
        <div className="p-4 text-slate-400 space-y-1">
          <div className="text-slate-600">[SAFEVIBE-VERIFY] Ready for test harness execution.</div>
          <div className="text-slate-600">[SAFEVIBE-VERIFY] Awaiting patch submission...</div>
        </div>
      </div>
    </div>
  );
};

