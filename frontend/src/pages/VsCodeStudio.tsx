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
  downloadRepairedProjectUrl,
  downloadOriginalProjectUrl,
  ProjectData,
  SourceFileData,
  PipelineJobData,
  runDemonstration,
} from '../services/api';

export const VsCodeStudio: React.FC = () => {
  // Projects & Files state
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [files, setFiles] = useState<SourceFileData[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  
  // File Contents
  const [originalCode, setOriginalCode] = useState<string>('// Select a file to inspect code');
  const [currentCode, setCurrentCode] = useState<string>('// Select a file to inspect code');
  const [activeTab, setActiveTab] = useState<'editor' | 'diff'>('editor');

  // Pipeline Job & Agent state
  const [job, setJob] = useState<PipelineJobData | null>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Ready. Upload firmware or select project.');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // 2. Load Project Files & Check latest job
  useEffect(() => {
    if (!selectedProjectId) {
      setFiles([]);
      return;
    }

    const loadProjectDetails = async () => {
      try {
        const fileList = await getProjectFiles(selectedProjectId);
        setFiles(fileList);
        if (fileList.length > 0) {
          setSelectedFilePath(fileList[0].relative_path);
        }

        const latestJob = await getLatestProjectPipelineJob(selectedProjectId);
        if (latestJob) {
          setJob(latestJob);
          if (latestJob.status === 'running') {
            setIsFixing(true);
            setStatusText('Live Agent is fixing vulnerabilities in background...');
          }
        } else {
          setJob(null);
        }
      } catch (err) {
        console.error('Failed to load project files', err);
      }
    };

    loadProjectDetails();
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
    }
  }, [selectedFilePath, selectedProjectId]);

  // 4. Polling loop during Live Fix
  useEffect(() => {
    if (!isFixing || !job?.job_id) return;

    const timer = setInterval(async () => {
      try {
        const updated = await getPipelineJobStatus(job.job_id);
        setJob(updated);
        setStatusText(`Agent Stage: ${updated.current_stage.replace('_', ' ')} (${updated.progress_percentage}%)`);

        if (updated.status === 'completed' || updated.status === 'failed') {
          setIsFixing(false);
          setStatusText(
            updated.status === 'completed'
              ? `Done! All vulnerabilities fixed & verified (${updated.summary_data?.final_verdict || 'VERIFIED'})`
              : `Fix pipeline halted: ${updated.error_message || 'Check terminal'}`
          );
          // Reload file content to reflect fixed code
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
  }, [isFixing, job?.job_id, selectedFilePath]);

  // 5. Trigger Upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(true);
    setStatusText(`Uploading & unpacking ${file.name}...`);

    try {
      const uploaded = await uploadProject(file);
      await fetchProjects();
      setSelectedProjectId(uploaded.id);
      setStatusText(`Loaded "${uploaded.name}". Click "Fix with AI Agent" to start.`);
    } catch (err: any) {
      setStatusText(`Upload error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 6. Trigger Live Agent Fix
  const handleStartFix = async () => {
    if (!selectedProjectId) return;
    setIsFixing(true);
    setStatusText('AI Agent initiated. Analyzing firmware AST & peripherals...');
    setActiveTab('editor');

    try {
      const newJob = await triggerAutonomousPipeline(selectedProjectId, 'gemini');
      setJob(newJob);
    } catch (err: any) {
      setIsFixing(false);
      setStatusText(`Failed to launch agent: ${err.response?.data?.detail || err.message}`);
    }
  };

  // Quick Demo Trigger
  const handleQuickDemo = async (cwe: 'CWE-120' | 'CWE-476') => {
    setIsFixing(true);
    setStatusText(`Loading ${cwe} firmware test fixture...`);
    try {
      const demo = await runDemonstration(cwe);
      await fetchProjects();
      if (demo.demonstration_id) {
        setSelectedProjectId(demo.demonstration_id);
      }
      setStatusText(`${cwe} loaded and verified (${demo.final_verdict}). Check code and diff!`);
    } catch (err: any) {
      setStatusText(`Demo error: ${err.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.2rem)] bg-[#1e1e1e] text-slate-200 overflow-hidden font-sans select-none">
      {/* VS Code Top Menu / Control Toolbar */}
      <header className="h-12 bg-[#252526] border-b border-[#333333] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-bold tracking-tight">SafeCodium Live Studio</span>
          </div>

          <span className="text-slate-600">|</span>

          {/* Project Dropdown */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-[#3c3c3c] text-slate-200 text-xs px-2.5 py-1 rounded border border-[#555] focus:outline-hidden"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.file_count} files)
              </option>
            ))}
          </select>
        </div>

        {/* Action Buttons: Upload, Fix, Download */}
        <div className="flex items-center space-x-2">
          {/* Hidden file input */}
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
            className="px-3 py-1.5 rounded bg-[#333333] hover:bg-[#444444] text-slate-200 text-xs font-medium flex items-center space-x-1.5 border border-[#555] transition"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 text-blue-400" />}
            <span>Upload File / ZIP</span>
          </button>

          {/* Start Fix Button */}
          <button
            onClick={handleStartFix}
            disabled={isFixing || !selectedProjectId}
            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
          >
            {isFixing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Agent Fixing...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-white" />
                <span>Fix with AI Agent</span>
              </>
            )}
          </button>

          {/* Repaired Download Button */}
          {selectedProjectId && (
            <a
              href={downloadRepairedProjectUrl(selectedProjectId)}
              className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center space-x-1.5 transition ${
                job?.status === 'completed'
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'bg-[#2d2d2d] hover:bg-[#3d3d3d] text-slate-300 border border-[#555]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Repaired Project</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Studio Body: File Tree + Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: VS Code File Explorer */}
        <aside className="w-64 bg-[#252526] border-r border-[#333333] flex flex-col shrink-0">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-[#333333]">
            <span>Explorer</span>
            <span className="text-[10px] text-slate-500">{files.length} files</span>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto py-2">
            {files.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No files loaded. Click &quot;Upload File / ZIP&quot; above.
              </div>
            ) : (
              <div className="space-y-0.5">
                {files.map((f) => {
                  const isSelected = selectedFilePath === f.relative_path;
                  return (
                    <button
                      key={f.relative_path}
                      onClick={() => setSelectedFilePath(f.relative_path)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center space-x-2 transition ${
                        isSelected
                          ? 'bg-[#37373d] text-white font-medium'
                          : 'text-slate-400 hover:bg-[#2a2d2e] hover:text-slate-200'
                      }`}
                    >
                      <FileCode className={`w-3.5 h-3.5 ${f.extension === '.cpp' ? 'text-blue-400' : 'text-amber-400'}`} />
                      <span className="truncate">{f.filename}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Demos */}
          <div className="p-3 border-t border-[#333333] bg-[#1e1e1e] space-y-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              Quick Test Fixtures
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleQuickDemo('CWE-120')}
                disabled={isFixing}
                className="flex-1 py-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[11px] text-slate-300 border border-[#444] transition"
              >
                CWE-120 Demo
              </button>
              <button
                onClick={() => handleQuickDemo('CWE-476')}
                disabled={isFixing}
                className="flex-1 py-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[11px] text-slate-300 border border-[#444] transition"
              >
                CWE-476 Demo
              </button>
            </div>
          </div>
        </aside>

        {/* Center Main Editor View */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#1e1e1e]">
          {/* Editor Tab Bar */}
          <div className="h-9 bg-[#2d2d2d] border-b border-[#333333] flex items-center justify-between px-3 shrink-0">
            <div className="flex items-center space-x-2">
              <div className="px-3 py-1.5 bg-[#1e1e1e] text-slate-200 text-xs font-mono flex items-center space-x-1.5 border-t-2 border-blue-500">
                <FileCode className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedFilePath || 'No file selected'}</span>
              </div>
            </div>

            {/* Toggle Editor vs Diff View */}
            <div className="flex items-center space-x-1 bg-[#1e1e1e] p-0.5 rounded border border-[#444]">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'editor' ? 'bg-[#37373d] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Current Code
              </button>
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                  activeTab === 'diff' ? 'bg-[#37373d] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Diff (Original vs Fixed)
              </button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative">
            {activeTab === 'editor' ? (
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

          {/* Bottom Live Terminal / Agent Status Bar */}
          <div className="h-32 bg-[#181818] border-t border-[#333333] flex flex-col shrink-0">
            <div className="h-7 bg-[#252526] px-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 border-b border-[#333333]">
              <div className="flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Live Autonomous Agent Terminal</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[10px]">
                {job && (
                  <span>
                    Status: <strong className="text-emerald-400">{job.status.toUpperCase()}</strong>
                  </span>
                )}
                <span>Exit: 0</span>
              </div>
            </div>

            <div className="flex-1 p-3 font-mono text-xs overflow-y-auto space-y-1 text-slate-300">
              <div className="flex items-center space-x-2 text-slate-400">
                <span className="text-emerald-400">&gt;</span>
                <span>{statusText}</span>
              </div>

              {job?.stages && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {job.stages.map((st) => (
                    <span
                      key={st.stage_id}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        st.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : st.status === 'RUNNING'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800 animate-pulse'
                          : 'bg-[#252526] text-slate-500'
                      }`}
                    >
                      {st.name}: {st.status}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
