import React from 'react';
import { UploadCloud, FolderArchive, FileCode, CheckCircle2 } from 'lucide-react';

export const ProjectUpload: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Firmware Project Ingestion</h1>
        <p className="text-sm text-slate-400">
          Upload C/C++ source code or complete IoT firmware archives (ESP-IDF, FreeRTOS, Arduino).
        </p>
      </div>

      <div className="p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-900/30 transition-all flex flex-col items-center justify-center text-center space-y-4 cursor-pointer">
        <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white">
            Drag & drop firmware ZIP archive or single C/C++ file
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Supported extensions: .zip, .tar.gz, .c, .cpp, .h, .hpp (Max 50MB)
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700">
          Browse Local Files
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-semibold">
            <FolderArchive className="w-4 h-4" />
            <span>Zip-Slip Protection</span>
          </div>
          <p className="text-xs text-slate-400">
            Uploaded archives are validated against canonical path traversal vulnerabilities before decompression into an isolated shadow sandbox.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Original Source Preservation</span>
          </div>
          <p className="text-xs text-slate-400">
            Original firmware files remain strictly read-only. All AI patch applications and compiler runs occur inside temporary shadow copies.
          </p>
        </div>
      </div>
    </div>
  );
};

