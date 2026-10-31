import React, { createContext, useContext, useState, useEffect } from 'react';
import { cookieManager } from '../services/cookies';
import { ProjectData, listProjects } from '../services/api';

export interface PipelineStep {
  id: number;
  slug: string;
  name: string;
  shortDesc: string;
  path: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 1,
    slug: 'upload',
    name: '1. Ingest Firmware',
    shortDesc: 'Source upload & shadow isolation',
    path: '/upload',
  },
  {
    id: 2,
    slug: 'scanner',
    name: '2. Static Scan & Context',
    shortDesc: 'CWE detection & IoT context analysis',
    path: '/scanner',
  },
  {
    id: 3,
    slug: 'repair',
    name: '3. AI Repair Studio',
    shortDesc: 'Root cause reasoning & diff synthesis',
    path: '/repair',
  },
  {
    id: 4,
    slug: 'diff',
    name: '4. Diff & Critique',
    shortDesc: 'Monaco side-by-side & AST checks',
    path: '/diff',
  },
  {
    id: 5,
    slug: 'verification',
    name: '5. Ground-Truth Verify',
    shortDesc: 'Dual compiler, ASan/UBSan & profiling',
    path: '/verification',
  },
  {
    id: 6,
    slug: 'reports',
    name: '6. Security Passport',
    shortDesc: 'Deterministic audit & cryptographic passport',
    path: '/reports',
  },
];

interface ProjectContextType {
  // Current active project
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  projects: ProjectData[];
  refreshProjects: () => Promise<void>;
  currentProject: ProjectData | undefined;

  // Pipeline Step Tracking
  currentStepIndex: number;
  setCurrentStepIndex: (step: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Selected Vulnerability & Patch Context across steps
  selectedVulnId: string;
  setSelectedVulnId: (id: string) => void;
  selectedPatchId: string;
  setSelectedPatchId: (id: string) => void;

  // User Cookie Preferences
  aiProvider: 'gemini' | 'openai' | 'ollama';
  setAiProvider: (provider: 'gemini' | 'openai' | 'ollama') => void;
  analyticsAutoRefresh: boolean;
  setAnalyticsAutoRefresh: (val: boolean) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load saved active project from cookies
  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    return cookieManager.get('safevibe_active_project') || '';
  });

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    const saved = cookieManager.get('safevibe_step');
    return saved ? parseInt(saved, 10) : 1;
  });

  const [selectedVulnId, setSelectedVulnIdState] = useState<string>(() => {
    return cookieManager.get('safevibe_selected_vuln') || '';
  });

  const [selectedPatchId, setSelectedPatchIdState] = useState<string>(() => {
    return cookieManager.get('safevibe_selected_patch') || '';
  });

  const [aiProvider, setAiProviderState] = useState<'gemini' | 'openai' | 'ollama'>(() => {
    return (cookieManager.get('safevibe_ai_provider') as 'gemini' | 'openai' | 'ollama') || 'gemini';
  });

  const [analyticsAutoRefresh, setAnalyticsAutoRefreshState] = useState<boolean>(() => {
    return cookieManager.get('safevibe_auto_refresh') !== 'false';
  });

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    if (id) {
      cookieManager.set('safevibe_active_project', id, { days: 30 });
    } else {
      cookieManager.remove('safevibe_active_project');
    }
  };

  const setSelectedVulnId = (id: string) => {
    setSelectedVulnIdState(id);
    if (id) {
      cookieManager.set('safevibe_selected_vuln', id, { days: 14 });
    } else {
      cookieManager.remove('safevibe_selected_vuln');
    }
  };

  const setSelectedPatchId = (id: string) => {
    setSelectedPatchIdState(id);
    if (id) {
      cookieManager.set('safevibe_selected_patch', id, { days: 14 });
    } else {
      cookieManager.remove('safevibe_selected_patch');
    }
  };

  const setAiProvider = (provider: 'gemini' | 'openai' | 'ollama') => {
    setAiProviderState(provider);
    cookieManager.set('safevibe_ai_provider', provider, { days: 60 });
  };

  const setAnalyticsAutoRefresh = (val: boolean) => {
    setAnalyticsAutoRefreshState(val);
    cookieManager.set('safevibe_auto_refresh', val ? 'true' : 'false', { days: 60 });
  };

  const setStep = (step: number) => {
    const clamped = Math.max(1, Math.min(step, PIPELINE_STEPS.length));
    setCurrentStepIndex(clamped);
    cookieManager.set('safevibe_step', clamped.toString(), { days: 7 });
  };

  const goToNextStep = () => {
    setStep(currentStepIndex + 1);
  };

  const goToPreviousStep = () => {
    setStep(currentStepIndex - 1);
  };

  const refreshProjects = async () => {
    try {
      const res = await listProjects();
      setProjects(res);
      // Auto select first project if none is active or active is stale
      if (res.length > 0) {
        const exists = res.some((p) => p.id === activeProjectId);
        if (!exists) {
          setActiveProjectId(res[0].id);
        }
      } else {
        setActiveProjectId('');
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    refreshProjects();
  }, []);

  const currentProject = projects.find((p) => p.id === activeProjectId);

  return (
    <ProjectContext.Provider
      value={{
        activeProjectId,
        setActiveProjectId,
        projects,
        refreshProjects,
        currentProject,
        currentStepIndex,
        setCurrentStepIndex: setStep,
        goToNextStep,
        goToPreviousStep,
        selectedVulnId,
        setSelectedVulnId,
        selectedPatchId,
        setSelectedPatchId,
        aiProvider,
        setAiProvider,
        analyticsAutoRefresh,
        setAnalyticsAutoRefresh,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};

