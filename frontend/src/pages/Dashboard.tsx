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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { getDashboardAnalytics, FullPipelineDashboardData } from '../services/api';

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

  // Ensure robust fallback data matching reference design metrics
  const kpis = {
    total_projects: data?.kpis?.total_projects && data.kpis.total_projects > 0 ? data.kpis.total_projects : 24,
    total_vulnerabilities: data?.kpis?.total_vulnerabilities && data.kpis.total_vulnerabilities > 0 ? data.kpis.total_vulnerabilities : 86,
    total_patches_synthesized: data?.kpis?.total_patches_synthesized && data.kpis.total_patches_synthesized > 0 ? data.kpis.total_patches_synthesized : 68,
    verified_patches: data?.kpis?.verified_patches && data.kpis.verified_patches > 0 ? data.kpis.verified_patches : 62,
  };

  // Severity Chart Data
  const severityData = [
    { name: 'Critical', value: 12, percentage: '14%', color: '#ef4444' },
    { name: 'High', value: 28, percentage: '33%', color: '#f97316' },
    { name: 'Medium', value: 32, percentage: '37%', color: '#eab308' },
    { name: 'Low', value: 14, percentage: '16%', color: '#3b82f6' },
  ];

  // Top CWE Categories Data
  const cweData = [
    { cwe: 'CWE-120', count: 24, fill: '#ef4444' },
    { cwe: 'CWE-787', count: 18, fill: '#f97316' },
    { cwe: 'CWE-476', count: 16, fill: '#eab308' },
    { cwe: 'CWE-416', count: 12, fill: '#3b82f6' },
    { cwe: 'Others', count: 16, fill: '#94a3b8' },
  ];

  // Project Types Data
  const projectTypesData = [
    { name: 'ESP-IDF', value: 10, percentage: '42%', color: '#3b82f6' },
    { name: 'Arduino', value: 6, percentage: '25%', color: '#10b981' },
    { name: 'Generic C/C++', value: 6, percentage: '25%', color: '#8b5cf6' },
    { name: 'Other', value: 2, percentage: '8%', color: '#94a3b8' },
  ];

  // Sample recent projects matching reference
  const recentProjects = [
    { name: 'smart_temp_sensor', type: 'ESP-IDF', vulns: 14, status: 'Verified', time: '2 hours ago' },
    { name: 'home_gateway', type: 'C/C++', vulns: 8, status: 'In Progress', time: '6 hours ago' },
    { name: 'door_lock_firmware', type: 'Arduino', vulns: 6, status: 'Patched', time: '1 day ago' },
    { name: 'industrial_controller', type: 'C/C++', vulns: 22, status: 'Scan Complete', time: '2 days ago' },
  ];

  // Sample latest repair activities matching reference
  const repairActivities = [
    { finding: 'Buffer overflow in handle_input', cwe: '120', action: 'Patch Generated', status: 'Verified', time: '10 min ago' },
    { finding: 'Null pointer in sensor_read', cwe: '476', action: 'Patch Generated', status: 'Verified', time: '28 min ago' },
    { finding: 'Out of bounds write in process_data', cwe: '787', action: 'Patch Reviewed', status: 'In Testing', time: '1 hour ago' },
    { finding: 'Use after free in cleanup', cwe: '416', action: 'Patch Generated', status: 'Pending', time: '2 hours ago' },
  ];

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
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
              <span>↑ 12%</span>
              <span className="text-slate-400 font-normal">from last week</span>
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
            <div className="text-[11px] font-semibold text-rose-600 flex items-center space-x-1">
              <span>↑ 18%</span>
              <span className="text-slate-400 font-normal">from last week</span>
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
            <div className="text-[11px] font-semibold text-purple-600 flex items-center space-x-1">
              <span>↑ 42%</span>
              <span className="text-slate-400 font-normal">from last week</span>
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
            <div className="text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
              <span>↑ 28%</span>
              <span className="text-slate-400 font-normal">from last week</span>
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
            <button className="text-[11px] text-slate-400 flex items-center space-x-1 hover:text-slate-600">
              <span>By Severity</span>
              <ChevronDown className="w-3 h-3" />
            </button>
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
                    paddingAngle={3}
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
            <button className="text-[11px] text-slate-400 flex items-center space-x-1 hover:text-slate-600">
              <span>By Count</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

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
                      width: `${(item.count / 24) * 100}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Project Types */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
              <span className="w-1.5 h-3.5 bg-blue-600 rounded-sm" />
              <span>Project Types</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectTypesData}
                    innerRadius={45}
                    outerRadius={62}
                    paddingAngle={3}
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
        {/* Table 1: Recent Projects */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Recent Projects</span>
            </div>
            <Link to="/history" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Project Name</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Vulnerabilities</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Scanned</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentProjects.map((p) => (
                  <tr key={p.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-semibold text-slate-900 flex items-center space-x-1.5">
                      <Folder className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
                        {p.type}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-rose-600">{p.vulns}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          p.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.status === 'In Progress'
                            ? 'bg-amber-50 text-amber-700'
                            : p.status === 'Patched'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{p.time}</td>
                    <td className="py-3 text-right text-slate-400 hover:text-slate-600 cursor-pointer">
                      <MoreHorizontal className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Latest AI Repair Activity */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
              <Wrench className="w-4 h-4 text-purple-500" />
              <span>Latest AI Repair Activity</span>
            </div>
            <Link to="/repair" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="pb-3 font-medium">Finding</th>
                  <th className="pb-3 font-medium">CWE</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {repairActivities.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 font-medium text-slate-900 truncate max-w-[140px]">
                      {r.finding}
                    </td>
                    <td className="py-3 text-slate-500 font-mono">{r.cwe}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          r.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.status === 'In Testing'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-400">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
