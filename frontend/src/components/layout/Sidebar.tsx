import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileCode2,
  ScanSearch,
  Bug,
  Wrench,
  GitCompare,
  CheckCircle2,
  FileText,
  History,
  Settings,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Project Upload', path: '/upload', icon: UploadCloud },
  { name: 'Code Analysis', path: '/analysis', icon: FileCode2 },
  { name: 'Vulnerability Scanner', path: '/scanner', icon: ScanSearch },
  { name: 'AI Repair Studio', path: '/repair', icon: Wrench, badge: 'AI' },
  { name: 'Code Diff Review', path: '/diff', icon: GitCompare },
  { name: 'Verification Center', path: '/verification', icon: CheckCircle2, badge: 'ASan' },
  { name: 'Security Reports', path: '/reports', icon: FileText },
  { name: 'Project History', path: '/history', icon: History },
  { name: 'Settings & Models', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-cyber-border bg-[#0a0f1d] flex flex-col justify-between py-4 select-none">
      <div className="space-y-1 px-3">
        <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
          Security Workflow
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Firmware Context Box */}
      <div className="px-4 py-3 mx-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono space-y-1.5">
        <div className="text-slate-400 flex items-center justify-between">
          <span>Target Architecture</span>
          <span className="text-cyan-400 font-bold">Xtensa / ARM</span>
        </div>
        <div className="text-slate-400 flex items-center justify-between">
          <span>Supported Frameworks</span>
          <span className="text-emerald-400">ESP-IDF, C/C++</span>
        </div>
        <div className="text-slate-400 flex items-center justify-between">
          <span>Host Sanitizer</span>
          <span className="text-amber-400">ASan / UBSan</span>
        </div>
      </div>
    </aside>
  );
};

