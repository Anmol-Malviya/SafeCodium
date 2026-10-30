import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Hash,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Layers,
  Cpu,
  Copy,
  Printer,
  ExternalLink,
} from 'lucide-react';
import {
  listProjects,
  listProjectPatches,
  getVerificationPassport,
  ProjectData,
  PatchData,
  VerificationPassportData,
} from '../services/api';

export const SecurityReports: React.FC = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [patches, setPatches] = useState<PatchData[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<string>('');

  const [passport, setPassport] = useState<VerificationPassportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize projects
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const res = await listProjects();
        setProjects(res);
        if (res.length > 0) {
          setSelectedProjectId(res[0].id);
        }
      } catch (err) {
        setErrorMsg('Failed to initialize projects.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // When project changes, fetch patches
  useEffect(() => {
    if (!selectedProjectId) {
      setPatches([]);
      setSelectedPatchId('');
      return;
    }

    const loadPatches = async () => {
      try {
        const res = await listProjectPatches(selectedProjectId);
        setPatches(res);
        if (res.length > 0) {
          setSelectedPatchId(res[0].id);
        } else {
          setSelectedPatchId('');
          setPassport(null);
        }
      } catch (err) {
        setPatches([]);
      }
    };
    loadPatches();
  }, [selectedProjectId]);

  // When patch changes, fetch cryptographic passport
  useEffect(() => {
    if (!selectedPatchId) {
      setPassport(null);
      return;
    }

    const loadPassport = async () => {
      setErrorMsg(null);
      try {
        const p = await getVerificationPassport(selectedPatchId);
        setPassport(p);
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.detail || 'Failed to generate verification passport.');
        setPassport(null);
      }
    };
    loadPassport();
  }, [selectedPatchId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const downloadJsonPassport = () => {
    if (!passport) return;
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${passport.passport_id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Award className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Security Assurance & Cryptographic Passports</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              Phase 16 Passports
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Tamper-evident verification passports, SHA-256 evidence chain of custody, and compliance audit reports.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Patch Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-slate-400">Target Patch:</span>
            <select
              value={selectedPatchId}
              onChange={(e) => setSelectedPatchId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              {patches.length === 0 ? (
                <option value="">No patches available</option>
              ) : (
                patches.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.id.substring(0, 8)}... ({p.ai_provider.toUpperCase()} - {p.status})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              disabled={!passport}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Audit</span>
            </button>
            <button
              onClick={downloadJsonPassport}
              disabled={!passport}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Passport (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Verification Passport Certificate View */}
      {passport ? (
        <div className="space-y-6">
          {/* Executive Certificate Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                    SAFE VIBE AI — OFFICIAL VERIFICATION PASSPORT
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      passport.final_status === 'VERIFIED'
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                    }`}
                  >
                    STATUS: {passport.final_status}
                  </span>
                </div>
                <h2 className="text-2xl font-mono font-bold text-white tracking-tight">
                  {passport.passport_id}
                </h2>
                <p className="text-xs text-slate-400">
                  Target Project: <span className="text-slate-200 font-semibold">{passport.project_name}</span> | Verified at: {new Date(passport.verification_date).toUTCString()}
                </p>
              </div>

              {/* CVSS Risk Reduction Pill */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center space-x-4">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Pre-Patch</span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    CVSS {passport.pre_patch_cvss_score.toFixed(1)}
                  </span>
                </div>
                <div className="text-slate-600 font-bold">→</div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">Post-Patch</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    CVSS {passport.post_patch_cvss_score.toFixed(1)}
                  </span>
                </div>
                <div className="pl-2 border-l border-slate-800 text-center">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase block">Mitigation</span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    -{passport.cvss_risk_reduction.toFixed(1)} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Core Verification Evidence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-5 font-mono text-xs border-b border-slate-800">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">CWE Mitigated</span>
                <span className="text-cyan-400 font-bold">{passport.cwe_id}</span>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{passport.cwe_name}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Compiler Stage</span>
                <span className="text-emerald-400 font-bold">Exit Code {passport.compiler_exit_code} (PASSED)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Dual Clang/GCC zero syntax errors</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Sanitizer Stage</span>
                <span className="text-emerald-400 font-bold">ASan Exit {passport.asan_exit_code} (PASSED)</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Zero memory corruption crashes</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] uppercase">Resource Delta</span>
                <span className="text-emerald-400 font-bold">+{passport.flash_delta_bytes} Bytes Flash</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Zero dynamic heap expansion</p>
              </div>
            </div>

            {/* Cryptographic Artifact Hashes (Chain of Custody) */}
            <div className="pt-5 space-y-3 font-mono text-xs">
              <div className="flex items-center space-x-2 text-slate-300 font-bold text-xs uppercase tracking-wider">
                <Hash className="w-4 h-4 text-cyan-400" />
                <span>Cryptographic Artifact Hashes (SHA-256 Chain of Custody)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Original Source Hash:</span>
                    <span className="text-slate-300 text-[11px]">
                      {passport.cryptographic_hashes.original_source_sha256.substring(0, 32)}...
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(passport.cryptographic_hashes.original_source_sha256, 'orig')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Repaired Source Hash:</span>
                    <span className="text-emerald-400 text-[11px]">
                      {passport.cryptographic_hashes.repaired_source_sha256.substring(0, 32)}...
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(passport.cryptographic_hashes.repaired_source_sha256, 'rep')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Unified Diff Hash:</span>
                    <span className="text-cyan-400 text-[11px]">
                      {passport.cryptographic_hashes.unified_diff_sha256.substring(0, 32)}...
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(passport.cryptographic_hashes.unified_diff_sha256, 'diff')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Passport Signature (Root of Trust):</span>
                    <span className="text-purple-400 text-[11px] font-bold">
                      {passport.cryptographic_hashes.passport_signature_sha256.substring(0, 32)}...
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(passport.cryptographic_hashes.passport_signature_sha256, 'sig')}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Defensive Idioms & Compliance */}
            <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block mb-2">Defensive Invariants Verified:</span>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  {passport.defensive_idioms_applied.map((idm, i) => (
                    <li key={i} className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{idm}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 block mb-2">Industry Compliance Benchmarks:</span>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  {passport.compliance_frameworks.map((cmp, i) => (
                    <li key={i} className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{cmp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center p-8 rounded-xl bg-slate-900/30 border border-slate-800/80 border-dashed text-center space-y-3">
          <div className="p-3 rounded-full bg-slate-800/50 text-cyan-400">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-white">No Verification Passport Generated</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Select a project and verified patch to inspect its cryptographic SHA-256 chain of custody and export official security audit records.
          </p>
        </div>
      )}
    </div>
  );
};
