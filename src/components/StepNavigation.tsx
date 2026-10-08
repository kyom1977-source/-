import React from 'react';
import { useClassroom } from '../context/ClassroomContext';

export const StepNavigation: React.FC = () => {
  const { currentStep, setCurrentStep, students } = useClassroom();

  const steps = [
    {
      num: 1,
      title: '학생 명단 관리',
      badge: `${students.length}명`,
    },
    {
      num: 2,
      title: '교실 구조 & 기본 설정',
      badge: null,
    },
    {
      num: 3,
      title: '특수 조건 & 자리 뽑기',
      badge: null,
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 no-print">
      {steps.map(step => {
        const isActive = currentStep === step.num;
        return (
          <button
            key={step.num}
            type="button"
            onClick={() => setCurrentStep(step.num as 1 | 2 | 3)}
            className={`py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-2xs ${
              isActive
                ? 'bg-[#436850] text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-[#E5EBE5]'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                isActive
                  ? 'bg-white/25 text-white'
                  : 'bg-[#EDF5F0] text-[#436850]'
              }`}
            >
              {step.num}
            </span>
            <span>{step.title}</span>
            {step.badge && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-[#EDF5F0] text-[#436850]'
                }`}
              >
                {step.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
