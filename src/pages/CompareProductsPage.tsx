import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { savedApi } from '../api/services';
import { SafetyReport } from '../types';
import { Button } from '../components/ui/Button';
import { SafetyScoreCircle } from '../components/ui/SafetyScoreCircle';
import { RiskBadge } from '../components/ui/RiskBadge';
import { 
  BarChart2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  ArrowLeft,
  Info,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  Legend, 
  Tooltip 
} from 'recharts';

export const CompareProductsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<SafetyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProductsToCompare() {
      const idsParam = searchParams.get('ids');
      try {
        const allSaved = await savedApi.getSavedProducts();
        if (idsParam) {
          const targetIds = idsParam.split(',');
          const matched = allSaved.filter((p) => targetIds.includes(p.id) || targetIds.includes(p.scanId));
          setProducts(matched.length >= 2 ? matched : allSaved.slice(0, 2));
        } else {
          setProducts(allSaved.slice(0, 2));
        }
      } catch {
        console.error('Failed to load comparison data');
      } finally {
        setIsLoading(false);
      }
    }
    loadProductsToCompare();
  }, [searchParams]);

  if (products.length < 2) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <BarChart2 className="w-12 h-12 text-teal-700 mx-auto" />
        <h2 className="text-2xl font-extrabold text-slate-900">Product Comparison Matrix</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please select at least 2 saved products to generate a side-by-side ingredient difference analysis.
        </p>
        <Button variant="primary" onClick={() => navigate('/saved')} leftIcon={<Plus className="w-4 h-4" />}>
          Select Products from Saved List
        </Button>
      </div>
    );
  }

  // Generate Radar Chart data across 5 health dimensions
  const radarData = [
    {
      subject: 'Safety Rating',
      ...Object.fromEntries(products.map((p, idx) => [`prod_${idx}`, p.score])),
    },
    {
      subject: 'Allergen Shield',
      ...Object.fromEntries(products.map((p, idx) => [`prod_${idx}`, Math.max(10, 100 - p.summaryCounts.allergens * 25)])),
    },
    {
      subject: 'Low Irritancy',
      ...Object.fromEntries(products.map((p, idx) => [`prod_${idx}`, Math.max(10, 100 - p.summaryCounts.irritants * 20)])),
    },
    {
      subject: 'Non-Toxicity',
      ...Object.fromEntries(products.map((p, idx) => [`prod_${idx}`, Math.max(10, 100 - p.summaryCounts.hazards * 30)])),
    },
    {
      subject: 'Purity Index',
      ...Object.fromEntries(products.map((p, idx) => [`prod_${idx}`, Math.round((1 - p.summaryCounts.unknown / p.summaryCounts.total) * 100)])),
    },
  ];

  const radarColors = ['#0f766e', '#059669', '#d97706'];

  // Calculate shared vs unique ingredients
  const getIngredientNames = (p: SafetyReport) => p.ingredients.map((i) => i.matchedName.toLowerCase());
  const sets = products.map(getIngredientNames);
  const sharedIngredients = sets[0].filter((ing) => sets.every((set) => set.includes(ing)));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900">Side-by-Side Product Comparison</h1>
          <p className="text-xs text-slate-500">
            Neutral risk comparison of detected allergens, chemical hazards, and ingredient differences.
          </p>
        </div>

        <div className="p-3 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-700 shrink-0" />
          <span>Informational comparison: Shows detected differences without certified medical endorsement.</span>
        </div>
      </div>

      {/* Interactive Recharts Radar / Spider Web Comparison */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Interactive Radar Chart
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 mt-2">
              Multi-Dimensional Safety Profile
            </h3>
            <p className="text-xs text-slate-500">Visualizing 5 safety dimensions across selected products</p>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" stroke="#475569" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
              {products.map((p, idx) => (
                <Radar
                  key={p.id}
                  name={p.productName}
                  dataKey={`prod_${idx}`}
                  stroke={radarColors[idx % radarColors.length]}
                  fill={radarColors[idx % radarColors.length]}
                  fillOpacity={0.4}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-6 flex flex-col justify-between"
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img
                  src={prod.imageUrl || 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=200&q=80'}
                  alt={prod.productName}
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase text-teal-700">{prod.category}</span>
                  <h3 className="text-base font-bold text-slate-900 truncate max-w-[180px]">{prod.productName}</h3>
                  <p className="text-xs text-slate-500">{prod.brand}</p>
                </div>
              </div>

              <div className="flex justify-center py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <SafetyScoreCircle score={prod.score} size="md" subtext={prod.riskLabel} />
              </div>
            </div>

            {/* Counts Breakdown */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
              <span className="font-bold text-slate-800">Detected Concerns:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-red-50 text-red-900 rounded-xl font-bold border border-red-200">
                  {prod.summaryCounts.allergens} Allergens
                </div>
                <div className="p-2.5 bg-orange-50 text-orange-900 rounded-xl font-bold border border-orange-200">
                  {prod.summaryCounts.irritants} Irritants
                </div>
                <div className="p-2.5 bg-purple-50 text-purple-900 rounded-xl font-bold border border-purple-200 col-span-2">
                  {prod.summaryCounts.hazards} Chemical Hazards Flagged
                </div>
              </div>
            </div>

            {/* Ingredient Highlights */}
            <div className="space-y-2 text-xs border-t border-slate-100 pt-4 flex-1">
              <span className="font-bold text-slate-800">Formulation Highlights:</span>
              <ul className="space-y-1 text-[11px] text-slate-600">
                {prod.ingredients.slice(0, 4).map((ing) => (
                  <li key={ing.id} className="flex items-center justify-between">
                    <span className="truncate max-w-[160px]">{ing.matchedName}</span>
                    <RiskBadge level={ing.riskLevel} size="sm" />
                  </li>
                ))}
              </ul>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/report/${prod.id}`)}
              className="w-full mt-4"
            >
              Full Safety Report
            </Button>
          </div>
        ))}
      </div>

      {/* Shared Ingredients Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-700" />
          Common Shared Ingredients Across Products
        </h3>
        <p className="text-xs text-slate-500">
          Ingredients present in all compared product formulations:
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {sharedIngredients.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No identical shared ingredients detected across formulas.</span>
          ) : (
            sharedIngredients.map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-teal-50 text-teal-900 border border-teal-200 rounded-xl text-xs font-semibold capitalize"
              >
                {item}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
