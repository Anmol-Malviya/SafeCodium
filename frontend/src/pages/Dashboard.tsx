import React, { useState, useEffect } from 'react';
import {
  Folder,
  Bug,
  Wrench,
  CheckCircle2,
  ArrowRight,
  Upload,
  Clock,
  ShieldCheck,
  ChevronDown,
  MoreHorizontal,
  Layers,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { getDashboardAnalytics, FullPipelineDashboardData } from '../services/api';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#3b82f6',
};

const TYPE_COLORS: Record<string, string> = {
  'ESP-IDF': '#3b82f6',
  Arduino: '#10b981',
  'Generic C/C++': '#8b5cf6',
  Other: '#94a3b8',
};

const CWE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6'];

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<FullPipelineDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await getDashboardAnalytics();
        setData(res);
      } catch (err) {
        console.error('Failed to load dashboard analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Real KPIs directly from DB; zero fallback to fake statistics
  const kpis = {
    total_projects: data?.kpis?.total_projects ?? 0,
    total_vulnerabilities: data?.kpis?.total_vulnerabilities ?? 0,
    total_patches_synthesized: data?.kpis?.total_patches_synthesized ?? 0,
    verified_patches: data?.kpis?.verified_patches ?? 0,
  };

  // Real Severity Breakdown
  const severityData = (data?.severity_distribution && data.severity_distribution.length > 0)
    ? data.severity_distribution.map((item) => ({
        name: item.name,
        value: item.count,
        percentage: `${item.percentage}%`,
        color: SEVERITY_COLORS[item.name] || '#94a3b8',
      }))
    : [
        { name: 'Critical', value: 0, percentage: '0%', color: '#ef4444' },
        { name: 'High', value: 0, percentage: '0%', color: '#f97316' },
        { name: 'Medium', value: 0, percentage: '0%', color: '#eab308' },
        { name: 'Low', value: 0, percentage: '0%', color: '#3b82f6' },
      ];

  // Real Top CWE Categories
  const cweData = (data?.top_cwe_distribution && data.top_cwe_distribution.length > 0)
    ? data.top_cwe_distribution.map((item, idx) => ({
        cwe: item.name,
        count: item.count,
        fill: CWE_COLORS[idx % CWE_COLORS.length],
      }))
    : [];

  const maxCweCount = Math.max(...cweData.map((c) => c.count), 1);

  // Real Project Types
  const projectTypesData = (data?.project_types_distribution && data.project_types_distribution.length > 0)
    ? data.project_types_distribution.map((item) => ({
        name: item.name,
        value: item.count,
        percentage: `${item.percentage}%`,
        color: TYPE_COLORS[item.name] || '#94a3b8',
      }))
    : [
        { name: 'ESP-IDF', value: 0, percentage: '0%', color: '#3b82f6' },
        { name: 'Arduino', value: 0, percentage: '0%', color: '#10b981' },
        { name: 'Generic C/C++', value: 0, percentage: '0%', color: '#8b5cf6' },
      ];

  // Real activity events from analytics API
  const activities = data?.recent_activity || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* 1. Hero Section */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="space-y-4 max-w-xl z-10">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Secure IoT Firmware with <span className="text-blue-600">AI</span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Detect vulnerabilities, generate secure patches and verify fixes for C/C++ IoT firmware using advanced AI and static analysis.
          </p>
          <div className="flex items-center space-x-3 pt-2">
            <Link
              to="/upload"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-2 transition-all shadow-md shadow-blue-500/20"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Project</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <Link
              to="/scanner"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-2 transition-all shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>View Recent Scans</span>
            </Link>
          </div>
        </div>

        {/* 3D Security Graphic Card (Matching Reference Visual) */}
        <div className="relative w-full lg:w-96 h-48 bg-gradient-to-tr from-blue-50/60 to-indigo-50/40 rounded-2xl border border-blue-100 flex items-center justify-center p-6 shrink-0">
          {/* Glass shield element */}
          <div className="relative w-24 h-24 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-white flex items-center justify-center text-blue-600">
            <ShieldCheck className="w-14 h-14" />
          </div>

          {/* Floating Pill: Detect */}
          <div className="absolute top-4 left-6 px-2.5 py-1 rounded-lg bg-white/95 shadow-sm border border-slate-200/80 text-[11px] font-semibold text-rose-600 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Detect</span>
          </div>

          {/* Floating Pill: Repair */}
          <div className="absolute bottom-4 left-16 px-2.5 py-1 rounded-lg bg-white/95 shadow-sm border border-slate-200/80 text-[11px] font-semibold text-purple-600 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Repair</span>
          </div>

          {/* Floating Pill: Verify */}
          <div className="absolute top-4 right-6 px-2.5 py-1 rounded-lg bg-white/95 shadow-sm border border-slate-200/80 text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Verify</span>
          </div>

          {/* Code snippet decoration */}
          <div className="absolute bottom-3 right-4 font-mono text-[9px] text-slate-400 bg-white/90 p-2 rounded-lg border border-slate-100 shadow-xs leading-tight">
            <div>if (len &gt;= sizeof(buf)) &#123;</div>
            <div className="pl-2 text-rose-500">return -1;</div>
            <div>&#125;</div>
          </div>
        </div>
      </div>

      {/* 2. Four KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Projects */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
              <Folder className="w-4 h-4 text-blue-500" />
              <span>Total Projects</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.total_projects}</div>
            <div className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
              <span>Workspace Archives</span>
            </div>
          </div>
          {/* Sparkline curve */}
          <svg className="w-16 h-8 text-blue-500 shrink-0" viewBox="0 0 100 40" fill="none">
            <path d="M0 35 Q25 38 45 22 T80 15 T100 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Detected Vulnerabilities */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
              <Bug className="w-4 h-4 text-rose-500" />
              <span>Detected Vulnerabilities</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.total_vulnerabilities}</div>
            <div className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
              <span>Total Static Findings</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-rose-500 shrink-0" viewBox="0 0 100 40" fill="none">
            <path d="M0 30 Q30 35 50 18 T80 28 T100 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Synthesized Patches */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
              <Wrench className="w-4 h-4 text-purple-500" />
              <span>Synthesized Patches</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.total_patches_synthesized}</div>
            <div className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
              <span>AI Diff Candidates</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-purple-500 shrink-0" viewBox="0 0 100 40" fill="none">
            <path d="M0 38 Q30 30 55 20 T85 10 T100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Verified Fixes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Verified Fixes</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpis.verified_patches}</div>
            <div className="text-[11px] font-medium text-slate-500 flex items-center space-x-1">
              <span>Dual Compiler Pass</span>
            </div>
          </div>
          <svg className="w-16 h-8 text-emerald-500 shrink-0" viewBox="0 0 100 40" fill="none">
            <path d="M0 35 Q25 25 50 15 T80 8 T100 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* 3. Three Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Vulnerability Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm" />
              <span>Vulnerability Distribution</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">By Severity</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            {/* Donut Chart with Center Text */}
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    innerRadius={45}
                    outerRadius={62}
                    paddingAngle={kpis.total_vulnerabilities > 0 ? 3 : 0}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-slate-900">{kpis.total_vulnerabilities}</span>
                <span className="text-[10px] text-slate-400 font-medium">Findings</span>
              </div>
            </div>

            {/* Severity Legend */}
            <div className="space-y-2 flex-1 text-xs">
              {severityData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span>{s.name}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {s.value} <span className="text-slate-400 font-normal">({s.percentage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 2: Top CWE Categories */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm" />
              <span>Top CWE Categories</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">By Count</span>
          </div>

          {cweData.length > 0 ? (
            <div className="space-y-2.5">
              {cweData.map((item) => (
                <div key={item.cwe} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>{item.cwe}</span>
                    <span className="text-slate-800 font-bold">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((item.count / maxCweCount) * 100))}%`,
                        backgroundColor: item.fill,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Bug className="w-8 h-8 mb-2 opacity-30" />
              <span>No CWE findings recorded yet</span>
            </div>
          )}
        </div>

        {/* Chart 3: Project Types */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm" />
              <span>Project Types</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Frameworks</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectTypesData}
                    innerRadius={45}
                    outerRadius={62}
                    paddingAngle={kpis.total_projects > 0 ? 3 : 0}
                    dataKey="value"
                  >
                    {projectTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-slate-900">{kpis.total_projects}</span>
                <span className="text-[10px] text-slate-400 font-medium">Projects</span>
              </div>
            </div>

            {/* Types Legend */}
            <div className="space-y-2 flex-1 text-xs">
              {projectTypesData.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate max-w-[80px]">{p.name}</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {p.value} <span className="text-slate-400 font-normal">({p.percentage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Data Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Table 1: Ingested Projects & Activity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Recent Workspace Activity</span>
            </div>
            <Link to="/history" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {activities.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium">Activity</th>
                    <th className="pb-3 font-medium">Target</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activities.slice(0, 5).map((act) => (
                    <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 font-semibold text-slate-900 flex items-center space-x-1.5">
                        <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px]">{act.title}</span>
                      </td>
                      <td className="py-3 font-mono text-[11px] text-slate-600 truncate max-w-[120px]">
                        {act.target}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            act.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : act.status === 'ACTIVE'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {act.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400 text-[11px]">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Folder className="w-8 h-8 mb-2 opacity-30" />
                <span>No workspace projects ingested yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Table 2: AI Repair & Verification Stream */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
              <Wrench className="w-4 h-4 text-purple-500" />
              <span>AI Patch & Verification Stream</span>
            </div>
            <Link to="/repair" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {activities.filter(a => a.event_type.includes('PATCH')).length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-3 font-medium">Operation</th>
                    <th className="pb-3 font-medium">Patch Ref</th>
                    <th className="pb-3 font-medium">Gate Status</th>
                    <th className="pb-3 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {activities
                    .filter(a => a.event_type.includes('PATCH'))
                    .slice(0, 5)
                    .map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-medium text-slate-900 flex items-center space-x-1.5">
                          <Activity className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span>{act.title}</span>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-600">{act.target}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              act.status === 'VERIFIED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : act.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>
                        <td className="py-3 text-right text-slate-400 text-[11px]">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                <Wrench className="w-8 h-8 mb-2 opacity-30" />
                <span>No AI repair patches synthesized yet</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
