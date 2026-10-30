import React from 'react';
import { ShieldCheck, Bug, CheckCircle2, Wrench, ArrowUpRight, Cpu, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Autonomous Cybersecurity Protocol
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Firmware Vulnerability Detection, Repair & Verification
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Detect memory vulnerabilities in IoT C/C++ firmware (CWE-120, CWE-787, CWE-476, CWE-416), synthesize defensive patches via Gemini AI, and certify fixes using dual-compiler ASan/UBSan harnesses.
          </p>
        </div>
        <Link
          to="/upload"
          className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center space-x-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0"
        >
          <span>Upload Firmware</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>ACTIVE PROJECTS</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">0</div>
          <div className="text-[11px] text-slate-500">Firmware codebases ingested</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>DETECTED CWE FINDINGS</span>
            <Bug className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">0</div>
          <div className="text-[11px] text-slate-500">Buffer overflow, UAF, NULL derefs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SYNTHESIZED PATCHES</span>
            <Wrench className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">0</div>
          <div className="text-[11px] text-slate-500">AI context-aware diffs</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>VERIFIED PASSPORTS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">0</div>
          <div className="text-[11px] text-slate-500">Compiler & ASan verified fixes</div>
        </div>
      </div>

      {/* Workflow Quick Launcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <h3 className="font-semibold text-white text-base flex items-center space-x-2">
            <span className="w-6 h-6 rounded bg-cyan-950 text-cyan-400 flex items-center justify-center text-xs font-mono">1</span>
            <span>Static Ingestion & Scanner</span>
          </h3>
          <p className="text-sm text-slate-400">
            Upload ZIP archives or single C/C++ files. Automatic recognition of ESP-IDF hardware APIs and register taint tracking.
          </p>
          <Link to="/upload" className="inline-flex text-xs font-mono text-cyan-400 hover:text-cyan-300 items-center space-x-1">
            <span>Launch Ingestion Pipeline &rarr;</span>
          </Link>
        </div>

        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <h3 className="font-semibold text-white text-base flex items-center space-x-2">
            <span className="w-6 h-6 rounded bg-purple-950 text-purple-400 flex items-center justify-center text-xs font-mono">2</span>
            <span>AI Reasoning & Repair Studio</span>
          </h3>
          <p className="text-sm text-slate-400">
            Provider-agnostic AI synthesizer (Gemini API, OpenAI, Gemma 3) generating secure boundary patches and root-cause explanations.
          </p>
          <Link to="/repair" className="inline-flex text-xs font-mono text-purple-400 hover:text-purple-300 items-center space-x-1">
            <span>Open AI Repair Studio &rarr;</span>
          </Link>
        </div>

        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <h3 className="font-semibold text-white text-base flex items-center space-x-2">
            <span className="w-6 h-6 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center text-xs font-mono">3</span>
            <span>Independent Verification</span>
          </h3>
          <p className="text-sm text-slate-400">
            Pre vs. post patch dual compilation, AddressSanitizer and UndefinedBehaviorSanitizer execution, regression fuzzing.
          </p>
          <Link to="/verification" className="inline-flex text-xs font-mono text-emerald-400 hover:text-emerald-300 items-center space-x-1">
            <span>View Verification Center &rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

