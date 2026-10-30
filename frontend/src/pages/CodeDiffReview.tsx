import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiffEditor } from '@monaco-editor/react';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import {
  listProjects,
  listProjectPatches,
  getPatch,
  critiquePatch,
  applyPatch,
  ProjectData,
  PatchData,
  PatchCritiqueData,
  PatchApplyData,
} from '../services/api';

export const CodeDiffReview: React.FC = () => {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [patches, setPatches] = useState<PatchData[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<string>('');

  const [selectedPatch, setSelectedPatch] = useState<PatchData | null>(null);
  const [critique, setCritique] = useState<PatchCritiqueData | null>(null);
  const [applyResult, setApplyResult] = useState<PatchApplyData | null>(null);

  const [originalCode, setOriginalCode] = useState<string>('// Select a patch to load original code');
  const [patchedCode, setPatchedCode] = useState<string>('// Select a patch to review diff');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
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
        setErrorMsg('Failed to load projects');
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
          setSelectedPatch(null);
          setCritique(null);
          setApplyResult(null);
        }
      } catch (err) {
        setPatches([]);
      }
    };
    loadPatches();
  }, [selectedProjectId]);

  // When patch changes, fetch detail & dry run to populate diff editor
  useEffect(() => {
    if (!selectedPatchId) return;

    const loadPatchData = async () => {
      setErrorMsg(null);
      try {
        const p = await getPatch(selectedPatchId);
        setSelectedPatch(p);

        // Perform dry-run apply to get original vs patched full files
        const dry = await applyPatch(selectedPatchId, true);
        setApplyResult(dry);
        setOriginalCode(dry.original_code || '// Original source unavailable');
        setPatchedCode(dry.patched_code || '// Patched source preview');

        // Fetch independent critique
        const c = await critiquePatch(selectedPatchId);
        setCritique(c);
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.detail || 'Failed to inspect candidate patch.');
      }
    };
    loadPatchData();
  }, [selectedPatchId]);

  const handleApplyToShadow = async () => {
    if (!selectedPatchId) return;
    setIsApplying(true);
    setErrorMsg(null);
    try {
      const res = await applyPatch(selectedPatchId, false);
      setApplyResult(res);
      if (selectedPatch) {
        setSelectedPatch({ ...selectedPatch, status: 'APPLIED' });
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to write patch to shadow workspace.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <GitCompare className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Code Diff Review & Independent Critique</h1>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
              Phase 11 Reviewer
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Side-by-side Monaco Diff inspection with automated zero-heap, bounds safety & syntax critique.
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
            <span className="text-xs font-medium text-slate-400">Candidate Patch:</span>
            <select
              value={selectedPatchId}
              onChange={(e) => setSelectedPatchId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              {patches.length === 0 ? (
                <option value="">No patches generated yet</option>
              ) : (
                patches.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.id.substring(0, 8)}... ({pt.ai_provider.toUpperCase()} - {pt.status})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Controlled Application Action */}
          <button
            onClick={handleApplyToShadow}
            disabled={!selectedPatchId || isApplying || selectedPatch?.status === 'APPLIED'}
            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold flex items-center space-x-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{selectedPatch?.status === 'APPLIED' ? 'Applied in Shadow' : 'Apply to Shadow'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Independent Patch Critique Card */}
      {critique && (
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Independent Safety Critique</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  critique.summary_verdict === 'APPROVED'
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950/80 text-amber-400 border border-amber-800'
                }`}
              >
                VERDICT: {critique.summary_verdict}
              </span>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-slate-400">
                Critique Confidence:{' '}
                <strong className="text-cyan-400">{Math.round(critique.critique_score * 100)}%</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">C Syntax Balance:</span>
              <span className={critique.c_syntax_valid ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {critique.c_syntax_valid ? '✓ Balanced Braces & Parens' : '✗ Syntax Unbalanced'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Bounds Invariant:</span>
              <span className={critique.bounds_safety ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                {critique.bounds_safety ? '✓ Defensive Boundary Enforced' : '✗ Missing Boundary Checks'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-slate-400 block mb-1">Dynamic Heap Constraint:</span>
              <span className={critique.zero_heap_allocation ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                {critique.zero_heap_allocation ? '✓ Zero Dynamic Malloc (IoT Safe)' : '⚠ Dynamic Allocation Detected'}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-400 pt-1">
            <span className="font-semibold text-slate-300">Semantic Assessment: </span>
            <span>{critique.semantic_integrity}</span>
          </div>
        </div>
      )}

      {/* Monaco Side-by-Side Diff Editor Container */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2 text-rose-400 font-bold">
            <span>ORIGINAL (READ-ONLY PRESERVED)</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <span>PATCHED SHADOW REPLICA</span>
          </div>
        </div>

        <div className="h-[520px] w-full">
          <DiffEditor
            height="100%"
            language="c"
            theme="vs-dark"
            original={originalCode}
            modified={patchedCode}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              folding: true,
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            }}
          />
        </div>

        {/* Footer with Hunk Metrics */}
        {applyResult && (
          <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div>
              Target: <span className="text-slate-300">{applyResult.target_file}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>
                Hunks Applied:{' '}
                <strong className="text-emerald-400">
                  {applyResult.hunks_applied} / {applyResult.hunks_total}
                </strong>
              </span>
              <span className="text-cyan-400">
                Mode: {applyResult.is_dry_run ? 'DRY_RUN SIMULATION' : 'SHADOW WORKSPACE APPLIED'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Next Step Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-400">
          <span className="font-semibold text-slate-200 block mb-0.5">Ready for Compiler Verification?</span>
          Proceed to Phase 12 to test deterministic compilation exit codes (`clang`/`gcc`) on pre-patch vs. post-patch.
        </div>
        <button
          onClick={() => navigate('/verification')}
          className="px-3.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800/80 text-xs font-medium flex items-center space-x-1.5 transition-colors"
        >
          <span>Open Verification Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
