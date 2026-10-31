import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  UploadCloud,
  Search,
  Wand2,
  GitCompare,
  ShieldCheck,
  FileText,
  ChevronRight,
  Database,
  Cpu,
  Layers,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Cookie,
} from 'lucide-react';
import { useProjectContext, PIPELINE_STEPS } from '../../context/ProjectContext';

const STEP_ICONS: Record<string, React.ReactNode> = {
  upload: <UploadCloud className="w-4 h-4" />,
  scanner: <Search className="w-4 h-4" />,
  repair: <Wand2 className="w-4 h-4" />,
  diff: <GitCompare className="w-4 h-4" />,
  verification: <ShieldCheck className="w-4 h-4" />,
  reports: <FileText className="w-4 h-4" />,
};

export const StepWizardHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    currentStepIndex,
    setCurrentStepIndex,
    goToNextStep,
    goToPreviousStep,
    refreshProjects,
  } = useProjectContext();

  // Match current URL with step if user navigated directly
  const activeStep = PIPELINE_STEPS.find((s) => s.path === location.pathname) || PIPELINE_STEPS[currentStepIndex - 1] || PIPELINE_STEPS[0];

  const handleStepClick = (stepIndex: number, path: string) => {
    setCurrentStepIndex(stepIndex);
    navigate(path);
  };

  const handleNext = () => {
    const nextIdx = Math.min(currentStepIndex + 1, PIPELINE_STEPS.length);
    const target = PIPELINE_STEPS[nextIdx - 1];
    goToNextStep();
    navigate(target.path);
  };

  const handlePrev = () => {
    const prevIdx = Math.max(currentStepIndex - 1, 1);
    const target = PIPELINE_STEPS[prevIdx - 1];
    goToPreviousStep();
    navigate(target.path);
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
      {/* Top Bar: Brand, Project Context Selector, Cookie Status & Quick Jump */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/upload')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-base">Safe Vibe AI</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                IoT Secure Synthesizer
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Autonomous Vulnerability Detection, Repair & Deterministic Verification</p>
          </div>
        </div>

        {/* Global Project & Context Selector */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600">Active Firmware:</span>
            {projects.length > 0 ? (
              <select
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden max-w-[220px] truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-amber-600 italic">No firmware uploaded</span>
            )}
            <button
              onClick={() => refreshProjects()}
              title="Refresh project list"
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex <= 1}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                currentStepIndex <= 1
                  ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white shadow-xs'
              }`}
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentStepIndex >= PIPELINE_STEPS.length}
              className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                currentStepIndex >= PIPELINE_STEPS.length
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
              }`}
            >
              <span>Next Step</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Step-by-Step Stepper Bar (Replaces Sidebar) */}
      <div className="bg-slate-50/80 border-t border-slate-200/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-1">
          {PIPELINE_STEPS.map((step, idx) => {
            const isCurrent = activeStep.slug === step.slug;
            const isCompleted = idx + 1 < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => handleStepClick(step.id, step.path)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-left transition shrink-0 group ${
                    isCurrent
                      ? 'bg-white border border-indigo-200 shadow-sm text-indigo-700'
                      : isCompleted
                      ? 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : isCompleted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {STEP_ICONS[step.slug]}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-bold leading-tight ${isCurrent ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {step.name}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-none mt-0.5 truncate max-w-[150px]">{step.shortDesc}</p>
                  </div>
                </button>

                {idx < PIPELINE_STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mx-1 hidden md:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </header>
  );
};

