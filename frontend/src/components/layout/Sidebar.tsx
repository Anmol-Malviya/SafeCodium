import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Upload,
  FileCode2,
  Scan,
  Wrench,
  GitCompare,
  CheckCircle2,
  FileText,
  Clock,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Project Upload', path: '/upload', icon: Upload },
  { name: 'Code Analysis', path: '/analysis', icon: FileCode2 },
  { name: 'Vulnerability Scanner', path: '/scanner', icon: Scan },
  { name: 'AI Repair Studio', path: '/repair', icon: Wrench },
  { name: 'Code Diff Review', path: '/diff', icon: GitCompare },
  { name: 'Verification Center', path: '/verification', icon: CheckCircle2 },
  { name: 'Security Reports', path: '/reports', icon: FileText },
  { name: 'Project History', path: '/history', icon: Clock },
  { name: 'Settings & Models', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between py-5 select-none shrink-0 shadow-sm">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="px-6 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-slate-900 text-sm">
              SAFE VIBE AI
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              IoT Firmware Security
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <div className="space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Status Widgets */}
      <div className="px-4 space-y-3">
        {/* System Status Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500">System Status</div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-slate-800">All Systems Operational</span>
          </div>
        </div>

        {/* AI Providers Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
          <div className="text-[11px] font-semibold text-slate-500">AI Providers</div>
          <div className="space-y-1.5 text-xs font-medium">
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Gemini API</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>OpenAI API</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Ollama (Gemma 3B)</span>
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold">Online</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
