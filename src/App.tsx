import React, { useState } from 'react';
import { ClassroomProvider, useClassroom } from './context/ClassroomContext';
import { HeaderBar } from './components/HeaderBar';
import { StepNavigation } from './components/StepNavigation';
import { Step1StudentManager } from './components/Step1StudentManager';
import { Step2ClassroomView } from './components/Step2ClassroomView';
import { Step3SpecialConditions } from './components/Step3SpecialConditions';
import { HistoryModal } from './components/HistoryModal';
import { RevealModal } from './components/RevealModal';

const MainLayout: React.FC = () => {
  const { currentStep } = useClassroom();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRevealOpen, setIsRevealOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F9F6] flex flex-col text-[#1E293B]">
      {/* Top Header matching Screenshots */}
      <HeaderBar />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Step Navigation Bar (3 large rounded buttons) */}
        <StepNavigation />

        {/* Step Views */}
        {currentStep === 1 && <Step1StudentManager />}
        {currentStep === 2 && (
          <Step2ClassroomView
            onOpenHistoryModal={() => setIsHistoryOpen(true)}
            onOpenRevealModal={() => setIsRevealOpen(true)}
          />
        )}
        {currentStep === 3 && <Step3SpecialConditions />}
      </main>

      {/* Modals */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <RevealModal
        isOpen={isRevealOpen}
        onClose={() => setIsRevealOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ClassroomProvider>
      <MainLayout />
    </ClassroomProvider>
  );
}
