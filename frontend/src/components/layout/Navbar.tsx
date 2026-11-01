import React, { useEffect, useState } from 'react';
import { Search, Bell, Moon, Sun, Shield, Activity, AlertCircle } from 'lucide-react';
import { getSystemHealth, SystemHealthData } from '../../services/api';

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await getSystemHealth();
        setHealth(data);
        setError(false);
      } catch (err) {
        setError(true);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      {/* Global Search Bar */}
      <div className="flex-1 max-w-md">
        <div className={`relative flex items-center transition-all ${isSearchFocused ? 'ring-2 ring-blue-500/20' : ''}`}>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects, files, vulnerabilities..."
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-10 pr-20 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 transition-all"
          />
          <div className="absolute right-2.5 flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-xs">
              Ctrl + K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls & Telemetry */}
      <div className="flex items-center space-x-4">
        {/* Live Engine Status Pill */}
        {error ? (
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
            <span>Engine Offline</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-emerald-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Engine Online</span>
          </div>
        )}

        {/* Notification Bell */}
        <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-full absolute top-2 right-2 ring-2 ring-white" />
        </button>

        {/* Theme Icon */}
        <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
          <Moon className="w-4 h-4" />
        </button>

        {/* User / Org Avatar Pill */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            SA
          </div>
          <span className="hidden sm:inline-block text-xs font-semibold text-slate-700">
            SAFE-CODIUM
          </span>
        </div>
      </div>
    </header>
  );
};
