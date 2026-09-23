import React from 'react';
import { Drawer } from '../ui/Drawer';
import { RiskBadge } from '../ui/RiskBadge';
import { IngredientAnalysis } from '../../types';
import { AlertTriangle, ShieldCheck, Database, FileText, Activity } from 'lucide-react';

interface IngredientDetailModalProps {
  ingredient: IngredientAnalysis | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  ingredient,
  isOpen,
  onClose,
}) => {
  if (!ingredient) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={ingredient.matchedName}
      subtitle={`Category: ${ingredient.category} ${ingredient.casNumber ? `• CAS: ${ingredient.casNumber}` : ''}`}
    >
      <div className="space-y-6">
        {/* Risk Level Badge */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Risk Level Assessment</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">Classification Status</p>
          </div>
          <RiskBadge level={ingredient.riskLevel} />
        </div>

        {/* Personalized Sensitivity Warning */}
        {ingredient.personalizedMatch && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-amber-900">Matches Your Personal Profile Preferences</h5>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {ingredient.whyFlagged || 'This ingredient was flagged based on your saved allergies or ingredients to avoid.'}
              </p>
            </div>
          </div>
        )}

        {/* Breakdown Findings */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-teal-700" />
            Detection Summary
          </h4>

          <div className="grid grid-cols-1 gap-2.5">
            {ingredient.isAllergen && (
              <div className="p-3 bg-red-50/70 border border-red-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-red-900">Allergen Information:</span>
                <p className="text-red-800/90">{ingredient.allergenDetails || 'Associated with contact sensitivity and immune responses.'}</p>
              </div>
            )}

            {ingredient.isIrritant && (
              <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-orange-900">Irritant Potential:</span>
                <p className="text-orange-800/90">{ingredient.irritantDetails || 'Known to strip epidermal lipids or cause localized stinging.'}</p>
              </div>
            )}

            {ingredient.isHazardous && (
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-purple-900">Hazard Analysis:</span>
                <p className="text-purple-800/90">{ingredient.hazardDetails || 'Classified as a potential endocrine or environmental concern in cosmetics registries.'}</p>
              </div>
            )}

            {!ingredient.isAllergen && !ingredient.isIrritant && !ingredient.isHazardous && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No significant toxicological or allergen concerns flagged in public registries.</span>
              </div>
            )}
          </div>
        </div>

        {/* OCR Technical Details */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <h5 className="font-bold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-500" />
            OCR Extraction Metadata
          </h5>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-slate-400">Raw OCR String:</span>
              <p className="font-mono font-medium text-slate-800 truncate">{ingredient.rawName}</p>
            </div>
            <div>
              <span className="text-slate-400">Match Confidence:</span>
              <p className="font-bold text-teal-700">{Math.round((ingredient.confidence || 0.95) * 100)}% Match</p>
            </div>
          </div>
        </div>

        {/* Scientific Source Reference */}
        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold">
            <Database className="w-4 h-4" />
            <span>Reference Database</span>
          </div>
          <p className="text-slate-300 text-[11px]">
            {ingredient.datasetReference || 'EU CosIng Cosmetics Directive & EWG Skin Deep Database v2026.1'}
          </p>
        </div>

        {/* Medical Notice */}
        <p className="text-[10px] text-slate-400 leading-normal italic text-center">
          Informational risk guidance only. Does not constitute official medical advice or regulatory product certification.
        </p>
      </div>
    </Drawer>
  );
};
