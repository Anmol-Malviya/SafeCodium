import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  HardDrive,
  Sparkles,
  Zap,
  Play,
} from 'lucide-react';
import { uploadProject, listProjects, runDemonstration, ProjectData } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';

export const ProjectUpload: React.FC = () => {
  const { setActiveProjectId, refreshProjects: refreshGlobalProjects, setCurrentStepIndex } = useProjectContext();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await doUpload(file);
  };

  const doUpload = async (file: File) => {
    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const project = await uploadProject(file);
      setSuccessMessage(`Ingested "${project.name}" (${project.file_count} C/C++ files indexed).`);
      setActiveProjectId(project.id);
      await fetchProjects();
      await refreshGlobalProjects();
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLaunchQuickDemo = async (cwe: 'CWE-120' | 'CWE-476') => {
    setIsRunningDemo(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const demoRes = await runDemonstration(cwe);
      setSuccessMessage(`Demo project created for ${cwe}! Directing to scanning & fix.`);
      await fetchProjects();
      await refreshGlobalProjects();
      if (demoRes?.demonstration_id) {
        setActiveProjectId(demoRes.demonstration_id);
      }
      // Advance to Step 2
      setCurrentStepIndex(2);
      navigate('/scanner');
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.detail || 'Demo launch failed.');
    } finally {
      setIsRunningDemo(false);
    }
  };

  const handleSelectAndProceed = (projectId: string) => {
    setActiveProjectId(projectId);
    setCurrentStepIndex(2);
    navigate('/scanner');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header section with clean status badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Step 1 of 6
            </span>
            <span className="text-xs font-semibold text-slate-500">Pipeline Ingestion</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Upload Firmware or Select Demo</h1>
          <p className="text-sm text-slate-500">
            Ingest your C/C++ firmware archive or launch a 1-click verified IoT fixture.
          </p>
        </div>

        {/* 1-Click Fast Demonstrations */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleLaunchQuickDemo('CWE-120')}
            disabled={isRunningDemo || isUploading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-xs transition"
          >
            {isRunningDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>1-Click CWE-120 Demo</span>
          </button>
          <button
            onClick={() => handleLaunchQuickDemo('CWE-476')}
            disabled={isRunningDemo || isUploading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-xs transition"
          >
            {isRunningDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>1-Click CWE-476 Demo</span>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip,.tar.gz,.c,.cpp,.cc,.cxx,.h,.hpp"
        className="hidden"
      />

      {/* Upload Dropzone */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`p-10 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-4 cursor-pointer bg-white shadow-xs ${
          isUploading
            ? 'border-indigo-500 bg-indigo-50/40 pointer-events-none'
            : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/60'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
          {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">
            {isUploading ? 'Ingesting, Unpacking & Creating Shadow Workspace...' : 'Click to upload or drag & drop C/C++ firmware files'}
          </p>
          <p className="text-xs text-slate-400">
            Supports: .zip, .tar.gz firmware archives or single .c, .cpp, .h source files (Auto Zip-Slip Defense)
          </p>
        </div>

        <div className="flex items-center space-x-4 pt-2 text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zip-Slip Traversal Defended</span>
          </span>
          <span className="flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span>Isolated Shadow Workspace</span>
          </span>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2 font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Indexed Repositories */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <span>Available Firmware Projects</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
              {projects.length}
            </span>
          </h2>
          <span className="text-[11px] text-slate-400">Select any project to begin analysis</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-10 text-center rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
            <p className="text-xs text-slate-500 font-medium">No projects in database right now.</p>
            <p className="text-[11px] text-slate-400">
              Upload your code archive above or click "1-Click CWE-120 Demo" to get started instantly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex items-center justify-between group"
              >
                <div className="space-y-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-2">
                    <FolderArchive className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Framework: <span className="text-slate-700 font-semibold">{p.framework_type.toUpperCase()}</span> | Files: <span className="font-semibold text-slate-700">{p.file_count}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ID: <span className="font-mono">{p.id.substring(0, 8)}</span> • {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => handleSelectAndProceed(p.id)}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center space-x-1 shadow-xs shrink-0"
                >
                  <span>Select & Scan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
