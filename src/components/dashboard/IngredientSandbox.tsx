import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { SafetyScoreCircle } from '../ui/SafetyScoreCircle';
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  RotateCcw,
  Lightbulb
} from 'lucide-react';

interface AvailableIngredient {
  id: string;
  name: string;
  category: string;
  penalty: number;
  isAllergen: boolean;
  isHazard: boolean;
  isClean: boolean;
  cleanAlternative?: string;
}

const PRESET_INGREDIENTS: AvailableIngredient[] = [
  { id: 'sb_1', name: 'Glycerin', category: 'Humectant', penalty: 0, isAllergen: false, isHazard: false, isClean: true },
  { id: 'sb_2', name: 'Ceramide NP', category: 'Barrier Repair', penalty: 0, isAllergen: false, isHazard: false, isClean: true },
  { id: 'sb_3', name: 'Zinc Oxide', category: 'Mineral Sunscreen', penalty: 0, isAllergen: false, isHazard: false, isClean: true },
  { id: 'sb_4', name: 'Fragrance / Parfum', category: 'Aroma', penalty: -22, isAllergen: true, isHazard: false, isClean: false, cleanAlternative: 'Unscented Essential Oil-Free Hydrogel' },
  { id: 'sb_5', name: 'Sodium Lauryl Sulfate (SLS)', category: 'Cleanser', penalty: -15, isAllergen: false, isHazard: false, isClean: false, cleanAlternative: 'Coco-Glucoside' },
  { id: 'sb_6', name: 'DMDM Hydantoin', category: 'Formaldehyde Releaser', penalty: -35, isAllergen: true, isHazard: true, isClean: false, cleanAlternative: 'Sodium Benzoate & Potassium Sorbate' },
  { id: 'sb_7', name: 'Methylparaben', category: 'Preservative', penalty: -18, isAllergen: false, isHazard: true, isClean: false, cleanAlternative: 'Ethylhexylglycerin' },
  { id: 'sb_8', name: 'Oxybenzone', category: 'UV Filter', penalty: -28, isAllergen: true, isHazard: true, isClean: false, cleanAlternative: 'Non-Nano Zinc Oxide' },
];

export const IngredientSandbox: React.FC = () => {
  const [formulation, setFormulation] = useState<AvailableIngredient[]>([
    PRESET_INGREDIENTS[0], // Glycerin
    PRESET_INGREDIENTS[1], // Ceramide NP
    PRESET_INGREDIENTS[3], // Fragrance
  ]);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  // Compute live safety score
  const totalPenalty = formulation.reduce((acc, curr) => acc + curr.penalty, 0);
  const calculatedScore = Math.max(10, Math.min(100, 100 + totalPenalty));

  const addIngredient = (item: AvailableIngredient) => {
    if (!formulation.some((i) => i.id === item.id)) {
      setFormulation([...formulation, item]);
    }
  };

  const removeIngredient = (id: string) => {
    setFormulation(formulation.filter((i) => i.id !== id));
  };

  const resetFormulation = () => {
    setFormulation([PRESET_INGREDIENTS[0], PRESET_INGREDIENTS[1]]);
  };

  const allergensInFormula = formulation.filter((i) => i.isAllergen);
  const hazardsInFormula = formulation.filter((i) => i.isHazard);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 text-teal-300 text-xs font-bold border border-teal-700/60">
            <FlaskConical className="w-4 h-4 text-teal-400" />
            <span>Interactive Formulation Lab Sandbox</span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            Custom Chemical Safety Simulator
          </h3>
          <p className="text-xs text-slate-400 max-w-xl">
            Mix and match cosmetic ingredients to observe real-time safety score calculations and test clean swaps.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={resetFormulation}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white shrink-0"
        >
          Reset Recipe
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Score Gauge & Live Warnings */}
        <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-800 space-y-6 flex flex-col items-center text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Calculated Formula Rating
          </span>

          <SafetyScoreCircle score={calculatedScore} size="lg" showLabel={false} />

          <div className="w-full space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>Formulation Ingredients:</span>
              <span className="font-bold text-white font-mono">{formulation.length} Items</span>
            </div>
            <div className="flex justify-between items-center text-red-400">
              <span>Allergens Flagged:</span>
              <span className="font-bold font-mono">{allergensInFormula.length}</span>
            </div>
            <div className="flex justify-between items-center text-purple-400">
              <span>Hazards Flagged:</span>
              <span className="font-bold font-mono">{hazardsInFormula.length}</span>
            </div>
          </div>
        </div>

        {/* Middle: Active Bottle Recipe */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-teal-400" />
              Current Formulation Mixture ({formulation.length})
            </h4>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2.5 min-h-[220px]">
            {formulation.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-12">
                Your bottle is empty. Click ingredients on the right to start formulating.
              </p>
            ) : (
              formulation.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                    item.isHazard
                      ? 'bg-purple-950/60 border-purple-800/80 text-purple-200'
                      : item.isAllergen
                      ? 'bg-red-950/60 border-red-800/80 text-red-200'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{item.name}</span>
                      {item.isHazard && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-900 text-purple-300 font-extrabold">
                          Hazard
                        </span>
                      )}
                      {item.isAllergen && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-900 text-red-300 font-extrabold">
                          Allergen
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">{item.category}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold ${
                        item.penalty === 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {item.penalty === 0 ? '+0' : `${item.penalty}`}
                    </span>
                    <button
                      onClick={() => removeIngredient(item.id)}
                      className="text-slate-400 hover:text-red-400 p-1"
                      title="Remove ingredient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Ingredient Ingredient Selector Shelf */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Ingredients to Mixture
            </h4>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {PRESET_INGREDIENTS.map((item) => {
              const isAdded = formulation.some((i) => i.id === item.id);
              return (
                <button
                  key={item.id}
                  disabled={isAdded}
                  onClick={() => addIngredient(item)}
                  className={`w-full p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between ${
                    isAdded
                      ? 'bg-slate-900/40 border-slate-800 opacity-40 cursor-not-allowed text-slate-500'
                      : 'bg-slate-900 border-slate-800 hover:border-teal-500 hover:bg-slate-850 text-slate-200'
                  }`}
                >
                  <div>
                    <p className="font-bold">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.category}</p>
                  </div>

                  {isAdded ? (
                    <span className="text-[10px] font-bold text-teal-400">Added</span>
                  ) : (
                    <span className="px-2 py-1 rounded bg-teal-900/60 text-teal-300 text-[10px] font-bold hover:bg-teal-700">
                      + Add
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Clean Swap Suggestion Box */}
      {formulation.some((i) => i.cleanAlternative) && (
        <div className="p-4 bg-teal-950/70 border border-teal-800/80 rounded-2xl flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h5 className="font-bold text-teal-200">AI Clean Swap Suggestions</h5>
            <div className="flex flex-wrap gap-2 pt-1">
              {formulation
                .filter((i) => i.cleanAlternative)
                .map((i) => (
                  <div key={i.id} className="p-2 bg-slate-900 rounded-xl border border-teal-800 text-[11px] text-slate-300">
                    <span className="text-red-400 line-through mr-1">{i.name}</span>
                    <span className="text-emerald-400 font-bold">➔ Swap for {i.cleanAlternative}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
