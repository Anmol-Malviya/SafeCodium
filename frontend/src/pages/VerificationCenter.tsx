import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Play,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  Award,
  Loader2,
  RefreshCw,
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
import { useProjectContext } from '../context/ProjectContext';

export const VerificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeProjectId,
    setActiveProjectId,
    selectedPatchId: contextPatchId,
    setSelectedPatchId: setContextPatchId,
    setCurrentStepIndex,
  } = useProjectContext();

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || '');
  const [patches, setPatches] = useState<PatchData[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<string>(contextPatchId || '');

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
  const [isVerifyingAll, setIsVerifyingAll] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync with activeProjectId from global context
  useEffect(() => {
    if (activeProjectId && activeProjectId !== selectedProjectId) {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  // Load projects list
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const res = await listProjects();
        setProjects(res);
        if (res.length > 0) {
          const initialId = activeProjectId && res.some((p) => p.id === activeProjectId) ? activeProjectId : res[0].id;
          setSelectedProjectId(initialId);
          setActiveProjectId(initialId);
        }
      } catch (err) {
        setErrorMsg('Failed to initialize projects.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // When project changes, fetch its patches
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
          const matchedPatch = contextPatchId && res.some((p) => p.id === contextPatchId) ? contextPatchId : res[0].id;
          setSelectedPatchId(matchedPatch);
          setContextPatchId(matchedPatch);
        } else {
          setSelectedPatchId('');
          setDualCompileResult(null);
          setSanitizerResult(null);
          setRegressionResult(null);
          setResourceResult(null);
          setVerificationRecord(null);
        }
      } catch (err) {
        console.error('Failed to load patches', err);
      }
    };
    loadPatches();
  }, [selectedProjectId]);

  // When patch changes, load existing verification status
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
        const status = await getVerificationStatus(selectedPatchId);
        setVerificationRecord(status);
      } catch (err) {
        // Record might not exist yet
      }
    };
    loadStatus();
  }, [selectedPatchId]);

  const handleRunCompile = async () => {
    if (!selectedPatchId) return;
    setIsCompiling(true);
    setErrorMsg(null);
    try {
      const res = await runDualCompilation(selectedPatchId);
      setDualCompileResult(res);
      const status = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(status);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Compilation harness failed.');
    } finally {
      setIsCompiling(false);
    }
  };

  const handleRunSanitizer = async () => {
    if (!selectedPatchId) return;
    setIsSanitizing(true);
    setErrorMsg(null);
    try {
      const res = await runSanitizerVerification(selectedPatchId);
      setSanitizerResult(res);
      const status = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(status);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Sanitizer execution failed.');
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
      const status = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(status);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Regression suite failed.');
    } finally {
      setIsRegressing(false);
    }
  };

  const handleRunProfiling = async () => {
    if (!selectedPatchId) return;
    setIsProfiling(true);
    setErrorMsg(null);
    try {
      const res = await runResourceProfiling(selectedPatchId);
      setResourceResult(res);
      const status = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(status);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Resource profiling failed.');
    } finally {
      setIsProfiling(false);
    }
  };

  const handleRunFullVerificationSuite = async () => {
    if (!selectedPatchId) return;
    setIsVerifyingAll(true);
    setErrorMsg(null);
    try {
      await runDualCompilation(selectedPatchId);
      await runSanitizerVerification(selectedPatchId);
      await runRegressionSuite(selectedPatchId);
      const prof = await runResourceProfiling(selectedPatchId);
      setResourceResult(prof);
      const status = await getVerificationStatus(selectedPatchId);
      setVerificationRecord(status);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || err.message || 'Verification pipeline encountered an error.');
    } finally {
      setIsVerifyingAll(false);
    }
  };

  const isVerified = verificationRecord?.final_status === 'VERIFIED';
  const isRejected = verificationRecord?.final_status === 'REJECTED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header and Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Step 5 of 6
            </span>
            <span className="text-xs font-semibold text-slate-500">Ground-Truth Oracle</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">Deterministic Verification</h1>
          <p className="text-xs text-slate-500">
            Dual compiler, ASan/UBSan runtimes, regression test matrix, and footprint profiling.
          </p>
        </div>

        {/* Project & Patch Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setActiveProjectId(e.target.value);
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs max-w-[200px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          {patches.length > 0 && (
            <select
              value={selectedPatchId}
              onChange={(e) => {
                setSelectedPatchId(e.target.value);
                setContextPatchId(e.target.value);
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800 shadow-2xs max-w-[220px] truncate"
            >
              {patches.map((p) => (
                <option key={p.id} value={p.id}>
                  Patch {p.id.substring(0, 8)} ({p.repair_strategy})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Status Banner with 1-Click Run All */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Verification Verdict
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isVerified
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isRejected
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {verificationRecord ? verificationRecord.final_status : 'INCONCLUSIVE'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isVerified
              ? 'All gates certified exit-code 0, zero runtime crashes, and resource budget compliance.'
              : 'Execute the 4 verification gates below to certify this patch deterministically.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunFullVerificationSuite}
            disabled={isVerifyingAll || !selectedPatchId}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 shadow-2xs"
          >
            {isVerifyingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Run All Gates</span>
          </button>

          {isVerified && (
            <button
              onClick={() => {
                setCurrentStepIndex(6);
                navigate('/reports');
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition shadow-2xs"
            >
              <Award className="w-3.5 h-3.5" />
              <span>View Passport</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Interactive Verification Harness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gate 1: Dual Compilation */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Gate 1: Dual Compiler Harness</span>
              </span>
              <span
                className={`text-[11px] font-bold ${
                  verificationRecord?.post_patch_compiler_exit === 0 ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {verificationRecord?.post_patch_compiler_exit === 0 ? '✓ PASSED' : 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Executes `clang -Wall -Wextra -Werror` on pre-patch vs post-patch sources to verify exit-code 0.
            </p>
          </div>

          <button
            onClick={handleRunCompile}
            disabled={isCompiling || !selectedPatchId}
            className="w-full py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            {isCompiling ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <Play className="w-3 h-3 text-indigo-600" />}
            <span>{isCompiling ? 'Compiling...' : 'Execute Compilation'}</span>
          </button>
        </div>

        {/* Gate 2: Runtime Sanitizers */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Gate 2: AddressSanitizer (ASan) & UBSan</span>
              </span>
              <span
                className={`text-[11px] font-bold ${
                  verificationRecord?.asan_exit_code === 0 ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {verificationRecord?.asan_exit_code === 0 ? '✓ PASSED' : 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Injects boundary inputs with `-fsanitize=address,undefined` to verify stack-overflow trapping and safety.
            </p>
          </div>

          <button
            onClick={handleRunSanitizer}
            disabled={isSanitizing || !selectedPatchId}
            className="w-full py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            {isSanitizing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <Play className="w-3 h-3 text-indigo-600" />}
            <span>{isSanitizing ? 'Running Sanitizer...' : 'Execute ASan/UBSan'}</span>
          </button>
        </div>

        {/* Gate 3: Functional Regression */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Gate 3: 4-Tier Regression Matrix</span>
              </span>
              <span
                className={`text-[11px] font-bold ${
                  verificationRecord?.test_suite_passed ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {verificationRecord?.test_suite_passed ? '✓ PASSED' : 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verifies Benign inputs, Boundary conditions, Exploit payloads, and Fault injections.
            </p>
          </div>

          <button
            onClick={handleRunRegression}
            disabled={isRegressing || !selectedPatchId}
            className="w-full py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            {isRegressing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <Play className="w-3 h-3 text-indigo-600" />}
            <span>{isRegressing ? 'Testing...' : 'Run Regression Matrix'}</span>
          </button>
        </div>

        {/* Gate 4: Resource Profiler */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span>Gate 4: Binary Footprint & RAM Delta</span>
              </span>
              <span
                className={`text-[11px] font-bold ${
                  resourceResult ? (resourceResult.is_resource_safe ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'
                }`}
              >
                {resourceResult ? (resourceResult.is_resource_safe ? '✓ SAFE' : 'EXCEEDED') : 'PENDING'}
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Guarantees Flash overhead does not exceed 256B and zero dynamic heap expansion in RAM.
            </p>
          </div>

          <button
            onClick={handleRunProfiling}
            disabled={isProfiling || !selectedPatchId}
            className="w-full py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            {isProfiling ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> : <Play className="w-3 h-3 text-indigo-600" />}
            <span>{isProfiling ? 'Profiling...' : 'Profile Binary Overhead'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
