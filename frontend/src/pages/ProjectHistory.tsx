import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit &amp; Ingestion History</h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete historical ledger of ingested firmware repositories, static analysis runs, synthesized patches, and cryptographic passports.
        </p>
      </div>

      {/* Projects History Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <FolderArchive className="w-4 h-4 text-blue-500" />
            <span>Ingested Firmware Repositories ({projects.length})</span>
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No firmware projects ingested yet. Start by uploading a C/C++ firmware archive.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Project Name</th>
                  <th className="pb-3 font-medium">Framework</th>
                  <th className="pb-3 font-medium">Files Indexed</th>
                  <th className="pb-3 font-medium">Original Ingestion Path</th>
                  <th className="pb-3 font-medium">Ingested Timestamp</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
                        {p.framework_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-slate-800">{p.file_count} files</td>
                    <td className="py-3.5 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                      {p.original_path}
                    </td>
                    <td className="py-3.5 text-slate-400">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => navigate('/analysis')}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
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

      {/* Immutable Activity Ledger */}
      {analytics && analytics.recent_activity.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Immutable Audit Trail &amp; Verification Events ({analytics.recent_activity.length})
          </h2>

          <div className="divide-y divide-slate-100 text-xs">
            {analytics.recent_activity.map((act) => (
              <div key={act.id} className="py-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-900">{act.title}</div>
                  <div className="text-[11px] text-slate-400">{act.target}</div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      act.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {act.status}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {new Date(act.timestamp).toLocaleTimeString()}
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
