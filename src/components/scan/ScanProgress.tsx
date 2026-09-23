import React, { useEffect, useState } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  ScanText, 
  CheckCircle2, 
  Loader2, 
  ShieldAlert, 
  Database,
  FileCheck2
} from 'lucide-react';

interface ScanProgressProps {
  onComplete: () => void;
}

export const ScanProgress: React.FC<ScanProgressProps> = ({ onComplete }) => {
  const steps = [
    { title: 'Uploading image payload', icon: UploadCloud },
    { title: 'Preprocessing & contrast enhancement', icon: Sparkles },
    { title: 'Extracting text with AI OCR engine', icon: ScanText },
    { title: 'Cleaning & parsing ingredient names', icon: FileCheck2 },
    { title: 'Matching CosIng & EWG database entries', icon: Database },
    { title: 'Detecting allergens, irritants & chemical hazards', icon: ShieldAlert },
    { title: 'Generating personalized safety report', icon: CheckCircle2 },
  ];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(onComplete, 400);
          return prev;
        }
      });
    }, 450);

    return () => clearInterval(interval);
  }, [onComplete, steps.length]);

  const progressPercentage = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-teal-50 text-teal-700 rounded-2xl mb-1 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">AI Label Analysis in Progress</h3>
        <p className="text-xs text-slate-500">
          Extracting chemical formula names, validating fuzzy matches, and screening against your profile allergies.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-slate-700">
          <span>Processing Step {currentStepIndex + 1} of {steps.length}</span>
          <span className="text-teal-700">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="bg-gradient-to-r from-teal-600 to-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step List */}
      <div className="space-y-2.5 pt-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;

          return (
            <div
              key={idx}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                isDone
                  ? 'bg-emerald-50/60 text-emerald-900 border-emerald-200'
                  : isCurrent
                  ? 'bg-teal-50 text-teal-900 border-teal-300 shadow-xs ring-2 ring-teal-600/10'
                  : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 text-teal-700 animate-spin shrink-0" />
              ) : (
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="flex-1">{step.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
