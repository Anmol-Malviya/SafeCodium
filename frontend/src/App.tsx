import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProjectProvider } from './context/ProjectContext';
import { MainLayout } from './components/layout/MainLayout';
import { VsCodeStudio } from './pages/VsCodeStudio';
import { Dashboard } from './pages/Dashboard';
import { AutoPipeline } from './pages/AutoPipeline';
import { ProjectUpload } from './pages/ProjectUpload';
import { CodeAnalysis } from './pages/CodeAnalysis';
import { VulnerabilityScanner } from './pages/VulnerabilityScanner';
import { VulnerabilityDetails } from './pages/VulnerabilityDetails';
import { AiRepairStudio } from './pages/AiRepairStudio';
import { CodeDiffReview } from './pages/CodeDiffReview';
import { VerificationCenter } from './pages/VerificationCenter';
import { SecurityReports } from './pages/SecurityReports';
import { ProjectHistory } from './pages/ProjectHistory';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <ProjectProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            {/* Primary Simplest VS Code Experience */}
            <Route index element={<VsCodeStudio />} />
            <Route path="studio" element={<VsCodeStudio />} />

            {/* Step 1: Ingest Firmware */}
            <Route path="upload" element={<ProjectUpload />} />
            
            {/* Autonomous Orchestrator */}
            <Route path="pipeline" element={<AutoPipeline />} />

            {/* Step 2: Static Scanner & Context Analytics */}
            <Route path="scanner" element={<VulnerabilityScanner />} />
            <Route path="analysis" element={<CodeAnalysis />} />
            <Route path="vulnerabilities/:id" element={<VulnerabilityDetails />} />

            {/* Step 3: AI Repair Studio */}
            <Route path="repair" element={<AiRepairStudio />} />

            {/* Step 4: Code Diff & Independent Critique */}
            <Route path="diff" element={<CodeDiffReview />} />

            {/* Step 5: Ground-Truth Verification */}
            <Route path="verification" element={<VerificationCenter />} />

            {/* Step 6: Security Reports & Cryptographic Passport */}
            <Route path="reports" element={<SecurityReports />} />

            {/* Auxiliary Pages */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="history" element={<ProjectHistory />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ProjectProvider>
  );
};

export default App;
