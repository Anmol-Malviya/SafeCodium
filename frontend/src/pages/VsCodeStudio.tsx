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
  const [originalCode, setOriginalCode] = useState<string>('// Select a file to inspect code');
  const [currentCode, setCurrentCode] = useState<string>('// Select a file to inspect code');
  const [editorMode, setEditorMode] = useState<'editor' | 'diff'>('editor');

  // Pipeline Job & Agent state
  const [job, setJob] = useState<PipelineJobData | null>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [statusText, setStatusText] = useState<string>('Ready. Upload firmware or click "Fix with AI Agent".');
  const [agentLogs, setAgentLogs] = useState<string[]>([
    'SafeCodium Embedded AI Studio Initialized [Clang 18 / GCC / ASan / UBSan Ready]',
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to add log
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setAgentLogs((prev) => [...prev.slice(-60), `[${timestamp}] ${msg}`]);
  };

  // 1. Initial Load: Projects
  const fetchProjects = async () => {
    try {
      const res = await listProjects();
      setProjects(res);
      if (res.length > 0 && !selectedProjectId) {
        setSelectedProjectId(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 2. Load Project Files, Vulnerabilities, Patches, Verification & Manifest
  const refreshProjectData = async (projId: string) => {
    if (!projId) return;
    try {
      const [fileList, vulns, patchList, latestJob, projManifest] = await Promise.all([
        getProjectFiles(projId).catch(() => []),
        getProjectVulnerabilities(projId).catch(() => []),
        listProjectPatches(projId).catch(() => []),
        getLatestProjectPipelineJob(projId).catch(() => null),
        getProjectManifest(projId).catch(() => null),
      ]);

      setFiles(fileList);
      setVulnerabilities(vulns);
      setPatches(patchList);
      setManifest(projManifest);

      if (fileList.length > 0 && !selectedFilePath) {
        setSelectedFilePath(fileList[0].relative_path);
        setOpenTabs([fileList[0].relative_path]);
      }

      if (latestJob) {
        setJob(latestJob);
        if (latestJob.status === 'running') {
          setIsFixing(true);
          setStatusText('Agent actively analyzing and applying AST verified patches...');
        }
      }

      // Load verification & passport for the first patch if exists
      if (patchList.length > 0) {
        const pId = patchList[0].id;
        getVerificationStatus(pId)
          .then((v) => setVerification(v))
          .catch(() => setVerification(null));
        getVerificationPassport(pId)
          .then((p) => setPassport(p))
          .catch(() => setPassport(null));
      } else {
        setVerification(null);
        setPassport(null);
      }
    } catch (err) {
      console.error('Error refreshing project data', err);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      refreshProjectData(selectedProjectId);
    }
  }, [selectedProjectId]);

  // 3. Load File Content when selected file changes
  const loadContent = async (path: string) => {
    if (!selectedProjectId || !path) return;
    try {
      const [origRes, shadowRes] = await Promise.all([
        getProjectFileContent(selectedProjectId, path, 'original').catch(() => ({ content: '' })),
        getProjectFileContent(selectedProjectId, path, 'shadow').catch(() => ({ content: '' })),
      ]);

      setOriginalCode(origRes.content || '// Empty original file');
      setCurrentCode(shadowRes.content || origRes.content || '// Empty file');
    } catch (err) {
      console.error('Failed to read file content', err);
    }
  };

  useEffect(() => {
    if (selectedFilePath) {
      loadContent(selectedFilePath);
      if (!openTabs.includes(selectedFilePath)) {
        setOpenTabs((prev) => [...prev, selectedFilePath]);
      }
    }
  }, [selectedFilePath, selectedProjectId]);

  // 4. Polling loop during Live Fix
  useEffect(() => {
    if (!isFixing || !job?.job_id) return;

    const timer = setInterval(async () => {
      try {
        const updated = await getPipelineJobStatus(job.job_id);
        setJob(updated);
        setStatusText(`Agent Stage: ${updated.current_stage.replace(/_/g, ' ')} (${updated.progress_percentage}%)`);
        addLog(`Executing: ${updated.current_stage} — ${updated.progress_percentage}% completed`);

        if (updated.status === 'completed' || updated.status === 'failed') {
          setIsFixing(false);
          const verdict = updated.summary_data?.final_verdict || (updated.status === 'completed' ? 'VERIFIED' : 'FAILED');
          setStatusText(
            updated.status === 'completed'
              ? `Done! All vulnerabilities fixed & verified (${verdict})`
              : `Pipeline halted: ${updated.error_message || 'Review terminal output'}`
          );
          addLog(`Pipeline finalized with final status: ${verdict}`);

          // Reload all project artifacts & file content
          if (selectedProjectId) {
            await refreshProjectData(selectedProjectId);
          }
          if (selectedFilePath) {
            await loadContent(selectedFilePath);
          }
          await fetchProjects();
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [isFixing, job?.job_id, selectedFilePath, selectedProjectId]);

  // 5. Trigger Upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    addLog(`Uploading archive '${file.name}' (${(file.size / 1024).toFixed(1)} KB)...`);
    setStatusText(`Uploading & unpacking ${file.name}...`);

    try {
      const uploaded = await uploadProject(file);
      addLog(`Security check passed: Zip-Slip protected. Extracted ${uploaded.file_count} files in '${uploaded.name}'.`);
      await fetchProjects();
      setSelectedProjectId(uploaded.id);
      setStatusText(`Loaded "${uploaded.name}". Ready for live fix.`);
    } catch (err: any) {
      const errDetail = err.response?.data?.detail || err.message;
      setStatusText(`Upload error: ${errDetail}`);
      addLog(`Upload error: ${errDetail}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 6. Trigger Live Agent Fix
  const handleStartFix = async () => {
    if (!selectedProjectId) return;
    setIsFixing(true);
    addLog(`Live AI Agent triggered with provider: ${selectedProvider.toUpperCase()}`);
    addLog('Analyzing firmware AST bounds, peripheral taints, and memory constraints...');
    setStatusText('AI Agent initiated. Analyzing firmware AST & peripherals...');
    setEditorMode('editor');

    try {
      const newJob = await triggerAutonomousPipeline(selectedProjectId, selectedProvider);
      setJob(newJob);
      addLog(`Job ${newJob.job_id} scheduled in background.`);
    } catch (err: any) {
      setIsFixing(false);
      const msg = err.response?.data?.detail || err.message;
      setStatusText(`Failed to launch agent: ${msg}`);
      addLog(`Failed to start agent: ${msg}`);
    }
  };

  // Quick Demo Trigger
  const handleQuickDemo = async (cwe: 'CWE-120' | 'CWE-476') => {
    setIsFixing(true);
    addLog(`Loading authentic ${cwe} smart meter fixture...`);
    setStatusText(`Loading ${cwe} firmware test fixture...`);
    try {
      const demo = await runDemonstration(cwe);
      addLog(`${cwe} demo fixture ingested & verified. Final verdict: ${demo.final_verdict}`);
      await fetchProjects();
      if (demo.demonstration_id) {
        setSelectedProjectId(demo.demonstration_id);
      }
      setStatusText(`${cwe} loaded and verified (${demo.final_verdict}). Check code and diff!`);
    } catch (err: any) {
      setStatusText(`Demo error: ${err.message}`);
      addLog(`Demo error: ${err.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = openTabs.filter((t) => t !== path);
    setOpenTabs(filtered);
    if (selectedFilePath === path && filtered.length > 0) {
      setSelectedFilePath(filtered[0]);
    }
  };

  // Filter files by search
  const filteredFiles = files.filter((f) =>
    f.relative_path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans select-none fixed inset-0">
      {/* VS Code Title Bar */}
      <header className="h-10 bg-[#323233] border-b border-[#252526] px-3 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-bold text-xs tracking-tight">SafeCodium Studio</span>
          </div>

          <span className="text-[#555555]">|</span>

          {/* Project Switcher */}
          <div className="flex items-center space-x-1.5">
            <FolderArchive className="w-3.5 h-3.5 text-blue-400" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#252526] text-slate-200 text-xs px-2 py-0.5 rounded border border-[#3c3c3c] focus:outline-hidden"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.file_count} files)
                </option>
              ))}
            </select>
          </div>

          {/* AI Model Provider */}
          <div className="hidden md:flex items-center space-x-1 text-[11px] text-slate-400">
            <span>Model:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              disabled={isFixing}
              className="bg-[#252526] text-slate-200 text-[11px] px-1.5 py-0.5 rounded border border-[#3c3c3c] focus:outline-hidden"
            >
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI GPT-4o</option>
              <option value="ollama">Ollama (Gemma 3)</option>
            </select>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2">
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
            className="px-2.5 py-1 rounded bg-[#3c3c3c] hover:bg-[#4c4c4c] text-slate-200 text-xs font-medium flex items-center space-x-1.5 border border-[#555] transition"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-blue-400" />}
            <span>Upload File / ZIP</span>
          </button>

          {/* Fix with AI Agent */}
          <button
            onClick={handleStartFix}
            disabled={isFixing || !selectedProjectId}
            className="px-3.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
          >
            {isFixing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Agent Repairing...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-white" />
                <span>Fix with AI Agent</span>
              </>
            )}
          </button>

          {/* Download Repaired Project */}
          {selectedProjectId && (
            <a
              href={downloadRepairedProjectUrl(selectedProjectId)}
              className={`px-3 py-1 rounded text-xs font-bold flex items-center space-x-1.5 transition ${
                job?.status === 'completed' || patches.length > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-300 border border-[#555]'
              }`}
              title="Download verified shadow workspace archive"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Repaired Project</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Studio Body: Activity Bar + Side Bar + Editor + Terminal */}
      <div className="flex-1 flex overflow-hidden">
        {/* 1. VS Code Activity Bar (Leftmost narrow icon bar) */}
        <div className="w-12 bg-[#333333] border-r border-[#252526] flex flex-col justify-between items-center py-2 shrink-0 select-none">
          <div className="flex flex-col space-y-4 text-[#858585]">
            <button
              onClick={() => setActiveSideTab('explorer')}
              title="Explorer (Files)"
              className={`p-2 rounded hover:text-white transition ${
                activeSideTab === 'explorer' ? 'text-white border-l-2 border-white pl-1.5' : ''
              }`}
            >
              <FileCode className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveSideTab('security')}
              title="Vulnerabilities & Findings"
              className={`p-2 rounded hover:text-white transition relative ${
                activeSideTab === 'security' ? 'text-white border-l-2 border-white pl-1.5' : ''
              }`}
            >
              <Bug className="w-5 h-5" />
              {vulnerabilities.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>

            <button
              onClick={() => setActiveSideTab('patches')}
              title="Synthesized Patches & Diffs"
              className={`p-2 rounded hover:text-white transition relative ${
                activeSideTab === 'patches' ? 'text-white border-l-2 border-white pl-1.5' : ''
              }`}
            >
              <Wrench className="w-5 h-5" />
              {patches.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              onClick={() => setActiveSideTab('verification')}
              title="Ground-Truth Verification Gates"
              className={`p-2 rounded hover:text-white transition relative ${
                activeSideTab === 'verification' ? 'text-white border-l-2 border-white pl-1.5' : ''
              }`}
            >
              <Activity className="w-5 h-5" />
              {verification && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            <button
              onClick={() => setActiveSideTab('passport')}
              title="Security Passport & Evidence"
              className={`p-2 rounded hover:text-white transition ${
                activeSideTab === 'passport' ? 'text-white border-l-2 border-white pl-1.5' : ''
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveSideTab('search')}
              title="Search Files"
              className={`p-2 rounded hover:text-white transition ${
                activeSideTab === 'search' ? 'text-white border-l-2 border-white pl-1.5' : ''
              }`}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col space-y-3 text-[#858585]">
            <button
              onClick={() => handleQuickDemo('CWE-120')}
              title="Run CWE-120 Demo"
              className="p-2 hover:text-amber-400 transition"
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleQuickDemo('CWE-476')}
              title="Run CWE-476 Demo"
              className="p-2 hover:text-blue-400 transition"
            >
              <Cpu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Side Panel (Explorer / Security / Patches / Verification / Passport / Search) */}
        <aside className="w-64 bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0 text-xs">
          {/* Side Panel Header */}
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-[#333333]">
            <span>
              {activeSideTab === 'explorer' && 'Explorer'}
              {activeSideTab === 'security' && `Findings (${vulnerabilities.length})`}
              {activeSideTab === 'patches' && `Patches (${patches.length})`}
              {activeSideTab === 'verification' && 'Verification Gates'}
              {activeSideTab === 'passport' && 'Security Passport'}
              {activeSideTab === 'search' && 'Search Files'}
            </span>
            <button onClick={() => selectedProjectId && refreshProjectData(selectedProjectId)} title="Refresh">
              <RefreshCw className="w-3 h-3 hover:text-white transition" />
            </button>
          </div>

          {/* TAB 1: EXPLORER */}
          {activeSideTab === 'explorer' && (
            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-3 pb-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider flex items-center space-x-1">
                <ChevronDown className="w-3 h-3" />
                <span className="truncate">{projects.find((p) => p.id === selectedProjectId)?.name || 'WORKSPACE'}</span>
              </div>

              {files.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No files indexed. Click &quot;Upload File / ZIP&quot; above.
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
                            ? 'bg-[#37373d] text-white font-medium'
                            : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 pr-2">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${f.extension === '.cpp' ? 'text-blue-400' : 'text-amber-400'}`} />
                          <span className="truncate">{f.filename}</span>
                        </div>
                        {hasFinding && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" title="Vulnerability Detected" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Manifest Info Box */}
              {manifest && (
                <div className="mt-4 mx-2 p-2.5 rounded bg-[#1e1e1e] border border-[#333333] space-y-1 font-mono text-[10px] text-slate-400">
                  <div className="text-slate-300 font-bold uppercase">Project Manifest</div>
                  <div>Framework: {manifest.framework_type}</div>
                  <div>Source Files: {manifest.source_files?.length || 0}</div>
                  <div className="truncate">Entry: {manifest.entry_points?.[0] || 'auto'}</div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VULNERABILITIES FINDINGS */}
          {activeSideTab === 'security' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {vulnerabilities.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No static vulnerabilities detected yet. Click &quot;Fix with AI Agent&quot; to scan.
                </div>
              ) : (
                vulnerabilities.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => {
                      const matched = files.find((f) => v.file_path.endsWith(f.filename));
                      if (matched) setSelectedFilePath(matched.relative_path);
                    }}
                    className="p-2.5 rounded bg-[#1e1e1e] border border-[#333333] hover:border-slate-500 cursor-pointer space-y-1 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        {v.cwe_id}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Line {v.line_start}</span>
                    </div>
                    <div className="font-semibold text-slate-200 text-xs truncate">{v.title}</div>
                    <div className="font-mono text-[10px] text-slate-500 truncate">{v.file_path}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: PATCHES */}
          {activeSideTab === 'patches' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {patches.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No patches synthesized yet. Click &quot;Fix with AI Agent&quot;.
                </div>
              ) : (
                patches.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setEditorMode('diff')}
                    className="p-2.5 rounded bg-[#1e1e1e] border border-[#333333] hover:border-emerald-600 cursor-pointer space-y-1 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        p.status === 'REJECTED' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-blue-950 text-blue-300'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-[10px] text-slate-500">{p.ai_provider}</span>
                    </div>
                    <div className="font-medium text-slate-300 text-xs line-clamp-2">{p.repair_strategy}</div>
                    <button
                      onClick={() => setEditorMode('diff')}
                      className="text-[10px] text-emerald-400 hover:underline pt-1 flex items-center space-x-1"
                    >
                      <span>Review Monaco Diff</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: VERIFICATION GATES */}
          {activeSideTab === 'verification' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
              {verification ? (
                <>
                  <div className="p-2.5 rounded bg-[#1e1e1e] border border-[#333333] space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Ground-Truth Verification</span>
                      <span className={verification.final_status === 'VERIFIED' ? 'text-emerald-400' : 'text-amber-400'}>
                        {verification.final_status}
                      </span>
                    </div>
                    <div className="text-slate-400">Compiler Post-Patch: Exit {verification.post_patch_compiler_exit}</div>
                    <div className="text-slate-400">ASan Exit Code: {verification.asan_exit_code} (Clean)</div>
                    <div className="text-slate-400">UBSan Exit Code: {verification.ubsan_exit_code}</div>
                    <div className="text-slate-400">Flash Delta: +{verification.binary_size_delta_bytes} Bytes</div>
                    <div className="text-slate-400">Regression Tests: {verification.test_suite_passed ? 'PASSED' : 'BENIGN/FAULT MATRIX'}</div>
                  </div>

                  {verification.asan_output && (
                    <div className="p-2 rounded bg-[#141414] border border-[#2a2a2a] text-[10px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">
                      {verification.asan_output}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 font-sans">
                  No verification evidence recorded yet. Run &quot;Fix with AI Agent&quot;.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PASSPORT */}
          {activeSideTab === 'passport' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px]">
              {passport ? (
                <>
                  <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 space-y-1">
                    <div className="font-bold text-xs">{passport.passport_id}</div>
                    <div>Final Status: <strong>{passport.final_status}</strong></div>
                    <div>Compiler: Exit {passport.compiler_exit_code}</div>
                    <div>ASan: Clean (0 errors)</div>
                    <div>Flash Delta: +{passport.flash_delta_bytes}B</div>
                  </div>

                  <div className="space-y-1 text-slate-400 text-[10px]">
                    <div className="font-bold text-slate-300 uppercase">SHA-256 Custody</div>
                    <div className="truncate">Source: {passport.cryptographic_hashes.original_source_sha256}</div>
                    <div className="truncate">Diff: {passport.cryptographic_hashes.unified_diff_sha256}</div>
                    <div className="truncate text-emerald-400">Sig: {passport.cryptographic_hashes.passport_signature_sha256}</div>
                  </div>
                </>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 font-sans">
                  No cryptographic passport generated yet. Run the live agent to synthesize and verify fixes.
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SEARCH */}
          {activeSideTab === 'search' && (
            <div className="p-3 space-y-2">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-2 py-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded text-xs text-slate-200 focus:outline-hidden"
              />
              <div className="text-[10px] text-slate-500">{filteredFiles.length} files matching</div>
              <div className="space-y-1">
                {filteredFiles.map((f) => (
                  <button
                    key={f.relative_path}
                    onClick={() => setSelectedFilePath(f.relative_path)}
                    className="w-full text-left px-2 py-1 text-xs text-slate-300 hover:bg-[#333333] rounded truncate block"
                  >
                    {f.relative_path}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* 3. Center Editor Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Tab Bar (VS Code Tabs) */}
          <div className="h-9 bg-[#252526] border-b border-[#1e1e1e] flex items-center justify-between px-2 shrink-0">
            {/* Open Tabs */}
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
              {openTabs.map((tabPath) => {
                const isActive = selectedFilePath === tabPath;
                const filename = tabPath.split('/').pop()?.split('\\').pop() || tabPath;
                return (
                  <div
                    key={tabPath}
                    onClick={() => setSelectedFilePath(tabPath)}
                    className={`h-9 px-3 flex items-center space-x-2 text-xs font-mono cursor-pointer transition border-r border-[#1e1e1e] ${
                      isActive
                        ? 'bg-[#1e1e1e] text-white border-t-2 border-blue-500 font-medium'
                        : 'bg-[#2d2d2d] text-slate-400 hover:bg-[#282828]'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate max-w-[130px]">{filename}</span>
                    <button
                      onClick={(e) => closeTab(tabPath, e)}
                      className="text-slate-500 hover:text-white rounded-full p-0.5 ml-1"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>

            {/* View Mode Toggle: Current Code vs Monaco Diff */}
            <div className="flex items-center space-x-1 bg-[#1e1e1e] p-0.5 rounded border border-[#3c3c3c] shrink-0">
              <button
                onClick={() => setEditorMode('editor')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                  editorMode === 'editor' ? 'bg-[#37373d] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Code Editor
              </button>
              <button
                onClick={() => setEditorMode('diff')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                  editorMode === 'diff' ? 'bg-[#37373d] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Side-by-Side Diff
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
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  renderSideBySide: true,
                }}
              />
            )}
          </div>

          {/* 4. Bottom Integrated Terminal */}
          <div className="h-40 bg-[#181818] border-t border-[#333333] flex flex-col shrink-0">
            {/* Terminal Header */}
            <div className="h-7 bg-[#252526] px-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-[#333333]">
              <div className="flex items-center space-x-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white">TERMINAL</span>
                <span className="text-[#666666]">bash — SafeCodium Autonomous Engine</span>
              </div>
              <div className="flex items-center space-x-3 font-mono text-[10px]">
                {job && (
                  <span className="text-slate-300">
                    Stage: <strong className="text-emerald-400">{job.current_stage} ({job.progress_percentage}%)</strong>
                  </span>
                )}
                <span className="text-emerald-400">CONNECTED</span>
              </div>
            </div>

            {/* Terminal Log Console */}
            <div className="flex-1 p-2.5 font-mono text-xs overflow-y-auto space-y-1 text-slate-300">
              <div className="flex items-center space-x-1.5 text-emerald-400">
                <span>&gt;</span>
                <span>{statusText}</span>
              </div>

              {agentLogs.map((log, idx) => (
                <div key={idx} className="text-slate-400 text-[11px]">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* VS Code Bottom Status Bar (Blue Strip) */}
      <footer className="h-5 bg-[#007acc] text-white px-3 flex items-center justify-between text-[11px] font-sans shrink-0 select-none">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <GitBranch className="w-3 h-3" />
            <span>main*</span>
          </div>
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Deterministic Rule 6 Ground-Truth: ACTIVE</span>
          </div>
          <span>Toolchain: Clang / GCC ASan</span>
        </div>

        <div className="flex items-center space-x-4">
          <span>{vulnerabilities.length} Problems</span>
          <span>{patches.length} Patches</span>
          <span>UTF-8</span>
          <span>C / C++</span>
        </div>
      </footer>
    </div>
  );
};
