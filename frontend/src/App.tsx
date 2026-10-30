import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="upload" element={<ProjectUpload />} />
          <Route path="analysis" element={<CodeAnalysis />} />
          <Route path="scanner" element={<VulnerabilityScanner />} />
          <Route path="vulnerabilities/:id" element={<VulnerabilityDetails />} />
          <Route path="repair" element={<AiRepairStudio />} />
          <Route path="diff" element={<CodeDiffReview />} />
          <Route path="verification" element={<VerificationCenter />} />
          <Route path="reports" element={<SecurityReports />} />
          <Route path="history" element={<ProjectHistory />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

