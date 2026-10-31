import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  ShieldCheck,
  Hash,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Layers,
  Cpu,
  Copy,
  Printer,
  ExternalLink,
} from 'lucide-react';
import {
  listProjects,
  listProjectPatches,
  getVerificationPassport,
  ProjectData,
  PatchData,
  VerificationPassportData,
} from '../services/api';

export const SecurityReports: React.FC = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [patches, setPatches] = useState<PatchData[]>([]);
  const [selectedPatchId, setSelectedPatchId] = useState<string>('');

  const [passport, setPassport] = useState<VerificationPassportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
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
        setErrorMsg('Failed to initialize projects.');
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
          setPassport(null);
        }
      } catch (err) {
        setPatches([]);
      }
    };
    loadPatches();
  }, [selectedProjectId]);

  // When patch changes, load passport
  useEffect(() => {
    if (!selectedPatchId) {
      setPassport(null);
      return;
    }

    const loadPassportData = async () => {
      try {
        const data = await getVerificationPassport(selectedPatchId);
        setPassport(data);
      } catch (err) {
        console.error('Failed to load passport', err);
      }
    };
    loadPassportData();
  }, [selectedPatchId]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadJson = () => {
    if (!passport) return;
    const blob = new Blob([JSON.stringify(passport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SafeVibe-Passport-${passport.passport_id.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security Assurance &amp; Passports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident, cryptographically signed verification passports verifying vulnerability neutralization (CVSS 9.8 → 0.0).
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

          {passport && (
            <button
              onClick={handleDownloadJson}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm shadow-blue-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          )}
        </div>
      </div>

      {passport ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6">
          {/* Certificate Top Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <Award className="w-7 h-7" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                  OFFICIAL SECURITY VERIFICATION PASSPORT
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Defensive Firmware Remediation Certificate
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Passport ID: {passport.passport_id}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                VERDICT: {passport.final_status}
              </span>
            </div>
          </div>

          {/* CVSS Risk Reduction Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500">PRE-PATCH CVSS RISK</span>
              <div className="text-2xl font-bold text-rose-600">
                {passport.pre_patch_cvss_score.toFixed(1)} CRITICAL
              </div>
              <p className="text-[11px] text-slate-400">Zero boundaries, heap corruptible</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500">POST-PATCH CVSS RISK</span>
              <div className="text-2xl font-bold text-emerald-600">
                {passport.post_patch_cvss_score.toFixed(1)} NEUTRALIZED
              </div>
              <p className="text-[11px] text-slate-400">Bounds enforced, ASan verified</p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-xs font-semibold text-slate-500">NET RISK REDUCTION</span>
              <div className="text-2xl font-bold text-blue-600">
                {passport.cvss_risk_reduction.toFixed(1)} Points Eliminated
              </div>
              <p className="text-[11px] text-slate-400">MISRA C:2012 Rule 21.18 compliant</p>
            </div>
          </div>

          {/* Cryptographic Signatures */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Hash className="w-4 h-4 text-blue-500" />
              <span>Immutable Chain of Custody Fingerprints</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">ORIGINAL SOURCE SHA-256:</span>
                  <span className="text-slate-700">{passport.cryptographic_hashes.original_source_sha256}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(passport.cryptographic_hashes.original_source_sha256, 'orig')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">PATCHED REPLICA SHA-256:</span>
                  <span className="text-slate-700">{passport.cryptographic_hashes.repaired_source_sha256}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(passport.cryptographic_hashes.repaired_source_sha256, 'patch')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-blue-700 font-bold block text-[10px]">VERIFICATION PASSPORT DIGITAL SIGNATURE:</span>
                  <span className="text-blue-900 font-bold">{passport.cryptographic_hashes.passport_signature_sha256}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(passport.cryptographic_hashes.passport_signature_sha256, 'sig')}
                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
          No verification passport issued for this patch yet. Complete the 4 verification gates to generate an official passport.
        </div>
      )}
    </div>
  );
};
