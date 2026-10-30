import React from 'react';
import { FileText, Download, ShieldCheck, Hash } from 'lucide-react';

export const SecurityReports: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Security Assurance Reports</h1>
          <p className="text-sm text-slate-400">
            Cryptographic verification passports, compliance records, and auditable PDF/JSON evidence.
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs font-mono flex items-center space-x-1.5">
          <Download className="w-3.5 h-3.5" />
          <span>Export Passport (JSON)</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-cyan-400 text-sm font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Verification Passport</span>
          </div>
          <p className="text-xs text-slate-400">
            Machine-readable cryptographic record binding the original commit hash, AST fingerprint, patch diff, compiler exit codes, and sanitizer output.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-purple-400 text-sm font-semibold">
            <Hash className="w-4 h-4" />
            <span>Cryptographic Artifact Hashing</span>
          </div>
          <p className="text-xs text-slate-400">
            SHA-256 signatures generated for both pre-patch and post-patch binaries to prevent tampering and ensure verifiable supply-chain security.
          </p>
        </div>
      </div>
    </div>
  );
};

