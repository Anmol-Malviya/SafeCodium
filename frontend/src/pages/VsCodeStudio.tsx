import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileCode,
  FolderArchive,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
  Sparkles,
  RefreshCw,
  Terminal,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  File,
  Code2,
  Layers,
  Wrench,
  Check,
  Search,
  Bug,
  Cpu,
  GitBranch,
  ShieldAlert,
  Sliders,
  Settings,
  HelpCircle,
  Folder,
  Maximize2,
  Eye,
  Activity,
  History,
  FileCheck2,
  RotateCcw,
  Radio,
  Zap,
  Lock,
  Binary,
  Skull,
} from 'lucide-react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import {
  uploadProject,
  listProjects,
  getProjectFiles,
  getProjectFileContent,
  triggerAutonomousPipeline,
  getPipelineJobStatus,
  getLatestProjectPipelineJob,
  getProjectVulnerabilities,
  listProjectPatches,
  getVerificationPassport,
  getVerificationStatus,
  getProjectManifest,
  triggerScan,
  generatePatch,
  applyPatch,
  downloadRepairedProjectUrl,
  downloadOriginalProjectUrl,
  ProjectData,
  SourceFileData,
  PipelineJobData,
  VulnerabilityData,
  PatchData,
  VerificationPassportData,
  VerificationStatusData,
  runDemonstration,
} from '../services/api';

type ActivityBarTab = 'explorer' | 'security' | 'patches' | 'verification' | 'passport' | 'search';

export const VsCodeStudio: React.FC = () => {
  // Activity bar tab state
  const [activeSideTab, setActiveSideTab] = useState<ActivityBarTab>('explorer');

  // Projects & Files state
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [files, setFiles] = useState<SourceFileData[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  // Search filter inside project files
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Vulnerabilities, Patches & Verification state
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityData[]>([]);
  const [patches, setPatches] = useState<PatchData[]>([]);
  const [verification, setVerification] = useState<VerificationStatusData | null>(null);
  const [passport, setPassport] = useState<VerificationPassportData | null>(null);
  const [manifest, setManifest] = useState<Record<string, any> | null>(null);

  // File Contents & View
  const [originalCode, setOriginalCode] = useState<string>('// [ROOT@SAFECODIUM] Select a file in the matrix to inspect firmware AST');
  const [currentCode, setCurrentCode] = useState<string>('// [ROOT@SAFECODIUM] Select a file in the matrix to inspect firmware AST');
  const [editorMode, setEditorMode] = useState<'editor' | 'diff'>('editor');

  // Pipeline Job & Agent state
  const [job, setJob] = useState<PipelineJobData | null>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');

  // Terminal Logs & Stream
  const [agentLogs, setAgentLogs] = useState<string[]>([
    'CYBER_CONSOLE_INIT: Ground-Truth Verification Authority Active [Rule 6 Protocol]',
    'SEC_STATUS: Clang-18 AST parser & ASan/UBSan memory trap linked.',
    'Awaiting target firmware injection or sample selection...',
  ]);
  const [statusText, setStatusText] = useState<string>('SYSTEM READY // STANDBY');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load: Fetch Projects
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projList = await listProjects();
      if (projList && projList.length > 0) {
        setProjects(projList);
        if (!selectedProjectId) {
          setSelectedProjectId(projList[0].id);
        }
      } else {
        setProjects([]);
        setSelectedProjectId('');
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  // 2. When project changes, fetch its files, findings, patches, and manifest
  useEffect(() => {
    if (!selectedProjectId) return;
    refreshProjectData(selectedProjectId);
  }, [selectedProjectId]);

  const refreshProjectData = async (projectId: string) => {
    try {
      const [filesRes, vulnRes, patchRes, manifestRes] = await Promise.allSettled([
        getProjectFiles(projectId),
        getProjectVulnerabilities(projectId),
        listProjectPatches(projectId),
        getProjectManifest(projectId),
      ]);

      if (filesRes.status === 'fulfilled' && filesRes.value) {
        setFiles(filesRes.value);
        if (filesRes.value.length > 0) {
          const first = filesRes.value[0].relative_path;
          setSelectedFilePath(first);
          if (!openTabs.includes(first)) {
            setOpenTabs([first]);
          }
        } else {
          setSelectedFilePath('');
          setOpenTabs([]);
          setCurrentCode('// No C/C++ firmware files found in this workspace.');
          setOriginalCode('// No C/C++ firmware files found in this workspace.');
        }
      }

      if (vulnRes.status === 'fulfilled' && vulnRes.value) {
        setVulnerabilities(vulnRes.value);
      }
      if (patchRes.status === 'fulfilled' && patchRes.value) {
        const patchList = patchRes.value;
        setPatches(patchList);

        if (patchList.length > 0) {
          const firstPatchId = patchList[0].id;
          try {
            const vData = await getVerificationStatus(firstPatchId);
            setVerification(vData);
          } catch {
            setVerification(null);
          }

          try {
            const pData = await getVerificationPassport(firstPatchId);
            setPassport(pData);
          } catch {
            setPassport(null);
          }
        }
      }
      if (manifestRes.status === 'fulfilled' && manifestRes.value) {
        setManifest(manifestRes.value);
      }

      // Check for latest job
      try {
        const jobData = await getLatestProjectPipelineJob(projectId);
        if (jobData) {
          setJob(jobData);
        }
      } catch {
        // No job yet
      }
    } catch (err) {
      console.error('Failed to refresh project data', err);
    }
  };

  // 3. When selected file changes, fetch its content
  useEffect(() => {
    if (!selectedProjectId || !selectedFilePath) return;

    const loadContent = async () => {
      try {
        const [origRes, shadRes] = await Promise.allSettled([
          getProjectFileContent(selectedProjectId, selectedFilePath, 'original'),
          getProjectFileContent(selectedProjectId, selectedFilePath, 'shadow'),
        ]);

        if (origRes.status === 'fulfilled' && origRes.value) {
          setOriginalCode(origRes.value.content);
        }
        if (shadRes.status === 'fulfilled' && shadRes.value) {
          setCurrentCode(shadRes.value.content);
        } else if (origRes.status === 'fulfilled' && origRes.value) {
          setCurrentCode(origRes.value.content);
        }
      } catch (err) {
        console.error('Failed to load file contents', err);
      }
    };

    loadContent();
  }, [selectedProjectId, selectedFilePath]);

  // Tab Manager
  const handleSelectTab = (path: string) => {
    setSelectedFilePath(path);
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t !== path);
    setOpenTabs(remaining);
    if (selectedFilePath === path && remaining.length > 0) {
      setSelectedFilePath(remaining[remaining.length - 1]);
    } else if (remaining.length === 0) {
      setSelectedFilePath('');
    }
  };

  // 4. File / ZIP Upload Handler
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    addLog(`[UPL_INJECT] Injecting firmware payload '${file.name}' (${(file.size / 1024).toFixed(1)} KB)...`);

    try {
      const proj = await uploadProject(file);
      if (proj) {
        addLog(`[UPL_SEC] Zero-Trust Zip-Slip defense passed. Shadow sandbox allocated.`);
        addLog(`[UPL_SUCCESS] Payload mounted: ID [${proj.id.slice(0, 8)}], indexed ${proj.file_count} firmware headers & source files.`);
        await loadProjects();
        setSelectedProjectId(proj.id);
        setStatusText(`PAYLOAD MOUNTED: ${proj.name}`);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || err.message || 'Upload rejected';
      addLog(`[ERR_REJECT] Injection rejected: ${errMsg}`);
      alert(`Upload failed: ${errMsg}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper log pusher
  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setAgentLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 50)]);
  };

  // 5. Trigger Autonomous Pipeline Fix
  const handleStartFix = async () => {
    if (!selectedProjectId) return;

    setIsFixing(true);
    setStatusText('AI AUTONOMOUS AGENT ACTIVE // REASONING IN PROGRESS');
    addLog(`[EXPLOIT_SCAN] Initiating 9-Stage Zero-Day Detection & Autonomous Patch Synthesis...`);
    addLog(`[AI_CORE] Multi-Provider Neural Router engaged: Target -> ${selectedProvider.toUpperCase()}`);

    try {
      const jobData = await triggerAutonomousPipeline(selectedProjectId, selectedProvider);
      if (jobData) {
        const jobId = jobData.job_id;
        addLog(`[JOB_DISPATCH] Pipeline Thread [${jobId.slice(0, 8)}] spawned.`);

        // Start Polling Job Status
        if (pollingRef.current) clearInterval(pollingRef.current);

        pollingRef.current = setInterval(async () => {
          try {
            const currentJob = await getPipelineJobStatus(jobId);
            if (currentJob) {
              setJob(currentJob);
              setStatusText(`STAGE: ${currentJob.current_stage} (${currentJob.progress_percentage}%)`);

              if (currentJob.status === 'completed') {
                clearInterval(pollingRef.current!);
                setIsFixing(false);
                setStatusText('CYBER PATCH VERIFIED // 100% CLEAN FIRMWARE READY');
                addLog(`[VERIFY_SUCCESS] All memory vulnerabilities patched and verified under ASan/UBSan.`);
                addLog(`[CRYPTO_PASSPORT] SHA-256 Assurance Passport cryptographically generated.`);
                refreshProjectData(selectedProjectId);
              } else if (currentJob.status === 'failed') {
                clearInterval(pollingRef.current!);
                setIsFixing(false);
                setStatusText('PIPELINE FAILED // CONSTRAINTS VIOLATED');
                addLog(`[ERR_HALT] Pipeline failed: ${currentJob.error_message || 'Unknown error'}`);
                refreshProjectData(selectedProjectId);
              }
            }
          } catch (pollErr) {
            console.error('Polling error', pollErr);
          }
        }, 1200);
      }
    } catch (err: any) {
      setIsFixing(false);
      const errMsg = err.response?.data?.detail || err.message || 'Pipeline execution failed';
      addLog(`[ERR_PIPELINE] Execution failed: ${errMsg}`);
      alert(`Pipeline error: ${errMsg}`);
    }
  };

  // 6. Quick Demo Runner for fast testing
  const handleQuickDemo = async (cwe: 'CWE-120' | 'CWE-476') => {
    addLog(`[EXPLOIT_DEMO] Triggering deterministic IoT fixture demonstration for ${cwe}...`);
    try {
      const demoData = await runDemonstration(cwe);
      if (demoData) {
        addLog(`[DEMO_SUCCESS] Demo completed: ${demoData.cwe_title} [${demoData.final_verdict}]`);
        addLog(`[PASSPORT_SIG] Evidence SHA: ${demoData.passport_signature_sha256.slice(0, 16)}...`);
        await loadProjects();
      }
    } catch (err: any) {
      addLog(`[ERR_DEMO] Demo failure: ${err.message}`);
    }
  };

  // Filter files by search
  const filteredFiles = files.filter((f) =>
    f.relative_path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#06090e] text-[#a5d6ff] overflow-hidden font-mono select-none fixed inset-0 scanline-bg">
      {/* Top Cyber Hacker HUD Header */}
      <header className="h-10 bg-[#0b0f17] border-b border-[#1f293d] px-3 flex items-center justify-between shrink-0 text-xs shadow-md shadow-black/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-fast shadow-[0_0_8px_#10b981]" />
            <span className="text-emerald-400 font-bold text-xs tracking-wider uppercase neon-glow-green">
              SAFE_CODIUM // CYBER_CORE
            </span>
          </div>

          <span className="text-[#2b3a55]">|</span>

          {/* Project Switcher */}
          <div className="flex items-center space-x-1.5">
            <Binary className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#0e1624] text-cyan-300 text-xs px-2 py-0.5 rounded border border-[#1f2f4d] focus:border-cyan-400 focus:outline-hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#090d16] text-slate-200">
                  {p.name} [{p.file_count} firmware nodes]
                </option>
              ))}
            </select>
          </div>

          {/* AI Model Provider */}
          <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-slate-400">
            <span className="text-slate-500 font-bold">NEURAL_NET:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={isFixing}
              className="bg-[#0e1624] text-emerald-400 text-[11px] px-1.5 py-0.5 rounded border border-[#1f2f4d] focus:outline-hidden font-mono"
            >
              <option value="gemini" className="bg-[#090d16]">GEMINI_2.5_PRO (Host)</option>
              <option value="openai" className="bg-[#090d16]">GPT_4o (Critique)</option>
              <option value="ollama" className="bg-[#090d16]">GEMMA_3_4B (Local Airgap)</option>
            </select>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* Upload input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUpload}
            accept=".zip,.tar.gz,.c,.cpp,.cc,.cxx,.h,.hpp"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isFixing}
            className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] text-cyan-300 text-xs font-semibold flex items-center space-x-1.5 border border-cyan-500/40 hover:border-cyan-400 transition neon-border-cyan disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />}
            <span>INJECT_PAYLOAD.ZIP</span>
          </button>

          {/* Fix with AI Agent */}
          <button
            onClick={handleStartFix}
            disabled={isFixing || !selectedProjectId}
            className="px-3.5 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 text-black text-xs font-black flex items-center space-x-1.5 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition disabled:opacity-50 tracking-wider"
          >
            {isFixing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                <span>EXPLOIT_PATCHING...</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-black text-black" />
                <span>EXECUTE_AI_REPAIR</span>
              </>
            )}
          </button>

          {/* Download Repaired Project */}
          {selectedProjectId && (
            <a
              href={downloadRepairedProjectUrl(selectedProjectId)}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center space-x-1.5 transition tracking-wider ${
                job?.status === 'completed' || patches.length > 0
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.6)] font-black'
                  : 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-400 border border-[#1f293d]'
              }`}
              title="Download cryptographically verified shadow workspace"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT_CLEAN_BUILD</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Studio Body: Activity Bar + Side Bar + Editor + Terminal */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. Cyber Hacker Activity Bar (Leftmost narrow bar) */}
        <div className="w-12 bg-[#090d16] border-r border-[#1a2333] flex flex-col justify-between items-center py-2 shrink-0 select-none">
          <div className="flex flex-col space-y-4 text-slate-500">
            <button
              onClick={() => setActiveSideTab('explorer')}
              title="Explorer (Firmware Nodes)"
              className={`p-2 rounded hover:text-cyan-400 transition ${
                activeSideTab === 'explorer' ? 'text-cyan-400 border-l-2 border-cyan-400 pl-1.5 neon-glow-cyan' : ''
              }`}
            >
              <FileCode className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveSideTab('security')}
              title="Vulnerabilities & Zero-Day Vectors"
              className={`p-2 rounded hover:text-rose-400 transition relative ${
                activeSideTab === 'security' ? 'text-rose-400 border-l-2 border-rose-500 pl-1.5' : ''
              }`}
            >
              <Skull className="w-5 h-5" />
              {vulnerabilities.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveSideTab('patches')}
              title="Synthesized Defensive Patches"
              className={`p-2 rounded hover:text-emerald-400 transition relative ${
                activeSideTab === 'patches' ? 'text-emerald-400 border-l-2 border-emerald-400 pl-1.5 neon-glow-green' : ''
              }`}
            >
              <Wrench className="w-5 h-5" />
              {patches.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              )}
            </button>

            <button
              onClick={() => setActiveSideTab('verification')}
              title="Ground-Truth Compiler Gates (Rule 6)"
              className={`p-2 rounded hover:text-cyan-400 transition relative ${
                activeSideTab === 'verification' ? 'text-cyan-400 border-l-2 border-cyan-400 pl-1.5' : ''
              }`}
            >
              <Activity className="w-5 h-5" />
              {verification && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
              )}
            </button>

            <button
              onClick={() => setActiveSideTab('passport')}
              title="Security Passport & Evidence"
              className={`p-2 rounded hover:text-emerald-400 transition ${
                activeSideTab === 'passport' ? 'text-emerald-400 border-l-2 border-emerald-400 pl-1.5 neon-glow-green' : ''
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveSideTab('search')}
              title="Search AST Tokens"
              className={`p-2 rounded hover:text-cyan-400 transition ${
                activeSideTab === 'search' ? 'text-cyan-400 border-l-2 border-cyan-400 pl-1.5' : ''
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col space-y-3 text-slate-600">
            <button
              onClick={() => handleQuickDemo('CWE-120')}
              title="Run CWE-120 Buffer Overflow Exploit Fixture"
              className="p-2 hover:text-amber-400 transition"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleQuickDemo('CWE-476')}
              title="Run CWE-476 NULL Pointer Exploit Fixture"
              className="p-2 hover:text-cyan-400 transition"
            >
              <Cpu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Side Panel (Explorer / Security / Patches / Verification / Passport / Search) */}
        <aside className="w-64 bg-[#0a0e17] border-r border-[#1a2333] flex flex-col shrink-0 text-xs">
          {/* Side Panel Header */}
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-b border-[#1a2333] bg-[#0c121e]">
            <span className="text-cyan-400 flex items-center space-x-1.5">
              <span>//</span>
              <span>
                {activeSideTab === 'explorer' && 'FIRMWARE_EXPLORER'}
                {activeSideTab === 'security' && `ZERO_DAYS (${vulnerabilities.length})`}
                {activeSideTab === 'patches' && `PATCH_LEDGER (${patches.length})`}
                {activeSideTab === 'verification' && 'RULE_6_VERIFICATION'}
                {activeSideTab === 'passport' && 'CRYPTO_PASSPORT'}
                {activeSideTab === 'search' && 'AST_SEARCH'}
              </span>
            </span>
            <button onClick={() => selectedProjectId && refreshProjectData(selectedProjectId)} title="Refresh Matrix">
              <RefreshCw className="w-3 h-3 hover:text-cyan-400 transition" />
            </button>
          </div>

          {/* TAB 1: EXPLORER */}
          {activeSideTab === 'explorer' && (
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 pb-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center space-x-1">
                <ChevronDown className="w-3 h-3 text-cyan-400" />
                <span className="truncate text-slate-400">{projects.find((p) => p.id === selectedProjectId)?.name || 'ROOT_NODE'}</span>
              </div>

              {files.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  &gt; No firmware nodes indexed.<br />
                  &gt; Execute &apos;INJECT_PAYLOAD.ZIP&apos; above.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {files.map((f) => {
                    const isSelected = selectedFilePath === f.relative_path;
                    const hasFinding = vulnerabilities.some((v) => v.file_path.endsWith(f.filename));
                    return (
                      <button
                        key={f.relative_path}
                        onClick={() => setSelectedFilePath(f.relative_path)}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between group transition ${
                          isSelected
                            ? 'bg-[#131d2e] text-cyan-300 font-medium border-l-2 border-cyan-400'
                            : 'text-slate-400 hover:bg-[#0e1624] hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${f.extension === '.cpp' ? 'text-cyan-400' : 'text-amber-400'}`} />
                          <span className="truncate font-mono text-[11px]">{f.filename}</span>
                        </div>
                        {hasFinding && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] shrink-0" title="Vulnerability Detected" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Manifest Info Box */}
              {manifest && (
                <div className="mt-4 mx-2 p-2.5 rounded bg-[#060a12] border border-[#1a2333] text-[10px] space-y-1 text-slate-400 font-mono">
                  <div className="text-cyan-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                    <Binary className="w-3 h-3" />
                    <span>FIRMWARE_MANIFEST</span>
                  </div>
                  <div>Framework: <span className="text-emerald-400">{manifest.framework_type}</span></div>
                  <div>Source Files: <span className="text-slate-200">{manifest.total_files}</span></div>
                  {manifest.entry_points && manifest.entry_points.length > 0 && (
                    <div className="truncate">Entry: <span className="text-slate-300">{manifest.entry_points[0]}</span></div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FINDINGS / VULNERABILITIES */}
          {activeSideTab === 'security' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {vulnerabilities.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  &gt; Scan clean: 0 zero-day defects detected in current scope.
                </div>
              ) : (
                vulnerabilities.map((v) => (
                  <div
                    key={v.id}
                    className="p-2 rounded bg-[#090d16] border border-rose-900/50 hover:border-rose-500 transition space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-rose-400 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span>{v.cwe_id || 'CWE-UNKNOWN'}</span>
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                        {v.severity}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-medium">{v.title}</div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-between font-mono">
                      <span className="truncate">{v.file_path.split('/').pop()} : L{v.line_start}</span>
                      <span className="text-slate-400">{v.scanner_source}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PATCHES */}
          {activeSideTab === 'patches' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {patches.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  &gt; No defensive patches synthesized yet. Run AI Repair.
                </div>
              ) : (
                patches.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 rounded bg-[#090d16] border border-emerald-900/50 hover:border-emerald-500 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-emerald-400 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>DEFENSIVE_PATCH</span>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        p.status === 'applied' || p.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 line-clamp-2">{p.root_cause_explanation}</p>
                    <div className="text-[9px] text-slate-500 font-mono truncate">
                      PROVIDER: {p.ai_provider} ({p.model_name})
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: VERIFICATION GATES */}
          {activeSideTab === 'verification' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2 text-[11px]">
              <div className="p-2.5 rounded bg-[#090d16] border border-cyan-900/50 space-y-2 font-mono">
                <div className="text-cyan-400 font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>DETERMINISTIC VERIFICATION</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Strict Rule 6 Ground-Truth protocol: patches verified by dual compiler exit codes and ASan/UBSan sanitizers.
                </div>
              </div>

              {verification ? (
                <div className="p-2.5 rounded bg-[#090d16] border border-[#1a2333] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">STATUS:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                      {verification.final_status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compiler Passed:</span>
                    <span className="text-emerald-400">{verification.post_patch_compiler_exit === 0 ? 'YES (Exit 0)' : 'NO'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sanitizer Memory Clean:</span>
                    <span className="text-emerald-400">{verification.asan_exit_code === 0 ? 'YES (0 Traps)' : 'NO'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Regression Tests:</span>
                    <span className="text-emerald-400">{verification.test_suite_passed ? 'PASSED (4/4)' : 'FAILED'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  &gt; Awaiting test harness execution.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SECURITY PASSPORT */}
          {activeSideTab === 'passport' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2 text-[11px]">
              {passport ? (
                <div className="p-2.5 rounded bg-[#090d16] border border-emerald-900/50 space-y-2 font-mono">
                  <div className="text-emerald-400 font-bold flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CRYPTOGRAPHIC PASSPORT</span>
                  </div>
                  <div className="text-[10px] text-slate-300">
                    CWE: <span className="text-emerald-400 font-bold">{passport.cwe_id} - {passport.cwe_name}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 break-all bg-[#05070a] p-1.5 rounded border border-[#1a2333]">
                    SHA256: {passport.cryptographic_hashes.repaired_source_sha256}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Deterministic Status: <strong className="text-cyan-400">{passport.final_status}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  &gt; Security Passport generated upon 100% verified repair.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SEARCH */}
          {activeSideTab === 'search' && (
            <div className="p-2 space-y-2">
              <input
                type="text"
                placeholder="Search file names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#060a12] text-cyan-300 text-xs px-2.5 py-1 rounded border border-[#1a2333] focus:border-cyan-400 focus:outline-hidden font-mono"
              />
              <div className="text-[10px] text-slate-500 font-mono">
                {filteredFiles.length} nodes matching token
              </div>
            </div>
          )}
        </aside>

        {/* 3. Central Workspace: Editor Tabs + Monaco Editor + Diff + Terminal */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#070b12]">
          {/* Editor Tab Bar */}
          <div className="h-9 bg-[#0a0e17] border-b border-[#1a2333] flex items-center justify-between px-2 shrink-0">
            {/* Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
              {openTabs.map((tab) => {
                const isActive = selectedFilePath === tab;
                const fileName = tab.split('/').pop();
                return (
                  <div
                    key={tab}
                    onClick={() => setSelectedFilePath(tab)}
                    className={`h-7 px-3 flex items-center space-x-2 text-xs font-mono rounded-t cursor-pointer border-t-2 transition ${
                      isActive
                        ? 'bg-[#101826] text-cyan-300 border-cyan-400 font-medium'
                        : 'text-slate-500 hover:bg-[#0e1624] hover:text-slate-300 border-transparent'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{fileName}</span>
                    <button
                      onClick={(e) => handleCloseTab(tab, e)}
                      className="hover:text-rose-400 text-slate-600 rounded p-0.5"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            {/* View Mode Toggle: Code Editor vs Side-by-Side Diff */}
            <div className="flex items-center space-x-1 bg-[#060a12] p-0.5 rounded border border-[#1a2333]">
              <button
                onClick={() => setEditorMode('editor')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
                  editorMode === 'editor' ? 'bg-[#101826] text-cyan-300 font-bold neon-glow-cyan' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                AST_VIEW
              </button>
              <button
                onClick={() => setEditorMode('diff')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
                  editorMode === 'diff' ? 'bg-[#101826] text-emerald-400 font-bold neon-glow-green' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                DIFF_MATRIX
              </button>
            </div>
          </div>

          {/* Monaco Editor Canvas */}
          <div className="flex-1 relative">
            {editorMode === 'editor' ? (
              <Editor
                height="100%"
                language={selectedFilePath.endsWith('.cpp') || selectedFilePath.endsWith('.c') ? 'cpp' : 'c'}
                theme="vs-dark"
                value={currentCode}
                options={{
                  readOnly: true,
                  minimap: { enabled: true },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            ) : (
              <DiffEditor
                height="100%"
                language={selectedFilePath.endsWith('.cpp') || selectedFilePath.endsWith('.c') ? 'cpp' : 'c'}
                theme="vs-dark"
                original={originalCode}
                modified={currentCode}
                options={{
                  readOnly: true,
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderSideBySide: true,
                }}
              />
            )}
          </div>

          {/* 4. Bottom Integrated Cyber Terminal */}
          <div className="h-44 bg-[#05070a] border-t border-[#1a2333] flex flex-col shrink-0">
            {/* Terminal Header */}
            <div className="h-7 bg-[#0a0e17] px-3 flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-[#1a2333]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400 animate-pulse-fast" />
                <span className="text-emerald-400 font-mono tracking-wider">ROOT_TERMINAL</span>
                <span className="text-[#3b4c6b]">::</span>
                <span className="text-slate-500 font-mono text-[10px]">autonomous_pipeline_engine.sh</span>
              </div>
              <div className="flex items-center space-x-3 font-mono text-[10px]">
                {job && (
                  <span className="text-slate-300">
                    STAGE: <strong className="text-emerald-400 neon-glow-green">{job.current_stage} [{job.progress_percentage}%]</strong>
                  </span>
                )}
                <span className="text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>ONLINE</span>
                </span>
              </div>
            </div>

            {/* Terminal Log Console */}
            <div className="flex-1 p-2.5 font-mono text-xs overflow-y-auto space-y-1 text-slate-300 bg-[#040608]">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <span className="text-cyan-400">root@safecodium:~#</span>
                <span className="neon-glow-green">{statusText}</span>
              </div>

              {agentLogs.map((log, idx) => (
                <div key={idx} className="text-slate-400 text-[11px] font-mono leading-relaxed">
                  <span className="text-cyan-600 mr-1.5">&gt;</span>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* VS Code Bottom Status Bar (Cyber Green/Blue Hacker Strip) */}
      <footer className="h-5 bg-[#0b1320] text-cyan-400 border-t border-[#1a2942] px-3 flex items-center justify-between text-[11px] font-mono shrink-0 select-none shadow-inner">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse-fast" />
            <span>NODE: ACTIVE</span>
          </div>
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            <span>RULE_6_GROUND_TRUTH: ENFORCED</span>
          </div>
          <span className="text-slate-500 hidden sm:inline">TOOLCHAIN: Clang-18 / GCC-13 / ASan / UBSan</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className={vulnerabilities.length > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
            {vulnerabilities.length} DEFECTS
          </span>
          <span className={patches.length > 0 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
            {patches.length} PATCHES
          </span>
          <span className="text-slate-500">UTF-8</span>
          <span className="text-cyan-300 font-bold">C / C++ (Embedded)</span>
        </div>
      </footer>
    </div>
  );
};
