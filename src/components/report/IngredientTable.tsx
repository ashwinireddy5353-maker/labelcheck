import React, { useState } from 'react';
import { IngredientAnalysis } from '../../types';
import { RiskBadge } from '../ui/RiskBadge';
import { Search, Info, ShieldAlert, Sparkles } from 'lucide-react';

interface IngredientTableProps {
  ingredients: IngredientAnalysis[];
  onSelectIngredient: (ingredient: IngredientAnalysis) => void;
}

export const IngredientTable: React.FC<IngredientTableProps> = ({
  ingredients,
  onSelectIngredient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filterOptions = [
    { id: 'all', label: 'All Ingredients', count: ingredients.length },
    { id: 'allergens', label: 'Allergens', count: ingredients.filter((i) => i.isAllergen).length },
    { id: 'irritants', label: 'Irritants', count: ingredients.filter((i) => i.isIrritant).length },
    { id: 'hazards', label: 'Potential Hazards', count: ingredients.filter((i) => i.isHazardous).length },
    { id: 'unknown', label: 'Requires Review', count: ingredients.filter((i) => i.riskLevel === 'unknown').length },
    { id: 'low', label: 'Low Concern', count: ingredients.filter((i) => i.riskLevel === 'low').length },
  ];

  const filteredIngredients = ingredients.filter((item) => {
    const matchesSearch =
      item.rawName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.matchedName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'allergens') return item.isAllergen;
    if (activeFilter === 'irritants') return item.isIrritant;
    if (activeFilter === 'hazards') return item.isHazardous;
    if (activeFilter === 'unknown') return item.riskLevel === 'unknown';
    if (activeFilter === 'low') return item.riskLevel === 'low';

    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search ingredient by name or chemical group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-teal-600 focus:bg-white transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeFilter === filter.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{filter.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table Data */}
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">Ingredient (OCR Raw & Matched)</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Risk Level</th>
              <th className="py-3 px-4">Flags & Personal Match</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
            {filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  No ingredients match your active query or filter criteria.
                </td>
              </tr>
            ) : (
              filteredIngredients.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectIngredient(item)}
                  className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span>{item.matchedName}</span>
                        {item.personalizedMatch && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900"
                            title="Matches your profile allergies or avoid list"
                          >
                            <ShieldAlert className="w-3 h-3 text-amber-700" />
                            Profile Sensitivity
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 font-normal italic">
                        OCR: "{item.rawName}"
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 font-medium">
                    {item.category}
                  </td>

                  <td className="py-3.5 px-4">
                    <RiskBadge level={item.riskLevel} />
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {item.isAllergen && (
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-semibold text-[10px] border border-red-200">
                          Allergen
                        </span>
                      )}
                      {item.isIrritant && (
                        <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold text-[10px] border border-orange-200">
                          Irritant
                        </span>
                      )}
                      {item.isHazardous && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold text-[10px] border border-purple-200">
                          Hazardous
                        </span>
                      )}
                      {!item.isAllergen && !item.isIrritant && !item.isHazardous && item.riskLevel === 'low' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px]">
                          Clean
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIngredient(item);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-teal-700 font-bold hover:underline"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
