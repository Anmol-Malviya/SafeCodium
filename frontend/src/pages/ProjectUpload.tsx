import React, { useState, useEffect, useRef } from 'react';
import { Upload, FolderArchive, FileCode, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, HardDrive } from 'lucide-react';
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Firmware Project Ingestion</h1>
        <p className="text-sm text-slate-500 mt-1">
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
        className={`p-10 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center space-y-4 cursor-pointer bg-white shadow-sm ${
          isUploading
            ? 'border-blue-500 bg-blue-50/50 pointer-events-none'
            : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50/50'
        }`}
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            {isUploading ? 'Extracting & Sanitizing Workspace...' : 'Click to select or drag and drop firmware files'}
          </p>
          <p className="text-xs text-slate-400">
            Supported formats: .zip, .tar.gz archives or single .c, .cpp, .h source files (Max 100MB)
          </p>
        </div>

        <div className="flex items-center space-x-4 pt-2 text-[11px] text-slate-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zip-Slip Traversal Defended</span>
          </span>
          <span className="flex items-center space-x-1">
            <HardDrive className="w-3.5 h-3.5 text-blue-500" />
            <span>Isolated Shadow Workspace</span>
          </span>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 font-medium">
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
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          Indexed Firmware Repositories ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No projects uploaded yet. Select a firmware archive above to begin analysis.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FolderArchive className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-slate-800">{p.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Framework: <span className="text-slate-700 font-medium">{p.framework_type.toUpperCase()}</span> | Files: <span className="font-medium text-slate-700">{p.file_count}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Created: {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/analysis')}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-1 shadow-xs"
                >
                  <span>Analyze</span>
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
