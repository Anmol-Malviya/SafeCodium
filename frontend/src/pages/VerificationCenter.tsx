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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Deterministic Verification Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Deterministic Ground-Truth Oracle (Rule 6): Dual compilation, ASan/UBSan runtimes, 4-tier functional regression, and binary footprint profiling.
          </p>
        </div>

        {/* Project & Patch Selectors */}
        <div className="flex items-center space-x-3">
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs"
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
              onChange={(e) => setSelectedPatchId(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs"
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
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verification Status Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              GROUND-TRUTH VERIFICATION VERDICT
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                verificationRecord?.final_status === 'VERIFIED'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : verificationRecord?.final_status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {verificationRecord ? verificationRecord.final_status : 'INCONCLUSIVE'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {verificationRecord?.final_status === 'VERIFIED'
              ? 'All 4 verification gates certified exit-code 0, 0 runtime crashes, and resource budget compliance.'
              : 'Execute the 4 deterministic verification stages below to certify the patch.'}
          </p>
        </div>

        {verificationRecord?.final_status === 'VERIFIED' && (
          <button
            onClick={() => navigate('/reports')}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-sm shadow-emerald-500/20"
          >
            <Award className="w-4 h-4" />
            <span>Generate Security Passport</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 4 Interactive Verification Harness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gate 1: Dual Compilation */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-blue-500" />
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
              Executes `clang -Wall -Wextra -Werror` on both pre-patch and post-patch source files to verify deterministic exit-code 0.
            </p>
          </div>

          <button
            onClick={handleRunCompile}
            disabled={isCompiling || !selectedPatchId}
            className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isCompiling ? 'Compiling Dual C Sources...' : 'Execute Dual Compilation'}</span>
          </button>
        </div>

        {/* Gate 2: Runtime Sanitizers */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                <span>Gate 2: AddressSanitizer (ASan) &amp; UBSan</span>
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
              Injects boundary inputs with `-fsanitize=address,undefined` to verify stack-overflow trapping and zero undefined behaviors.
            </p>
          </div>

          <button
            onClick={handleRunSanitizer}
            disabled={isSanitizing || !selectedPatchId}
            className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isSanitizing ? 'Running Sanitizer Harness...' : 'Execute ASan/UBSan Check'}</span>
          </button>
        </div>

        {/* Gate 3: Functional Regression */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
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
              Verifies Benign inputs, Boundary conditions, neutralized Exploit payloads, and Fault injection vectors with 100% pass criteria.
            </p>
          </div>

          <button
            onClick={handleRunRegression}
            disabled={isRegressing || !selectedPatchId}
            className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isRegressing ? 'Executing 4-Tier Matrix...' : 'Run Functional Regression'}</span>
          </button>
        </div>

        {/* Gate 4: Resource Profiler */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span>Gate 4: Binary Footprint &amp; RAM Delta</span>
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
              Ensures Flash footprint delta does not exceed 256 Bytes and guarantees zero dynamic heap expansion in microcontroller memory.
            </p>
          </div>

          <button
            onClick={handleRunProfiling}
            disabled={isProfiling || !selectedPatchId}
            className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isProfiling ? 'Measuring Footprint...' : 'Profile Binary Overhead'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
