import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, FolderArchive, FileCode, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { uploadProject, listProjects, ProjectData } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const ProjectUpload: React.FC = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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
      setSuccessMessage(`Successfully ingested "${project.name}" (${project.file_count} C/C++ files indexed).`);
      fetchProjects();
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Firmware Project Ingestion</h1>
        <p className="text-sm text-slate-400">
          Upload C/C++ source files or complete IoT firmware archives (ESP-IDF, FreeRTOS, Arduino).
        </p>
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
        className={`p-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-4 cursor-pointer ${
          isUploading
            ? 'border-cyan-500 bg-cyan-950/20 pointer-events-none'
            : 'border-slate-700 hover:border-cyan-500/50 bg-slate-900/30'
        }`}
      >
        <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          {isUploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <UploadCloud className="w-7 h-7" />}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">
            {isUploading ? 'Validating and unpacking firmware...' : 'Drag & drop firmware ZIP archive or single C/C++ file'}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Supported extensions: .zip, .c, .cpp, .h, .hpp (Max 100MB)
          </p>
        </div>
        <button
          type="button"
          disabled={isUploading}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700"
        >
          {isUploading ? 'Processing...' : 'Browse Local Files'}
        </button>
      </div>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-xs font-mono text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-xs font-mono text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Ingested Projects List */}
      <div className="space-y-3">
        <h2 className="text-sm font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Ingested Codebases ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs font-mono text-slate-500">
            No firmware projects ingested yet. Upload your first codebase above.
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 font-mono text-xs">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">{proj.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                        {proj.framework_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      {proj.file_count} files &bull; {new Date(proj.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/scanner')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono flex items-center space-x-1"
                >
                  <span>Launch Scanner</span>
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
