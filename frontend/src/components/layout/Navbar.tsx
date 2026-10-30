import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, HardDrive, Activity, AlertCircle } from 'lucide-react';
import { getSystemHealth, SystemHealthData } from '../../services/api';

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [error, setError] = useState<boolean>(false);

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
    <header className="h-16 border-b border-cyber-border bg-[#0a0f1d] px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Subtitle */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold tracking-wider text-white text-base">SAFE VIBE AI</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-800">
              v0.1.0-DEV
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Autonomous Vulnerability Detection, Repair & Verification
          </p>
        </div>
      </div>

      {/* Live System Diagnostics Pill */}
      <div className="flex items-center space-x-4">
        {error ? (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            <AlertCircle className="w-4 h-4 animate-pulse" />
            <span>Backend Disconnected</span>
          </div>
        ) : health ? (
          <div className="flex items-center space-x-3 font-mono text-xs">
            {/* Engine Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <Activity className="w-3.5 h-3.5" />
              <span>ENGINE ONLINE</span>
            </div>

            {/* GPU / VRAM */}
            {health.gpu_detected && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  RTX 3050 ({(health.vram_total_mb && health.vram_free_mb)
                    ? `${health.vram_total_mb - health.vram_free_mb}MB`
                    : '6GB'})
                </span>
              </div>
            )}

            {/* RAM */}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {Math.round(health.total_ram_gb - health.free_ram_gb)}G / {Math.round(health.total_ram_gb)}G RAM
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-slate-500 animate-pulse">
            Connecting telemetry...
          </div>
        )}
      </div>
    </header>
  );
};

