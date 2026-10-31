import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Loader2,
  FileCode,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ArrowRight,
  PackageCheck,
  FileCheck2,
} from 'lucide-react';
import {
  listProjects,
  triggerAutonomousPipeline,
  getPipelineJobStatus,
  getLatestProjectPipelineJob,
  getProjectManifest,
  downloadRepairedProjectUrl,
  downloadOriginalProjectUrl,
  ProjectData,
  PipelineJobData,
  StageInfoData,
} from '../services/api';
import { useProjectContext } from '../context/ProjectContext';

export const AutoPipeline: React.FC = () => {
  const navigate = useNavigate();
  const { activeProjectId, setActiveProjectId, projects, refreshProjects } = useProjectContext();

  const [selectedProjectId, setSelectedProjectId] = useState<string>(activeProjectId || '');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [job, setJob] = useState<PipelineJobData | null>(null);
  const [manifest, setManifest] = useState<Record<string, any> | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState<number | null>(null);

  // Sync active project
  useEffect(() => {
    if (activeProjectId && activeProjectId !== selectedProjectId) {
      setSelectedProjectId(activeProjectId);
    }
  }, [activeProjectId]);

  // Load latest pipeline job for the selected project
  useEffect(() => {
    if (!selectedProjectId) return;

    const loadData = async () => {
      try {
        const [latestJob, projManifest] = await Promise.all([
          getLatestProjectPipelineJob(selectedProjectId).catch(() => null),
          getProjectManifest(selectedProjectId).catch(() => null),
        ]);
        if (latestJob) {
          setJob(latestJob);
          if (latestJob.status === 'running') {
            setIsRunning(true);
          }
        } else {
          setJob(null);
        }
        setManifest(projManifest);
      } catch (err) {
        console.error('Failed to load project pipeline data', err);
      }
    };

    loadData();
  }, [selectedProjectId]);

  // Polling loop for active jobs
  useEffect(() => {
    if (!isRunning || !job?.job_id) return;

    const timer = setInterval(async () => {
      try {
        const updated = await getPipelineJobStatus(job.job_id);
        setJob(updated);
        if (updated.status === 'completed' || updated.status === 'failed') {
          setIsRunning(false);
          await refreshProjects();
        }
      } catch (err) {
        console.error('Error polling pipeline status', err);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [isRunning, job?.job_id]);

  const handleStartPipeline = async () => {
    if (!selectedProjectId) {
      setErrorMsg('Please select a project first.');
      return;
    }
    setErrorMsg(null);
    setIsRunning(true);

    try {
      const newJob = await triggerAutonomousPipeline(selectedProjectId, selectedProvider);
      setJob(newJob);
    } catch (err: any) {
      setIsRunning(false);
      setErrorMsg(err.response?.data?.detail || err.message || 'Failed to trigger automated pipeline');
    }
  };

  const getStageBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>VERIFIED / DONE</span>
          </span>
        );
      case 'RUNNING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            <span>PROCESSING</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>FAILED</span>
          </span>
        );
      case 'SKIPPED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
            <span>SKIPPED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Autonomous Synthesizer &amp; Verifier
            </span>
            <span className="text-xs font-semibold text-slate-500">End-to-End Orchestrator</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">Autonomous Verification Pipeline</h1>
          <p className="text-sm text-slate-500">
            Upload &rarr; Validate &rarr; Store &rarr; Analyze &rarr; Detect &rarr; Explain &rarr; Patch &rarr; Verify &rarr; Report &rarr; Download.
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setActiveProjectId(e.target.value);
            }}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">-- Select Ingested Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.file_count} files)
              </option>
            ))}
          </select>

          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            disabled={isRunning}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
          >
            <option value="gemini">Google Gemini (Primary)</option>
            <option value="openai">OpenAI GPT-4o</option>
            <option value="ollama">Ollama (Local Gemma 3)</option>
          </select>

          <button
            onClick={handleStartPipeline}
            disabled={isRunning || !selectedProjectId}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-2 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Orchestrating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Automated Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Project Manifest Bar */}
      {manifest && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Framework</span>
              <span className="font-bold text-slate-800">{manifest.framework_type?.toUpperCase()}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Source Files</span>
              <span className="font-bold text-slate-800">{manifest.source_files?.length || 0} indexed</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Entry Points</span>
              <span className="font-bold text-slate-800">{manifest.entry_points?.join(', ') || 'Auto-detected'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={downloadOriginalProjectUrl(selectedProjectId)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Original Source</span>
            </a>

            {job?.status === 'completed' && (
              <a
                href={downloadRepairedProjectUrl(selectedProjectId)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-xs"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Download Repaired Project (.zip)</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Active Job Progress Bar */}
      {job && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-400 font-bold">{job.job_id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                  job.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                }`}>
                  {job.status.toUpperCase()}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Current Stage: <span className="text-emerald-700">{job.current_stage.replace('_', ' ')}</span>
              </h2>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black text-slate-900">{job.progress_percentage}%</div>
              <span className="text-[11px] text-slate-400">Total Completion</span>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                job.status === 'completed' ? 'bg-emerald-500' :
                job.status === 'failed' ? 'bg-rose-500' : 'bg-blue-600'
              }`}
              style={{ width: `${job.progress_percentage}%` }}
            />
          </div>

          {/* Final Verdict Summary Banner if completed */}
          {job.status === 'completed' && job.summary_data && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">
                    Final Verification Verdict: {job.summary_data.final_verdict}
                  </div>
                  <div className="text-[11px] text-emerald-700">
                    Total Elapsed: {job.summary_data.total_elapsed_seconds}s • Passport:{' '}
                    <span className="font-mono">{job.summary_data.passport_id}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={downloadRepairedProjectUrl(selectedProjectId)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Repaired Firmware (.zip)</span>
                </a>
                <button
                  onClick={() => navigate('/reports')}
                  className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition"
                >
                  <span>View Passport</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9-Stage Execution Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            9-Stage Autonomous Pipeline Ledger
          </h2>
          <span className="text-[11px] text-slate-400">Deterministic Rule 6 Ground-Truth Verification</span>
        </div>

        <div className="divide-y divide-slate-100">
          {job?.stages && job.stages.length > 0 ? (
            job.stages.map((st, idx) => (
              <div key={st.stage_id} className="p-4 hover:bg-slate-50/50 transition flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span>{st.name}</span>
                      {st.elapsed_seconds > 0 && (
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({st.elapsed_seconds}s)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{st.details || 'Awaiting stage trigger...'}</p>
                    {st.evidence && Object.keys(st.evidence).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(st.evidence).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="shrink-0">{getStageBadge(st.status)}</div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-xs text-slate-400 space-y-2">
              <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
              <p>No active pipeline run. Select a project above and click &quot;Start Automated Pipeline&quot;.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
