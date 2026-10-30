import React, { useEffect, useState } from 'react';
import { FileCode2, Network, Cpu, HardDrive, ShieldAlert, Radio, Activity, CheckCircle2 } from 'lucide-react';
import { listProjects, getProjectIotSummary, getProjectFiles, ProjectData, IotProjectContextSummaryData, SourceFileData } from '../services/api';

export const CodeAnalysis: React.FC = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [summary, setSummary] = useState<IotProjectContextSummaryData | null>(null);
  const [files, setFiles] = useState<SourceFileData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projs = await listProjects();
        setProjects(projs);
        if (projs.length > 0) {
          setSelectedProjectId(projs[0].id);
          loadContext(projs[0].id);
        }
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };
    fetchProjects();
  }, []);

  const loadContext = async (pid: string) => {
    setIsLoading(true);
    try {
      const [sum, fileList] = await Promise.all([
        getProjectIotSummary(pid),
        getProjectFiles(pid),
      ]);
      setSummary(sum);
      setFiles(fileList);
    } catch (err) {
      console.error('Failed to load IoT context', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProjectId(pid);
    loadContext(pid);
  };

  const [demoResult, setDemoResult] = useState<any | null>(null);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);

  const triggerE2eDemo = async (cwe: string) => {
    setIsDemoRunning(true);
    setDemoResult(null);
    try {
      const { runDemonstration } = await import('../services/api');
      const res = await runDemonstration(cwe);
      setDemoResult(res);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Demonstration execution failed');
    } finally {
      setIsDemoRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">IoT Firmware Context Intelligence</h1>
          <p className="text-sm text-slate-400">
            Hardware peripheral recognition, hardware register taint sources, and RTOS memory architecture.
          </p>
        </div>

        {projects.length > 0 && (
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.framework_type.toUpperCase()})
              </option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 text-center font-mono text-xs text-slate-500 animate-pulse">
          Analyzing hardware registers and peripheral taint vectors...
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>OPERATING SYSTEM</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-base font-bold text-white">{summary.operating_system}</div>
              <p className="text-[11px] text-slate-500">Framework: {summary.framework_type.toUpperCase()}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>ACTIVE PERIPHERALS</span>
                <Radio className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-base font-bold text-purple-300">
                {summary.detected_peripherals.length} Interfaces
              </div>
              <p className="text-[11px] text-slate-500">UART, ADC, Network sockets</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>SOURCE INVENTORY</span>
                <FileCode2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-base font-bold text-white">{summary.total_source_files} Files</div>
              <p className="text-[11px] text-slate-500">C/C++ firmware translation units</p>
            </div>
          </div>

          {/* Detected Peripheral Taint Sources */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>Identified Hardware Input & Taint Vectors</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {summary.detected_peripherals.length} active interfaces detected
              </span>
            </div>

            {summary.detected_peripherals.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono">No direct peripheral access patterns detected.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                {summary.detected_peripherals.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 flex items-start justify-between space-x-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{p.peripheral_type}</span>
                        <span className="text-[10px] text-slate-500">({p.identifier})</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{p.description}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        p.risk_level === 'UNTRUSTED_EXTERNAL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      {p.risk_level}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Indexed Firmware Files Table */}
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
                Firmware Source Files ({files.length})
              </span>
              <span>Workspace: Isolated Shadow Copy</span>
            </div>
            <div className="divide-y divide-slate-800 border-t border-slate-800">
              {files.map((f, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-slate-300">
                  <div className="flex items-center space-x-2">
                    <FileCode2 className="w-4 h-4 text-slate-500" />
                    <span>{f.relative_path}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] flex items-center space-x-4">
                    <span>{f.line_count} lines</span>
                    <span>{(f.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Autonomous End-to-End Demonstration Triggers */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                  <Activity className="w-4 h-4" />
                  <span>Phase 18 Autonomous End-to-End Demonstrations</span>
                </div>
                <p className="text-slate-400 text-xs mt-0.5">
                  Execute continuous 10-stage autonomous verification journeys on embedded smart meter firmware fixtures.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => triggerE2eDemo('CWE-120')}
                  disabled={isDemoRunning}
                  className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  <span>{isDemoRunning ? 'Running Pipeline...' : '▶ Demo 1: CWE-120 Buffer Overflow'}</span>
                </button>
                <button
                  onClick={() => triggerE2eDemo('CWE-476')}
                  disabled={isDemoRunning}
                  className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  <span>{isDemoRunning ? 'Running Pipeline...' : '▶ Demo 2: CWE-476 NULL Pointer'}</span>
                </button>
              </div>
            </div>

            {demoResult && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/50 space-y-3 pt-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white text-sm">
                      {demoResult.target_cwe} Demonstration Complete ({demoResult.stages_passed}/{demoResult.total_stages} Stages Passed)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    VERDICT: {demoResult.final_verdict}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {demoResult.stages.map((st: any, i: number) => (
                    <div key={i} className="p-2 rounded bg-slate-900 border border-slate-800/80 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-cyan-300">{st.stage_name}</span>
                        <span className="text-emerald-400 font-bold text-[10px]">✓ {st.status}</span>
                      </div>
                      <p className="text-slate-400 text-[10px]">{st.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs font-mono text-slate-500">
          Upload a firmware project to view hardware peripheral taint vectors and AST context.
        </div>
      )}
    </div>
  );
};
