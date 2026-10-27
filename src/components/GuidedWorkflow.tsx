import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

interface WorkflowStep {
  title: string;
  instruction: string;
  content: React.ReactNode;
  canNext?: boolean;
  onStepNext?: () => Promise<boolean | void>;
}

interface GuidedWorkflowProps {
  steps: WorkflowStep[];
  onFinish: () => void;
  onClose: () => void;
  lang: 'my' | 'en';
  persistentContent?: React.ReactNode;
}

export const GuidedWorkflow: React.FC<GuidedWorkflowProps> = ({ steps, onFinish, onClose, lang, persistentContent }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    setError(null);
    if (step.onStepNext) {
      setLoading(true);
      try {
        const success = await step.onStepNext();
        setLoading(false);
        if (success === false) return;
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'An error occurred');
        return;
      }
    }

    if (isLastStep) {
      onFinish();
    } else {
      setCurrentStep(s => Math.min(s + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(s => Math.max(s - 1, 0));
  };

  return (
    <div className="flex flex-col h-full bg-[#181810]">
      {/* Header with Progress */}
      <div className="p-4 border-b border-[#393426] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#F5F2E8]">{step.title}</h2>
          <p className="text-[10px] text-[#817D70] uppercase tracking-wider mt-0.5">
            {lang === 'my' ? `အဆင့် ${currentStep + 1} / ${steps.length}` : `Step ${currentStep + 1} / ${steps.length}`}
          </p>
        </div>
        <div className="text-[10px] text-[#C9A227] font-mono">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
        </div>
      </div>

      {/* Instruction */}
      <div className="px-4 py-3 bg-[#1E1D14] border-b border-[#393426]">
        <p className="text-xs text-[#E0BD55] font-medium">{step.instruction}</p>
      </div>

      {/* Persistent Summary Slot */}
      {persistentContent && (
        <div className="bg-[#11110D] border-b border-[#393426] max-h-[30vh] overflow-y-auto">
          {persistentContent}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-950/20 border border-red-800/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <span className="shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {step.content}
      </div>

      {/* Navigation */}
      <div className="p-4 border-t border-[#393426] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0 || loading}
          className="px-4 py-2 bg-[#11110D] hover:bg-[#252419] border border-[#393426] text-[#B9B5A7] font-semibold rounded-xl text-xs disabled:opacity-40"
        >
          {lang === 'my' ? 'နောက်သို့' : 'Back'}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={step.canNext === false || loading}
          className="px-5 py-2 bg-[#C9A227] hover:bg-[#A88419] text-[#0B0B09] font-bold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-40"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <span>{isLastStep ? (lang === 'my' ? 'ပြီးဆုံးမည်' : 'Finish') : (lang === 'my' ? 'ရှေ့ဆက်မည်' : 'Next')}</span>
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
              {isLastStep && <CheckCircle2 className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
