import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scanApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { OCRResult, OCRItem } from '../types';
import { IngredientChip } from '../components/ui/IngredientChip';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  CheckCircle2, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Sparkles, 
  HelpCircle 
} from 'lucide-react';

export const OCRReviewPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [items, setItems] = useState<OCRItem[]>([]);
  const [productName, setProductName] = useState('Scanned Product');
  const [category, setCategory] = useState('Cosmetic');

  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOCRData() {
      if (!scanId) return;

      // Check session storage first
      const stored = sessionStorage.getItem(`labelcheck_ocr_${scanId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOcrData(parsed.ocrResult);
        setItems(parsed.ocrResult.extractedItems || []);
        if (parsed.productName) setProductName(parsed.productName);
        if (parsed.category) setCategory(parsed.category);
      } else {
        // Fallback fetch
        try {
          const res = await scanApi.performOCR(scanId);
          setOcrData(res);
          setItems(res.extractedItems || []);
        } catch {
          showToast('Could not load OCR extraction session.', 'error');
        }
      }
    }
    loadOCRData();
  }, [scanId]);

  const handleUpdateItem = (id: string, newName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, userCorrection: newName, suggestedName: newName } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddIngredient = () => {
    if (!newIngredientInput.trim()) return;
    const newItem: OCRItem = {
      id: `manual_item_${Date.now()}`,
      originalText: newIngredientInput.trim(),
      suggestedName: newIngredientInput.trim(),
      confidence: 1.0,
      isSuspectedError: false,
    };
    setItems((prev) => [...prev, newItem]);
    setNewIngredientInput('');
  };

  const handleAcceptSuggestion = (id: string, suggestedName: string) => {
    handleUpdateItem(id, suggestedName);
    showToast(`Correction confirmed: ${suggestedName}`, 'info');
  };

  const handleGenerateReport = async () => {
    if (!scanId || items.length === 0) {
      showToast('Please confirm at least one ingredient before generating report.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const confirmedList = items.map((i) => i.userCorrection || i.suggestedName);
      const report = await scanApi.generateSafetyReport(
        scanId,
        confirmedList,
        productName,
        category
      );

      showToast('Safety Report generated successfully!', 'success');
      navigate(`/report/${report.id}`);
    } catch (err) {
      showToast('Failed to generate safety report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          Step 2: OCR Review & Verification
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900">Review Extracted Ingredients</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          AI detected <span className="font-bold text-teal-700">{items.length} ingredients</span>. Verify names, correct OCR typos, or add missing items before calculating your safety score.
        </p>
      </div>

      {/* Main Review Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 space-y-6">
        {/* Product Details Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Target Product Label</span>
            <h3 className="text-base font-bold text-slate-900">{productName}</h3>
            <p className="text-xs text-slate-500">Category: {category}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Overall OCR Confidence:</span>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-extrabold border border-emerald-300">
              {Math.round((ocrData?.overallConfidence || 0.91) * 100)}%
            </span>
          </div>
        </div>

        {/* Suspected Mistakes / Did You Mean Banner */}
        {items.some((i) => i.isSuspectedError) && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Suspected OCR Typos Detected ("Did You Mean?")</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              We flagged uncertain chemical OCR extractions. Never silently change ingredient names—please confirm or edit below:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {items
                .filter((i) => i.isSuspectedError)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAcceptSuggestion(item.id, item.suggestedName)}
                    className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>"{item.originalText}"</span>
                    <span className="text-teal-700 font-bold">➔ {item.suggestedName}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Ingredients Chips Canvas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Confirmed Ingredient List ({items.length})</span>
            <span className="text-slate-400 font-normal">Click chip to edit or delete</span>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 min-h-[140px] flex flex-wrap gap-2.5 items-start">
            {items.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No ingredients in list. Add items manually below.</p>
            ) : (
              items.map((item) => (
                <IngredientChip
                  key={item.id}
                  item={item}
                  onUpdate={handleUpdateItem}
                  onRemove={handleRemoveItem}
                />
              ))
            )}
          </div>
        </div>

        {/* Add Custom Missing Ingredient Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Type missing ingredient name (e.g. Tocopherol, Niacinamide)..."
            value={newIngredientInput}
            onChange={(e) => setNewIngredientInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddIngredient())}
          />
          <Button variant="outline" onClick={handleAddIngredient} leftIcon={<Plus className="w-4 h-4" />}>
            Add Ingredient
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/scan')} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Re-scan Label
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleGenerateReport}
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shadow-lg shadow-teal-700/20 bg-teal-700 hover:bg-teal-800"
          >
            Confirm & Calculate Safety Score
          </Button>
        </div>
      </div>
    </div>
  );
};
