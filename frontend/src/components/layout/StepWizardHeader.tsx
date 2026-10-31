import React, { useState } from 'react';
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
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useProjectContext, PIPELINE_STEPS } from '../../context/ProjectContext';

const STEP_ICONS: Record<string, React.ReactNode> = {
  upload: <UploadCloud className="w-3.5 h-3.5" />,
  scanner: <Search className="w-3.5 h-3.5" />,
  repair: <Wand2 className="w-3.5 h-3.5" />,
  diff: <GitCompare className="w-3.5 h-3.5" />,
  verification: <ShieldCheck className="w-3.5 h-3.5" />,
  reports: <FileText className="w-3.5 h-3.5" />,
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

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Match current URL with step if user navigated directly
  const activeStep =
    PIPELINE_STEPS.find((s) => s.path === location.pathname) ||
    PIPELINE_STEPS[currentStepIndex - 1] ||
    PIPELINE_STEPS[0];

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

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProjects();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sleek Minimal Single-Line Top Nav */}
        <div className="h-14 flex items-center justify-between gap-4">
          
          {/* Brand */}
          <div
            className="flex items-center space-x-2.5 cursor-pointer select-none shrink-0"
            onClick={() => navigate('/upload')}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              SV
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-bold text-slate-900 tracking-tight text-sm">Safe Vibe AI</span>
              <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">IoT Synthesizer</span>
            </div>
          </div>

          {/* Stepper Dots / Minimal Steps */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto no-scrollbar py-1">
            {PIPELINE_STEPS.map((step, idx) => {
              const isCurrent = activeStep.slug === step.slug;
              const isPassed = step.id < currentStepIndex;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id, step.path)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs transition shrink-0 ${
                    isCurrent
                      ? 'bg-slate-100 text-indigo-700 font-semibold'
                      : isPassed
                      ? 'text-slate-700 hover:bg-slate-50 font-medium'
                      : 'text-slate-400 hover:text-slate-600 font-normal'
                  }`}
                  title={`${step.name}: ${step.shortDesc}`}
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isPassed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {step.id}
                  </span>
                  <span className="hidden md:inline">{step.name.replace(/^\d+\.\s*/, '')}</span>
                  {idx < PIPELINE_STEPS.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-slate-300 ml-1 hidden lg:block" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Active Firmware Dropdown & Prev/Next Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Active Firmware Selector */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
              <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {projects.length > 0 ? (
                <select
                  value={activeProjectId}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-800 focus:outline-hidden max-w-[140px] truncate cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-[11px] text-slate-400">No project</span>
              )}
              <button
                onClick={onRefresh}
                title="Refresh project list"
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            {/* Step Controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrev}
                disabled={currentStepIndex <= 1}
                aria-label="Previous step"
                className={`p-1.5 rounded-lg border text-xs transition ${
                  currentStepIndex <= 1
                    ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentStepIndex >= PIPELINE_STEPS.length}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  currentStepIndex >= PIPELINE_STEPS.length
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                }`}
              >
                <span>Next</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};
