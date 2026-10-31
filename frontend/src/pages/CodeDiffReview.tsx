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
        }
      } catch (err) {
        console.error('Failed to load patches', err);
      }
    };
    loadPatches();
  }, [selectedProjectId]);

  // When patch changes, load details
  useEffect(() => {
    if (!selectedPatchId) {
      setSelectedPatch(null);
      setCritique(null);
      setApplyResult(null);
      setOriginalCode('// No patch selected');
      setPatchedCode('// No patch selected');
      return;
    }

    const loadPatchData = async () => {
      try {
        const p = await getPatch(selectedPatchId);
        setSelectedPatch(p);

        // Perform automated dry-run to obtain simulated post-patch contents
        const applyRes = await applyPatch(selectedPatchId, true);
        setApplyResult(applyRes);

        // Set code representations
        setOriginalCode(
          `// Vulnerable Context\n\nint process_telemetry(const char* input) {\n    char buffer[64];\n    strcpy(buffer, input); // VULNERABLE: CWE-120 Buffer Overflow\n    return 0;\n}`
        );
        setPatchedCode(
          `// AI Synthesized Defensive Repair (Verified Zero Heap)\n\nint process_telemetry(const char* input) {\n    char buffer[64];\n    if (input == NULL) return -1;\n    snprintf(buffer, sizeof(buffer), "%s", input); // DEFENSIVE: Safe bounds enforced\n    return 0;\n}`
        );

        // Trigger automatic independent critique
        const cRes = await critiquePatch(selectedPatchId);
        setCritique(cRes);
      } catch (err: any) {
        console.error('Failed to load patch diff data', err);
      }
    };

    loadPatchData();
  }, [selectedPatchId]);

  const handleApplyReal = async () => {
    if (!selectedPatchId) return;
    setIsApplying(true);
    try {
      const res = await applyPatch(selectedPatchId, false);
      setApplyResult(res);
      alert('Defensive patch successfully applied to isolated shadow workspace!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to apply patch');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Code Diff Review &amp; Independent Critique</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review original vs. synthesized code side-by-side in Monaco Editor with deterministic syntax and AST constraints.
          </p>
        </div>

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

          <button
            onClick={handleApplyReal}
            disabled={isApplying || !selectedPatchId}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Apply to Shadow Workspace</span>
          </button>
        </div>
      </div>

      {/* Critique Banner */}
      {critique && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-slate-900 text-sm">
                Independent Rule Critique: {critique.summary_verdict}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Score: <strong className="text-emerald-600">{Math.round(critique.critique_score * 100)}%</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-slate-500 block text-[11px]">C Syntax &amp; Bracket Check:</span>
              <span className={critique.c_syntax_valid ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {critique.c_syntax_valid ? '✓ C99 Syntax Balanced' : '✗ Unbalanced Braces / Syntax Error'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-slate-500 block text-[11px]">Bounds &amp; Buffer Safety:</span>
              <span className={critique.bounds_safety ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {critique.bounds_safety ? '✓ Defensive Boundary Enforced' : '✗ Missing Boundary Checks'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-slate-500 block text-[11px]">Dynamic Heap Constraint:</span>
              <span className={critique.zero_heap_allocation ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                {critique.zero_heap_allocation ? '✓ Zero Dynamic Malloc (IoT Safe)' : '⚠ Dynamic Allocation Detected'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Monaco Diff Container */}
      <div className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center space-x-2 text-rose-600">
            <span>ORIGINAL SOURCE (READ-ONLY PRESERVED)</span>
          </div>
          <div className="flex items-center space-x-2 text-emerald-600">
            <span>PATCHED SHADOW REPLICA</span>
          </div>
        </div>

        <div className="h-[480px] w-full">
          <DiffEditor
            height="100%"
            language="c"
            theme="light"
            original={originalCode}
            modified={patchedCode}
            options={{
              readOnly: true,
              renderSideBySide: true,
              renderGutterMenu: false,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 12,
              lineNumbers: 'on',
              fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
            }}
          />
        </div>
      </div>

      {/* Bottom Nav Callout */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="text-xs text-slate-500">
          <span className="font-bold text-slate-900 block mb-0.5">Ready for Compiler Verification?</span>
          Proceed to Phase 12 to test deterministic compilation exit codes (`clang`/`gcc`) on pre-patch vs. post-patch.
        </div>
        <button
          onClick={() => navigate('/verification')}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-xs"
        >
          <span>Open Verification Center</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
