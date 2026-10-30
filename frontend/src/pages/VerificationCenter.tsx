import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Terminal,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Cpu,
  Play,
  RotateCcw,
  AlertTriangle,
  ArrowRight,
  Code2,
  FileCheck,
  Zap,
} from 'lucide-react';
import {
  listProjects,
  listProjectPatches,
  runDualCompilation,
  runSanitizerVerification,
  getVerificationStatus,
  ProjectData,
  PatchData,
  DualCompileData,
  DualSanitizerData,
  VerificationStatusData,
} from '../services/api';

export const VerificationCenter: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [patches, setPatches] = useState<PatchData[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<string>('');

  const [dualCompileResult, setDualCompileResult] = useState<DualCompileData | null>(null);
  const [sanitizerResult, setSanitizerResult] = useState<DualSanitizerData | null>(null);
  const [verificationRecord, setVerificationRecord] = useState<VerificationStatusData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSanitizing, setIsSanitizing] = useState<boolean>(false);
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
          setDualCompileResult(null);
          setSanitizerResult(null);
          setVerificationRecord(null);
        }
      } catch (err) {
        setPatches([]);
      }
    };
    loadPatches();
  }, [selectedProjectId]);

  // When patch changes, load existing verification record
  useEffect(() => {
    if (!selectedPatchId) {
      setDualCompileResult(null);
      setSanitizerResult(null);
      setVerificationRecord(null);
      return;
    }

    const loadStatus = async () => {
      try {
        const ver = await getVerificationStatus(selectedPatchId);
        setVerificationRecord(ver);
      } catch (err) {
        setVerificationRecord(null);
      }
    };
    loadStatus();
  }, [selectedPatchId]);

  const handleRunDualCompilation = async () => {
    if (!selectedPatchId) return;
    setIsCompiling(true);
    setErrorMsg(null);
    try {
      const res = await runDualCompilation(selectedPatchId);
      setDualCompileResult(res);
      const ver = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(ver);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Compilation verification failed.');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleRunSanitizers = async () => {
    if (!selectedPatchId) return;
    setIsSanitizing(true);
    setErrorMsg(null);
    try {
      const res = await runSanitizerVerification(selectedPatchId);
      setSanitizerResult(res);
      const ver = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(ver);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Sanitizer verification failed.');
    } finally {
      setIsSanitizing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Terminal className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Firmware Verification Center</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              Phase 13 ASan/UBSan
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Ground-truth compiler verification and runtime sanitizer memory crash trapping (ASan & UBSan).
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

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunDualCompilation}
              disabled={!selectedPatchId || isCompiling}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isCompiling ? 'Compiling...' : '1. Compile'}</span>
            </button>

            <button
              onClick={handleRunSanitizers}
              disabled={!selectedPatchId || isSanitizing}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{isSanitizing ? 'Sanitizing...' : '2. Run ASan & UBSan'}</span>
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

      {/* Strict Protocol Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 text-xs font-mono">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="text-slate-300">
          <strong>Rule 6 — Ground-Truth Verification Authority:</strong> Patches are never validated by LLM consensus. Verification requires deterministic compiler exit codes (0), zero AddressSanitizer crashes, and regression pass. Status remains <strong className="text-amber-400">INCONCLUSIVE</strong> until all stages finish.
        </span>
      </div>

      {/* Verification Stages Progression */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
        {/* Stage 1: Compiler */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 1: COMPILER</span>
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white">Dual GCC / Clang</div>
          <div className="pt-1">
            {dualCompileResult ? (
              dualCompileResult.compilation_passed ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Exit 0 (PASSED)</span>
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Exit {dualCompileResult.post_patch.exit_code} (FAILED)</span>
                </span>
              )
            ) : (
              <span className="text-slate-500">Awaiting execution</span>
            )}
          </div>
        </div>

        {/* Stage 2: ASan & UBSan */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 2: SANITIZER</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-white">ASan & UBSan</div>
          <div className="pt-1">
            {sanitizerResult ? (
              sanitizerResult.verification_passed ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>0 Crashes (VERIFIED)</span>
                </span>
              ) : (
                <span className="text-rose-400 font-bold flex items-center space-x-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Memory Crash (REJECTED)</span>
                </span>
              )
            ) : (
              <span className="text-slate-500">Awaiting execution</span>
            )}
          </div>
        </div>

        {/* Stage 3: Regression Test */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 opacity-75">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 3: REGRESSION</span>
            <Terminal className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold text-white">Functional Matrix</div>
          <p className="text-[11px] text-slate-500">Phase 14: Exploit vs Benign Inputs</p>
        </div>

        {/* Stage 4: Resource Delta */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 opacity-75">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 4: PROFILER</span>
            <Cpu className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-sm font-bold text-white">Flash / RAM Delta</div>
          <p className="text-[11px] text-slate-500">Phase 15: Binary Footprint Analyzer</p>
        </div>
      </div>

      {/* Sanitizer Crash & Neutralization Comparison Panel */}
      {sanitizerResult && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">
                  Sanitizer Verification Verdict:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    sanitizerResult.verification_passed
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                  }`}
                >
                  {sanitizerResult.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">{sanitizerResult.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Pre-Patch Sanitizer Report */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-rose-400 font-bold">PRE-PATCH ASAN / UBSAN TRAP</span>
                <span className="text-rose-400 font-bold text-[11px]">
                  {sanitizerResult.pre_patch_asan.crash_type || 'FAULT DETECTED'}
                </span>
              </div>
              <div className="p-4 bg-slate-950 space-y-2 max-h-[300px] overflow-y-auto">
                <pre className="font-mono text-[11px] text-rose-300 whitespace-pre-wrap leading-relaxed">
                  {sanitizerResult.pre_patch_asan.report_output}
                </pre>
              </div>
            </div>

            {/* Post-Patch Sanitizer Report */}
            <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-emerald-400 font-bold">POST-PATCH REPAIRED FIRMWARE</span>
                <span className="text-emerald-400 font-bold text-[11px]">
                  EXIT 0 (CLEAN MEMORY)
                </span>
              </div>
              <div className="p-4 bg-slate-950 space-y-2 max-h-[300px] overflow-y-auto">
                <pre className="font-mono text-[11px] text-emerald-300 whitespace-pre-wrap leading-relaxed">
                  {sanitizerResult.post_patch_asan.report_output}
                </pre>
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-slate-400 text-[11px] font-semibold mb-1">UndefinedBehaviorSanitizer:</div>
                  <pre className="font-mono text-[11px] text-emerald-400/90 whitespace-pre-wrap">
                    {sanitizerResult.post_patch_ubsan.report_output}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Progression Card */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-400">
          <span className="text-white font-semibold">Verification Record Status: </span>
          <span className="font-mono text-cyan-400 font-bold">
            {verificationRecord ? verificationRecord.final_status : 'NOT STARTED'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/code-diff')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            Back to Diff Review
          </button>
        </div>
      </div>
    </div>
  );
};
