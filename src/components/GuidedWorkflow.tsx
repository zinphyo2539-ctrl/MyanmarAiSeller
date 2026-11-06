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

export const GuidedWorkflow: React.FC<GuidedWorkflowProps> = ({
  steps,
  onFinish,
  onClose,
  lang,
  persistentContent
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progressPercent = Math.round(((currentStep + 1) / steps.length) * 100);

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
      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 backdrop-blur-2xl text-slate-100">
      {/* Header with Progress */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white">{step.title}</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5 font-mono">
            {lang === 'my'
              ? `အဆင့် ${currentStep + 1} / ${steps.length}`
              : `Step ${currentStep + 1} of ${steps.length}`}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-24 bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] text-purple-400 font-mono font-bold">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Instruction */}
      <div className="px-5 py-3 bg-purple-950/30 border-b border-purple-500/20 backdrop-blur-md">
        <p className="text-xs text-purple-300 font-medium leading-relaxed">{step.instruction}</p>
      </div>

      {/* Persistent Summary Slot */}
      {persistentContent && (
        <div className="bg-white/[0.02] border-b border-white/10 max-h-[30vh] overflow-y-auto">
          {persistentContent}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-slate-100">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <span className="shrink-0">⚠️</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}
        {step.content}
      </div>

      {/* Navigation */}
      <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-xl">
        <button
          type="button"
          onClick={handleBack}
          disabled={currentStep === 0 || loading}
          className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-300 font-semibold rounded-xl text-xs disabled:opacity-30 cursor-pointer transition-colors"
        >
          {lang === 'my' ? 'နောက်သို့' : 'Back'}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={step.canNext === false || loading}
          className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-30 shadow-lg shadow-purple-600/30 active:scale-95 transition-all cursor-pointer"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>
                {isLastStep
                  ? lang === 'my'
                    ? 'ပြီးဆုံးမည်'
                    : 'Finish'
                  : lang === 'my'
                  ? 'ရှေ့ဆက်မည်'
                  : 'Next'}
              </span>
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
              {isLastStep && <CheckCircle2 className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
