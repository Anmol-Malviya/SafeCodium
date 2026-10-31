import React from 'react';
import { Outlet } from 'react-router-dom';
import { StepWizardHeader } from './StepWizardHeader';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Top Guided Pipeline Step-by-Step Header (No left sidebar) */}
      <StepWizardHeader />

      {/* Main Full-Width Content Container with maximum screen real estate */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};
