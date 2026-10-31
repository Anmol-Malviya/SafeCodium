import React, { useEffect, useState } from 'react';
import { FileCode2, Network, Cpu, HardDrive, ShieldAlert, Radio, Activity, CheckCircle2 } from 'lucide-react';
import { listProjects, getProjectIotSummary, getProjectFiles, runDemonstration, ProjectData, IotProjectContextSummaryData, SourceFileData } from '../services/api';

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
      const res = await runDemonstration(cwe);
      setDemoResult(res);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Demonstration execution failed');
    } finally {
      setIsDemoRunning(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Top Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">IoT Firmware Context Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hardware peripheral recognition, hardware register taint sources, and RTOS memory architecture.
          </p>
        </div>

        {projects.length > 0 && (
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse bg-white rounded-2xl border border-slate-200 shadow-sm">
          Analyzing hardware registers and peripheral taint vectors...
        </div>
      ) : summary ? (
        <div className="space-y-6">
          {/* Architecture Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>OPERATING SYSTEM</span>
                <Cpu className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-base font-bold text-slate-900">{summary.operating_system}</div>
              <p className="text-xs text-slate-400">Framework: {summary.framework_type.toUpperCase()}</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>PERIPHERALS RECOGNIZED</span>
                <Network className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-base font-bold text-slate-900">{summary.detected_peripherals.length} Hardware Controllers</div>
              <p className="text-xs text-slate-400">UART, ADC, DMA &amp; Timers</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500 text-xs">
                <span>STATIC ANALYSIS COVERAGE</span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-base font-bold text-slate-900">100% C/C++ AST Validated</div>
              <p className="text-xs text-slate-400">{files.length} Firmware Modules Indexed</p>
            </div>
          </div>

          {/* Peripheral Mapping Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Hardware Peripheral Registry &amp; Taint Vectors
            </h2>

            {summary.detected_peripherals.length === 0 ? (
              <p className="text-xs text-slate-400">No hardware peripherals registered in this firmware bundle.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.detected_peripherals.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-xs">{p.peripheral_type}</span>
                        <span className="text-[11px] text-slate-400 font-mono">({p.identifier})</span>
                      </div>
                      <p className="text-xs text-slate-500">{p.description}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                        p.risk_level === 'UNTRUSTED_EXTERNAL'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                Firmware Source Files ({files.length})
              </span>
              <span className="text-xs text-slate-400 font-medium">Workspace: Isolated Shadow Copy</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {files.map((f, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-slate-700">
                  <div className="flex items-center space-x-2">
                    <FileCode2 className="w-4 h-4 text-slate-400" />
                    <span className="font-mono text-slate-800">{f.relative_path}</span>
                  </div>
                  <div className="text-slate-400 flex items-center space-x-4">
                    <span>{f.line_count} lines</span>
                    <span>{(f.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Autonomous End-to-End Demonstration Triggers */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
                  <Activity className="w-4 h-4" />
                  <span>Autonomous End-to-End Demonstrations</span>
                </div>
                <p className="text-slate-500 text-xs mt-1">
                  Execute continuous 10-stage autonomous verification journeys on embedded smart meter firmware fixtures.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => triggerE2eDemo('CWE-120')}
                  disabled={isDemoRunning}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  <span>{isDemoRunning ? 'Running Pipeline...' : '▶ Demo 1: CWE-120 Buffer Overflow'}</span>
                </button>
                <button
                  onClick={() => triggerE2eDemo('CWE-476')}
                  disabled={isDemoRunning}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-sm shadow-purple-500/20 disabled:opacity-50"
                >
                  <span>{isDemoRunning ? 'Running Pipeline...' : '▶ Demo 2: CWE-476 NULL Pointer'}</span>
                </button>
              </div>
            </div>

            {demoResult && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 pt-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-sm">
                      {demoResult.target_cwe} Demonstration Complete ({demoResult.stages_passed}/{demoResult.total_stages} Stages Passed)
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                    VERDICT: {demoResult.final_verdict}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {demoResult.stages.map((st: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{st.stage_name}</span>
                        <span className="text-emerald-600 font-bold text-[11px]">✓ {st.status}</span>
                      </div>
                      <p className="text-slate-500 text-[11px]">{st.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
          Upload a firmware project to view hardware peripheral taint vectors and AST context.
        </div>
      )}
    </div>
  );
};
