import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Clock,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FolderArchive,
  Download,
} from 'lucide-react';
import {
  listProjects,
  listProjectPatches,
  getDashboardAnalytics,
  ProjectData,
  FullPipelineDashboardData,
} from '../services/api';

export const ProjectHistory: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [analytics, setAnalytics] = useState<FullPipelineDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [projRes, anaRes] = await Promise.all([
          listProjects().catch(() => []),
          getDashboardAnalytics().catch(() => null),
        ]);
        setProjects(projRes);
        setAnalytics(anaRes);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2">
          <History className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">Audit & Ingestion History</h1>
          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/50">
            Phase 17 Historical Ledger
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Complete historical ledger of ingested firmware repositories, static analysis runs, synthesized patches, and cryptographic passports.
        </p>
      </div>

      {/* Projects History Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center space-x-2">
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <span>Ingested Firmware Repositories ({projects.length})</span>
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center space-y-3 font-mono text-xs text-slate-500">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No firmware projects ingested yet. Start by uploading a C/C++ firmware archive.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-950 border border-slate-800/80 overflow-hidden font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <th className="py-2.5 px-4 font-semibold">Project Name</th>
                  <th className="py-2.5 px-4 font-semibold">Framework</th>
                  <th className="py-2.5 px-4 font-semibold">Indexed Files</th>
                  <th className="py-2.5 px-4 font-semibold">Ingestion Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <FileCode className="w-4 h-4 text-cyan-400" />
                        <span>{p.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{p.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        {p.framework_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {p.file_count} files
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate('/scanner')}
                        className="px-3 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800/80 text-[11px] font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Activity Stream */}
      {analytics && analytics.recent_activity.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300">
            Immutable Audit Trail Events
          </span>

          <div className="space-y-2 font-mono text-xs">
            {analytics.recent_activity.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-white">{ev.title}</span>
                  <div className="text-[11px] text-slate-400 truncate max-w-lg">{ev.target}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      ev.status === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                    }`}
                  >
                    {ev.status}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
