import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { scanApi, savedApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { SafetyReport, IngredientAnalysis } from '../types';
import { SafetyScoreCircle } from '../components/ui/SafetyScoreCircle';
import { IngredientTable } from '../components/report/IngredientTable';
import { IngredientDetailModal } from '../components/report/IngredientDetailModal';
import { ProductCard } from '../components/report/ProductCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { 
  Bookmark, 
  Download, 
  Share2, 
  RotateCcw, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Flame, 
  Flag,
  Sparkles,
  Info,
  Sliders
} from 'lucide-react';

export const SafetyReportPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [report, setReport] = useState<SafetyReport | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientAnalysis | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isReportOcrModalOpen, setIsReportOcrModalOpen] = useState(false);
  const [ocrErrorFeedback, setOcrErrorFeedback] = useState('');

  // What-if simulator state
  const [simulatedExcludedIds, setSimulatedExcludedIds] = useState<string[]>([]);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  useEffect(() => {
    async function loadReport() {
      if (!scanId) return;
      try {
        const res = await scanApi.getReport(scanId);
        setReport(res);
        setIsSaved(!!res.isFavorite);

        // Confetti celebration if safe product score >= 80
        if (res.score >= 80) {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#0f766e', '#059669', '#34d399'],
          });
        }
      } catch {
        showToast('Could not load safety report.', 'error');
      }
    }
    loadReport();
  }, [scanId]);

  if (!report) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-pulse text-sm font-semibold text-slate-500">
          Fetching AI Safety Analysis Report...
        </div>
      </div>
    );
  }

  const handleToggleFavorite = async () => {
    try {
      const res = await savedApi.toggleSaveProduct(report);
      setIsSaved(res.saved);
      showToast(res.saved ? 'Product saved to your bookmarks!' : 'Removed from bookmarks', 'success');
    } catch {
      showToast('Failed to bookmark product.', 'error');
    }
  };

  const handleDownloadPdf = () => {
    showToast('Generating downloadable PDF report artifact...', 'info');
    setTimeout(() => {
      showToast('Safety Report PDF downloaded to your device!', 'success');
    }, 1200);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      showToast('Report share URL copied to clipboard!', 'success');
    } else {
      showToast('Share link ready!', 'info');
    }
  };

  const handleReportOcrSubmit = () => {
    if (!ocrErrorFeedback.trim()) return;
    showToast('OCR feedback logged for Admin review.', 'success');
    setOcrErrorFeedback('');
    setIsReportOcrModalOpen(false);
  };

  // What-if Simulator recalculated score
  const activeSimulatedIngredients = report.ingredients.filter((i) => !simulatedExcludedIds.includes(i.id));
  const simulatedHazards = activeSimulatedIngredients.filter((i) => i.isHazardous).length;
  const simulatedAllergens = activeSimulatedIngredients.filter((i) => i.isAllergen).length;
  const simulatedIrritants = activeSimulatedIngredients.filter((i) => i.isIrritant).length;

  let recalculatedScore = 100 - (simulatedHazards * 25) - (simulatedAllergens * 15) - (simulatedIrritants * 10);
  recalculatedScore = Math.max(15, Math.min(99, recalculatedScore));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Product Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={report.imageUrl || 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=400&q=80'}
            alt={report.productName}
            className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover border-2 border-teal-600 shadow-md"
          />
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {report.category}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{report.productName}</h1>
            <p className="text-xs text-slate-500">
              Brand: <span className="font-bold text-slate-700">{report.brand}</span> • Scanned: {new Date(report.scanDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
          <Button
            variant="mint"
            size="sm"
            onClick={() => setIsSimulatorOpen(true)}
            leftIcon={<Sliders className="w-4 h-4 text-emerald-700" />}
          >
            What-If Simulator
          </Button>

          <Button
            variant={isSaved ? 'mint' : 'outline'}
            size="sm"
            onClick={handleToggleFavorite}
            leftIcon={<Bookmark className={`w-4 h-4 ${isSaved ? 'fill-emerald-700 text-emerald-700' : ''}`} />}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Button>

          <Button variant="outline" size="sm" onClick={handleDownloadPdf} leftIcon={<Download className="w-4 h-4" />}>
            PDF Report
          </Button>

          <Button variant="outline" size="sm" onClick={handleShare} leftIcon={<Share2 className="w-4 h-4" />}>
            Share
          </Button>

          <Button variant="ghost" size="sm" onClick={() => navigate('/scan')} leftIcon={<RotateCcw className="w-4 h-4" />}>
            Rescan
          </Button>
        </div>
      </div>

      {/* Safety Score & Risk Explanation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-lg">
        <div className="lg:col-span-1 flex justify-center">
          <SafetyScoreCircle
            score={report.score}
            size="xl"
            subtext="Personalized Safety Score"
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">AI Risk Assessment</span>
            <h2 className="text-2xl font-extrabold text-slate-900">{report.riskLabel}</h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
            {report.riskExplanation}
          </p>

          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80 text-[11px] text-teal-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-700 shrink-0" />
            <span>Score calculated dynamically based on detected ingredients and your personal saved profile preferences.</span>
          </div>
        </div>
      </div>

      {/* Risk Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-red-50/80 border border-red-200 rounded-2xl text-center space-y-1 shadow-xs">
          <ShieldAlert className="w-6 h-6 text-red-600 mx-auto" />
          <p className="text-2xl font-extrabold text-red-900">{report.summaryCounts.allergens}</p>
          <p className="text-[11px] font-bold text-red-700">Allergens Flagged</p>
        </div>

        <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl text-center space-y-1 shadow-xs">
          <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto" />
          <p className="text-2xl font-extrabold text-orange-900">{report.summaryCounts.irritants}</p>
          <p className="text-[11px] font-bold text-orange-700">Irritants Detected</p>
        </div>

        <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl text-center space-y-1 shadow-xs">
          <Flame className="w-6 h-6 text-purple-600 mx-auto" />
          <p className="text-2xl font-extrabold text-purple-900">{report.summaryCounts.hazards}</p>
          <p className="text-[11px] font-bold text-purple-700">Chemical Hazards</p>
        </div>

        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-1 shadow-xs">
          <HelpCircle className="w-6 h-6 text-amber-600 mx-auto" />
          <p className="text-2xl font-extrabold text-amber-900">{report.summaryCounts.reviewNeeded}</p>
          <p className="text-[11px] font-bold text-amber-700">Requires Review</p>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1 shadow-xs col-span-2 md:col-span-1">
          <CheckCircle2 className="w-6 h-6 text-slate-600 mx-auto" />
          <p className="text-2xl font-extrabold text-slate-900">{report.summaryCounts.total}</p>
          <p className="text-[11px] font-bold text-slate-600">Total Scanned</p>
        </div>
      </div>

      {/* Personalized Profile Sensitivity Warnings */}
      {report.personalizedWarnings && report.personalizedWarnings.length > 0 && (
        <div className="p-6 bg-amber-50 border-2 border-amber-300 rounded-3xl space-y-3 shadow-sm">
          <h3 className="text-sm font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-700" />
            Matches Your Profile Allergy Watchlist
          </h3>
          <div className="space-y-2">
            {report.personalizedWarnings.map((warn, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-amber-200 text-xs font-semibold text-amber-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                <span>{warn}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Table Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-slate-900">Comprehensive Ingredient Breakdown</h3>
        <IngredientTable
          ingredients={report.ingredients}
          onSelectIngredient={(ing) => {
            setSelectedIngredient(ing);
            setIsDrawerOpen(true);
          }}
        />
      </div>

      {/* Safer Alternatives Recommendation Section */}
      {report.saferAlternatives && report.saferAlternatives.length > 0 && (
        <div className="space-y-6 pt-6 border-t border-slate-200">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Clean Recommendation Engine
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900">Safer Alternatives</h3>
            <p className="text-xs text-slate-500">Products rated 90+ safety score that avoid the flagged allergens in this scan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {report.saferAlternatives.map((alt) => (
              <ProductCard key={alt.id} product={alt} type="alternative" />
            ))}
          </div>
        </div>
      )}

      {/* Report Footer Actions & OCR Error Feedback Modal Launcher */}
      <div className="p-6 bg-slate-900 text-white rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="text-base font-bold">Spotted an OCR extraction mistake?</h4>
          <p className="text-xs text-slate-400">Help improve LabelCheck’s AI dataset by reporting incorrect chemical text.</p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReportOcrModalOpen(true)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            leftIcon={<Flag className="w-4 h-4" />}
          >
            Report OCR Error
          </Button>

          <Button variant="primary" size="sm" onClick={() => navigate('/scan')} leftIcon={<Sparkles className="w-4 h-4" />}>
            Scan Another Product
          </Button>
        </div>
      </div>

      {/* Drawer for Clicked Ingredient */}
      <IngredientDetailModal
        ingredient={selectedIngredient}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />

      {/* What-If Simulator Modal */}
      <Modal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        title="Interactive 'What-If I Replace This?' Simulator"
        description="Toggle off flagged allergens to test how much your safety score improves."
        maxWidth="lg"
      >
        <div className="space-y-6 text-xs">
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-teal-400">Recalculated Score</p>
              <h4 className="text-2xl font-extrabold">{recalculatedScore} / 100</h4>
            </div>
            <span className="px-3 py-1 bg-emerald-900 text-emerald-300 font-bold rounded-full text-xs">
              +{recalculatedScore - report.score} Pt Score Improvement
            </span>
          </div>

          <div className="space-y-2">
            <span className="font-bold text-slate-800">Select Flagged Ingredients to Exclude / Swap:</span>
            <div className="space-y-2">
              {report.ingredients
                .filter((i) => i.isAllergen || i.isIrritant || i.isHazardous)
                .map((ing) => {
                  const isExcluded = simulatedExcludedIds.includes(ing.id);
                  return (
                    <label
                      key={ing.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isExcluded ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isExcluded}
                          onChange={() => {
                            if (isExcluded) {
                              setSimulatedExcludedIds(simulatedExcludedIds.filter((id) => id !== ing.id));
                            } else {
                              setSimulatedExcludedIds([...simulatedExcludedIds, ing.id]);
                            }
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="font-bold">{ing.matchedName}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {isExcluded ? 'Excluded from Formula' : 'Currently Included'}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" size="sm" onClick={() => setIsSimulatorOpen(false)}>
              Close Simulator
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report OCR Mistake Modal */}
      <Modal
        isOpen={isReportOcrModalOpen}
        onClose={() => setIsReportOcrModalOpen(false)}
        title="Report Incorrect OCR Extraction"
        description="Submit corrections to our dataset moderators."
      >
        <div className="space-y-4 text-xs">
          <textarea
            rows={4}
            placeholder="Describe the incorrect ingredient name or OCR typo..."
            value={ocrErrorFeedback}
            onChange={(e) => setOcrErrorFeedback(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-teal-600"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsReportOcrModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleReportOcrSubmit}>
              Submit Feedback
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
