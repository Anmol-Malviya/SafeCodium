import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bug,
  CheckCircle2,
  Wrench,
  ArrowUpRight,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  ArrowRight,
  Terminal,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboardAnalytics, FullPipelineDashboardData } from '../services/api';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<FullPipelineDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await getDashboardAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const kpis = data?.kpis || {
    total_projects: 0,
    total_scans: 0,
    total_vulnerabilities: 0,
    critical_vulnerabilities: 0,
    high_vulnerabilities: 0,
    total_patches_synthesized: 0,
    verified_patches: 0,
    rejection_rate_percentage: 0,
    verification_success_rate: 100,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-cyan-950/40 border border-slate-800 gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              Autonomous Cybersecurity Protocol — Phase 17
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Firmware Vulnerability Detection, Repair & Verification
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Detect memory vulnerabilities in IoT C/C++ firmware (CWE-120, CWE-787, CWE-476, CWE-416), synthesize defensive patches via Gemini AI, and certify fixes using deterministic dual-compiler ASan/UBSan harnesses.
          </p>
        </div>
        <Link
          to="/upload"
          className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm flex items-center space-x-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] shrink-0 self-start md:self-center"
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
          <div className="text-2xl font-bold text-white">{kpis.total_projects}</div>
          <div className="text-[11px] text-slate-500">{kpis.total_scans} static scans executed</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>DETECTED CWE FINDINGS</span>
            <Bug className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{kpis.total_vulnerabilities}</div>
          <div className="text-[11px] text-slate-500">
            {kpis.critical_vulnerabilities} Critical, {kpis.high_vulnerabilities} High
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>SYNTHESIZED PATCHES</span>
            <Wrench className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">{kpis.total_patches_synthesized}</div>
          <div className="text-[11px] text-slate-500">Defensive C diffs generated</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>VERIFIED PASS RATE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{kpis.verification_success_rate}%</div>
          <div className="text-[11px] text-slate-500">{kpis.verified_patches} artifacts verified</div>
        </div>
      </div>

      {/* End-to-End Visual Workflow Pipeline */}
      <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
              Autonomous 8-Step Firmware Pipeline
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-400">Strict Rule 6 Verification</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
          {[
            { step: '01', name: 'UPLOAD', path: '/upload', desc: 'Zip-Slip Defense' },
            { step: '02', name: 'ANALYZE', path: '/analysis', desc: 'Peripheral Taint' },
            { step: '03', name: 'DETECT', path: '/scanner', desc: 'AST + Semgrep' },
            { step: '04', name: 'REASON', path: '/scanner', desc: 'Gemini AI Root' },
            { step: '05', name: 'REPAIR', path: '/repair', desc: 'Safe Unified Diff' },
            { step: '06', name: 'REVIEW', path: '/code-diff', desc: 'Monaco Diff View' },
            { step: '07', name: 'VERIFY', path: '/verification', desc: 'Compiler + ASan' },
            { step: '08', name: 'PASSPORT', path: '/security-reports', desc: 'SHA-256 Chain' },
          ].map((s, idx) => (
            <Link
              key={idx}
              to={s.path}
              className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all space-y-1 block group"
            >
              <div className="text-[10px] text-cyan-400 font-bold">{s.step}</div>
              <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">{s.name}</div>
              <div className="text-[10px] text-slate-500 truncate">{s.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity & System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Audit Activity Feed</span>
            </span>
            <Link to="/history" className="text-xs text-cyan-400 hover:underline flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {(!data || data.recent_activity.length === 0) ? (
              <div className="text-slate-500 py-6 text-center italic">
                No recent activity logged. Upload a firmware archive to trigger automated analysis.
              </div>
            ) : (
              data.recent_activity.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <span className="text-white font-semibold">{act.title}</span>
                    <div className="text-[11px] text-slate-400 truncate max-w-md">{act.target}</div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        act.status === 'VERIFIED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                      }`}
                    >
                      {act.status}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {new Date(act.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hardware Status / Guardrails */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 font-mono text-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Host Environment Telemetry</span>
          </span>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">AI INFERENCE ENGINE</span>
              <span className="text-cyan-400 font-bold">Google Gemini 2.5 Flash</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Zero host GPU VRAM consumption</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">VERIFICATION AUTHORITY</span>
              <span className="text-emerald-400 font-bold">Clang / ASan / UBSan</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Deterministic exit-code oracle</p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80">
              <span className="text-slate-500 block text-[10px]">WORKSPACE ISOLATION</span>
              <span className="text-purple-400 font-bold">Shadow Workspaces</span>
              <p className="text-[10px] text-slate-400 mt-0.5">Original firmware read-only preserved</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
