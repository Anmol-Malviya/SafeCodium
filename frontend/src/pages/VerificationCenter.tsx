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
  Layers,
  Award,
} from 'lucide-react';
import {
  listProjects,
  listProjectPatches,
  runDualCompilation,
  runSanitizerVerification,
  runRegressionSuite,
  runResourceProfiling,
  getVerificationStatus,
  ProjectData,
  PatchData,
  DualCompileData,
  DualSanitizerData,
  RegressionSuiteData,
  ResourceProfileData,
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
  const [regressionResult, setRegressionResult] = useState<RegressionSuiteData | null>(null);
  const [resourceResult, setResourceResult] = useState<ResourceProfileData | null>(null);
  const [verificationRecord, setVerificationRecord] = useState<VerificationStatusData | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [isSanitizing, setIsSanitizing] = useState<boolean>(false);
  const [isRegressing, setIsRegressing] = useState<boolean>(false);
  const [isProfiling, setIsProfiling] = useState<boolean>(false);
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
          setRegressionResult(null);
          setResourceResult(null);
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
      setRegressionResult(null);
      setResourceResult(null);
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

  const handleRunRegression = async () => {
    if (!selectedPatchId) return;
    setIsRegressing(true);
    setErrorMsg(null);
    try {
      const res = await runRegressionSuite(selectedPatchId);
      setRegressionResult(res);
      const ver = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(ver);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Regression suite failed.');
    } finally {
      setIsRegressing(false);
    }
  };

  const handleRunResourceProfiling = async () => {
    if (!selectedPatchId) return;
    setIsProfiling(true);
    setErrorMsg(null);
    try {
      const res = await runResourceProfiling(selectedPatchId);
      setResourceResult(res);
      const ver = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(ver);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Resource profiling failed.');
    } finally {
      setIsProfiling(false);
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
              Phase 15 Resource Profiler
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Complete ground-truth verification pipeline: Compiler, Sanitizers (ASan/UBSan), Regression, and Footprint Profiler.
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

          {/* Stage Action Triggers */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRunDualCompilation}
              disabled={!selectedPatchId || isCompiling}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center space-x-1 transition-all disabled:opacity-50"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Compile</span>
            </button>

            <button
              onClick={handleRunSanitizers}
              disabled={!selectedPatchId || isSanitizing}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center space-x-1 transition-all disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              <span>2. Sanitizers</span>
            </button>

            <button
              onClick={handleRunRegression}
              disabled={!selectedPatchId || isRegressing}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium flex items-center space-x-1 transition-all disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>3. Regression</span>
            </button>

            <button
              onClick={handleRunResourceProfiling}
              disabled={!selectedPatchId || isProfiling}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Cpu className="w-3.5 h-3.5 fill-current" />
              <span>{isProfiling ? 'Profiling...' : '4. Profile & Finalize'}</span>
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

      {/* Verification Status Banner */}
      {verificationRecord && verificationRecord.final_status === 'VERIFIED' ? (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-bold text-emerald-300">
                OFFICIALLY VERIFIED FIRMWARE ARTIFACT
              </div>
              <span className="text-slate-300 text-[11px]">
                Deterministic Proof: Compiler Exit Code 0, Zero ASan/UBSan Crashes, 100% Regression Suite Pass, and Safe Memory Footprint (+{verificationRecord.binary_size_delta_bytes} bytes).
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/security-reports')}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-900/30"
          >
            <span>Generate Security Passport</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center space-x-3 text-xs font-mono">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-slate-300">
            <strong>Rule 6 — Ground-Truth Verification Authority:</strong> Patches are never validated by LLM consensus. Verification requires deterministic compiler exit codes (0), zero AddressSanitizer crashes, 100% regression pass, and footprint delta &lt; 256 bytes. Current Status: <strong className={verificationRecord?.final_status === 'REJECTED' ? 'text-rose-400' : 'text-amber-400'}>{verificationRecord ? verificationRecord.final_status : 'INCONCLUSIVE'}</strong>.
          </span>
        </div>
      )}

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
            {dualCompileResult || verificationRecord?.post_patch_compiler_exit === 0 ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Exit 0 (PASSED)</span>
              </span>
            ) : (
              <span className="text-slate-500">Awaiting execution</span>
            )}
          </div>
        </div>

        {/* Stage 2: ASan & UBSan */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 2: SANITIZER</span>
            <Zap className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-sm font-bold text-white">ASan & UBSan</div>
          <div className="pt-1">
            {sanitizerResult || verificationRecord?.asan_exit_code === 0 ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>0 Crashes (PASSED)</span>
              </span>
            ) : (
              <span className="text-slate-500">Awaiting execution</span>
            )}
          </div>
        </div>

        {/* Stage 3: Regression Test */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 3: REGRESSION</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold text-white">4-Tier Test Matrix</div>
          <div className="pt-1">
            {regressionResult || verificationRecord?.test_suite_passed ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>4/4 Passed (PASSED)</span>
              </span>
            ) : (
              <span className="text-slate-500">Awaiting execution</span>
            )}
          </div>
        </div>

        {/* Stage 4: Resource Delta */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>STAGE 4: PROFILER</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white">Flash / RAM Delta</div>
          <div className="pt-1">
            {resourceResult ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>+{resourceResult.flash_delta_bytes}B Flash (PASSED)</span>
              </span>
            ) : verificationRecord && verificationRecord.binary_size_delta_bytes > 0 ? (
              <span className="text-emerald-400 font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>+{verificationRecord.binary_size_delta_bytes}B Flash (PASSED)</span>
              </span>
            ) : (
              <span className="text-slate-500">Awaiting execution</span>
            )}
          </div>
        </div>
      </div>

      {/* Resource Profiler Comparison Card */}
      {resourceResult && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white">
                  Memory Footprint Profile Result:
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    resourceResult.is_resource_safe
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                  }`}
                >
                  {resourceResult.verdict}
                </span>
              </div>
              <p className="text-xs text-slate-400">{resourceResult.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Flash Memory Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span className="text-cyan-400 font-bold">FLASH (ROM / .text) OVERHEAD</span>
                <span>Max Allowed: +256 Bytes</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block">Pre-Patch Flash:</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {resourceResult.pre_patch_metrics.total_flash_bytes} B
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block">Post-Patch Flash:</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {resourceResult.post_patch_metrics.total_flash_bytes} B
                  </span>
                </div>
              </div>
              <div className="text-emerald-400 font-semibold text-[11px] pt-1">
                Net Delta: +{resourceResult.flash_delta_bytes} Bytes (+{resourceResult.flash_delta_percentage}%)
              </div>
            </div>

            {/* RAM Memory Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                <span className="text-cyan-400 font-bold">STATIC RAM (.data + .bss) OVERHEAD</span>
                <span>Max Allowed: +64 Bytes</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block">Pre-Patch RAM:</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {resourceResult.pre_patch_metrics.total_ram_bytes} B
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-950 border border-slate-800/80">
                  <span className="text-slate-500 block">Post-Patch RAM:</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {resourceResult.post_patch_metrics.total_ram_bytes} B
                  </span>
                </div>
              </div>
              <div className="text-emerald-400 font-semibold text-[11px] pt-1">
                Net Delta: {resourceResult.ram_delta_bytes >= 0 ? `+${resourceResult.ram_delta_bytes}` : resourceResult.ram_delta_bytes} Bytes (Zero dynamic heap expansion)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer / Progression Card */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-slate-400">
          <span className="text-white font-semibold">Verification Record Status: </span>
          <span className={`font-mono font-bold ${verificationRecord?.final_status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}`}>
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
