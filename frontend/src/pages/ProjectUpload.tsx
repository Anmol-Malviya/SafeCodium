import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FolderArchive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Play,
  FileCode,
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
      setSuccessMessage(`Uploaded "${project.name}" (${project.file_count} files).`);
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
      setSuccessMessage(`Loaded ${cwe} demo fixture.`);
      await fetchProjects();
      await refreshGlobalProjects();
      if (demoRes?.demonstration_id) {
        setActiveProjectId(demoRes.demonstration_id);
      }
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
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Ingest Firmware</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload C/C++ firmware archive or launch a verified test fixture.
          </p>
        </div>

        {/* Minimal Demo Triggers */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleLaunchQuickDemo('CWE-120')}
            disabled={isRunningDemo || isUploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs"
          >
            {isRunningDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3 h-3 text-amber-600" />}
            <span>CWE-120 Demo</span>
          </button>
          <button
            onClick={() => handleLaunchQuickDemo('CWE-476')}
            disabled={isRunningDemo || isUploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition shadow-2xs"
          >
            {isRunningDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3 h-3 text-indigo-600" />}
            <span>CWE-476 Demo</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".zip,.tar.gz,.c,.cpp,.cc,.cxx,.h,.hpp"
        className="hidden"
      />

      {/* Minimal Upload Box */}
      <div
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`p-8 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center text-center space-y-2.5 cursor-pointer bg-white ${
          isUploading
            ? 'border-indigo-400 bg-indigo-50/20 pointer-events-none'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <UploadCloud className="w-5 h-5" />}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-800">
            {isUploading ? 'Extracting & creating shadow workspace...' : 'Drop firmware archive or click to browse'}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Supports .zip, .tar.gz, .c, .cpp, .h (Zip-Slip protected)
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {successMessage && (
        <div className="px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="px-3.5 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Projects Table / Clean List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Available Firmware Projects ({projects.length})
          </h2>
          <span className="text-[11px] text-slate-400">Select one to begin analysis</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No firmware ingested yet. Upload an archive or run a demo above.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/60 transition group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-4">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <FolderArchive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{p.name}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span>{p.framework_type.toUpperCase()}</span>
                      <span>•</span>
                      <span>{p.file_count} files</span>
                      <span>•</span>
                      <span className="font-mono">{p.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      setActiveProjectId(p.id);
                      navigate('/pipeline');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-2xs"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Auto Repair</span>
                  </button>
                  <button
                    onClick={() => handleSelectAndProceed(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <span>Manual Flow</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
