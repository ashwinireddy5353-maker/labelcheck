import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { scanApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { OCRResult, OCRItem } from '../types';
import { IngredientChip } from '../components/ui/IngredientChip';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { parseAndCorrectIngredients } from '../utils/ingredientMatcher';
import { 
  CheckCircle2, 
  Plus, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Sparkles, 
  FileText,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  Edit3,
  ShieldAlert
} from 'lucide-react';

export const OCRReviewPage: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [items, setItems] = useState<OCRItem[]>([]);
  const [productName, setProductName] = useState('Scanned Product');
  const [category, setCategory] = useState('Cosmetic');

  // Active view tab: 'chips' (parsed ingredients) vs 'raw' (raw document transcription)
  const [activeTab, setActiveTab] = useState<'chips' | 'raw'>('chips');

  // Raw OCR Text management
  const [editableRawText, setEditableRawText] = useState('');
  const [hasCopied, setHasCopied] = useState(false);

  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadOCRData() {
      if (!scanId) return;

      const stored = sessionStorage.getItem(`labelcheck_ocr_${scanId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOcrData(parsed.ocrResult);
        setItems(parsed.ocrResult.extractedItems || []);
        setEditableRawText(parsed.ocrResult.rawText || '');
        if (parsed.productName) setProductName(parsed.productName);
        if (parsed.category) setCategory(parsed.category);
      } else {
        try {
          const res = await scanApi.performOCR(scanId);
          setOcrData(res);
          setItems(res.extractedItems || []);
          setEditableRawText(res.rawText || '');
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

  const handleCopyRawText = () => {
    if (!editableRawText) return;
    navigator.clipboard.writeText(editableRawText);
    setHasCopied(true);
    showToast('Raw OCR text copied to clipboard!', 'info');
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleReparseRawText = () => {
    if (!editableRawText.trim()) {
      showToast('Raw text is empty. Enter or paste ingredient text.', 'warning');
      return;
    }
    const parsed = parseAndCorrectIngredients(editableRawText);
    setItems(parsed.extractedItems);
    showToast(`Successfully parsed ${parsed.extractedItems.length} ingredients from text!`, 'success');
    setActiveTab('chips');
  };

  const handleLoadSample = (sampleType: 'sunscreen' | 'shampoo' | 'clean') => {
    let sampleIngredients: string[] = [];
    if (sampleType === 'sunscreen') {
      setProductName('Chemical Shield SPF 50 Sunscreen');
      setCategory('Sun Protection');
      sampleIngredients = [
        'Aqua',
        'Ethylhexyl Methoxycinnamate',
        'Benzophenone-3',
        'Butyl Methoxydibenzoylmethane',
        'Octocrylene',
        'Homosalate',
        'Phenoxyethanol',
        'Triethanolamine',
        'Fragrance',
      ];
    } else if (sampleType === 'shampoo') {
      setProductName('Clarifying Scalp Therapy Shampoo');
      setCategory('Hair Care');
      sampleIngredients = [
        'Aqua',
        'Sodium Lauryl Sulfate',
        'Sodium Laureth Sulfate',
        'DMDM Hydantoin',
        'Methylparaben',
        'Propylparaben',
        'Fragrance / Parfum',
        'Cocamidopropyl Betaine',
      ];
    } else {
      setProductName('Calm Barrier Restorative Emulsion');
      setCategory('Cosmetics & Skincare');
      sampleIngredients = [
        'Aqua',
        'Glycerin',
        'Ceramide NP',
        'Squalane',
        'Hyaluronic Acid',
        'Centella Asiatica Extract',
        'Colloidal Oatmeal',
        'Allantoin',
        'Panthenol',
      ];
    }
    const newItems: OCRItem[] = sampleIngredients.map((name, idx) => ({
      id: `item_sample_${idx}_${Date.now()}`,
      originalText: name,
      suggestedName: name,
      confidence: 0.98,
      isSuspectedError: false,
    }));
    setItems(newItems);
    setEditableRawText(sampleIngredients.join(', '));
    showToast(`Loaded ${sampleType} formulation test preset!`, 'info');
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

  const quality = ocrData?.imageQuality;

  // Real-time comprehensive safety score estimate from extracted ingredients + user allergies
  const userAllergies = user?.profile?.allergies || [];
  const userAvoids = user?.profile?.avoidIngredients || [];
  const fragranceSensitivity = !!user?.profile?.fragranceSensitivity;

  const evaluatedItems = items.map((item) => {
    const text = (item.userCorrection || item.suggestedName || item.originalText).toLowerCase();
    
    // 1. Personal Allergy Matching
    let isPersonalAllergen = false;
    let matchedAllergy = '';
    for (const allergy of userAllergies) {
      const a = allergy.toLowerCase().trim();
      if (!a) continue;
      if (text.includes(a) || a.includes(text)) {
        isPersonalAllergen = true;
        matchedAllergy = allergy;
        break;
      }
      if ((a.includes('fragrance') || a.includes('parfum')) && (text.includes('fragrance') || text.includes('parfum') || text.includes('aroma') || text.includes('limonene') || text.includes('linalool'))) {
        isPersonalAllergen = true;
        matchedAllergy = allergy;
        break;
      }
      if (a.includes('formaldehyde') && (text.includes('formaldehyde') || text.includes('dmdm') || text.includes('quaternium-15') || text.includes('diazolidinyl'))) {
        isPersonalAllergen = true;
        matchedAllergy = allergy;
        break;
      }
      if (a.includes('paraben') && text.includes('paraben')) {
        isPersonalAllergen = true;
        matchedAllergy = allergy;
        break;
      }
      if ((a.includes('sulfate') || a.includes('sls')) && (text.includes('sulfate') || text.includes('sls'))) {
        isPersonalAllergen = true;
        matchedAllergy = allergy;
        break;
      }
    }

    if (fragranceSensitivity && !isPersonalAllergen) {
      if (text.includes('fragrance') || text.includes('parfum') || text.includes('aroma') || text.includes('limonene') || text.includes('linalool')) {
        isPersonalAllergen = true;
        matchedAllergy = 'Fragrance Sensitivity';
      }
    }

    // 2. Personal Avoid Matching
    let isPersonalAvoid = false;
    let matchedAvoid = '';
    for (const avoid of userAvoids) {
      const a = avoid.toLowerCase().trim();
      if (!a) continue;
      if (text.includes(a) || a.includes(text)) {
        isPersonalAvoid = true;
        matchedAvoid = avoid;
        break;
      }
      if (a.includes('paraben') && text.includes('paraben')) {
        isPersonalAvoid = true;
        matchedAvoid = avoid;
        break;
      }
      if ((a.includes('sulfate') || a.includes('sls')) && (text.includes('sulfate') || text.includes('sls'))) {
        isPersonalAvoid = true;
        matchedAvoid = avoid;
        break;
      }
      if (a.includes('phthalate') && text.includes('phthalate')) {
        isPersonalAvoid = true;
        matchedAvoid = avoid;
        break;
      }
      if ((a.includes('oxybenzone') || a.includes('sunscreen')) && (text.includes('oxybenzone') || text.includes('benzophenone') || text.includes('octinoxate') || text.includes('homosalate') || text.includes('octocrylene'))) {
        isPersonalAvoid = true;
        matchedAvoid = avoid;
        break;
      }
    }

    // 3. Known Chemical Hazards
    const isFormaldehyde = text.includes('dmdm') || text.includes('formaldehyde') || text.includes('quaternium-15') || text.includes('diazolidinyl') || text.includes('imidazolidinyl');
    const isParaben = text.includes('paraben');
    const isPhthalate = text.includes('phthalate') || text.includes('dbp') || text.includes('dep');
    const isUvConcern = text.includes('oxybenzone') || text.includes('benzophenone') || text.includes('octinoxate') || text.includes('homosalate') || text.includes('octocrylene');
    const isSensitizingPreservative = text.includes('methylisothiazolinone') || text.includes('methylchloroisothiazolinone') || text.includes('triclosan') || text.includes('bht') || text.includes('bha');
    const isHazard = isFormaldehyde || isParaben || isPhthalate || isUvConcern || isSensitizingPreservative;

    // 4. Fragrance & General Allergens
    const isFragranceAllergen = text.includes('fragrance') || text.includes('parfum') || text.includes('aroma') || text.includes('limonene') || text.includes('linalool') || text.includes('geraniol') || text.includes('citronellol') || text.includes('eugenol') || text.includes('citral');

    // 5. Irritants
    const isSulfate = text.includes('sulfate') || text.includes('sls');
    const isDryingAlcohol = text.includes('alcohol denat') || text.includes('sd alcohol') || text.includes('isopropyl alcohol');
    const isIrritant = isSulfate || isDryingAlcohol || isFragranceAllergen;

    // 6. Clean Ingredients
    const isClean = text.includes('aqua') || text.includes('water') || text.includes('glycerin') || text.includes('ceramide') || text.includes('hyaluronic') || text.includes('niacinamide') || text.includes('panthenol') || text.includes('allantoin') || text.includes('squalane') || text.includes('tocopherol') || text.includes('aloe') || text.includes('centella') || text.includes('zinc oxide') || text.includes('titanium dioxide');

    return {
      item,
      isPersonalAllergen,
      matchedAllergy,
      isPersonalAvoid,
      matchedAvoid,
      isHazard,
      isFragranceAllergen,
      isIrritant,
      isClean,
    };
  });

  const personalAllergensCount = evaluatedItems.filter((f) => f.isPersonalAllergen).length;
  const personalAvoidsCount = evaluatedItems.filter((f) => f.isPersonalAvoid && !f.isPersonalAllergen).length;
  const hazardsCount = evaluatedItems.filter((f) => f.isHazard).length;
  const generalAllergensCount = evaluatedItems.filter((f) => f.isFragranceAllergen).length;
  const irritantsCount = evaluatedItems.filter((f) => f.isIrritant).length;
  const cleanCount = evaluatedItems.filter((f) => f.isClean).length;

  // Score calculation considering ALL ingredients
  let estimatedScore = 100;
  if (items.length > 0) {
    const deductions = (personalAllergensCount * 35) + (personalAvoidsCount * 18) + (hazardsCount * 22) + (generalAllergensCount * 12) + (irritantsCount * 8);
    const cleanBonus = Math.min(15, cleanCount * 2);
    estimatedScore = 100 - deductions + cleanBonus;

    // Safety caps
    if (personalAllergensCount >= 2) estimatedScore = Math.min(estimatedScore, 25);
    else if (personalAllergensCount === 1) estimatedScore = Math.min(estimatedScore, 45);
    else if (personalAvoidsCount >= 1) estimatedScore = Math.min(estimatedScore, 65);
    else if (hazardsCount >= 1) estimatedScore = Math.min(estimatedScore, 68);

    estimatedScore = Math.max(10, Math.min(100, Math.round(estimatedScore)));
  }

  const getScoreTheme = (score: number, personalAllergens: number) => {
    if (personalAllergens > 0 || score < 40) {
      return {
        bg: 'bg-red-50 border-red-300 text-red-900',
        badge: 'bg-red-600 text-white',
        label: personalAllergens > 0 ? 'Personal Allergy Alert' : 'Significant Detected Concerns',
      };
    }
    if (score < 60) {
      return {
        bg: 'bg-amber-50 border-amber-300 text-amber-900',
        badge: 'bg-amber-600 text-white',
        label: 'Higher Detected Risk',
      };
    }
    if (score < 80) {
      return {
        bg: 'bg-teal-50 border-teal-200 text-teal-800',
        badge: 'bg-teal-600 text-white',
        label: 'Moderate Detected Risk',
      };
    }
    return {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      badge: 'bg-emerald-600 text-white',
      label: 'Lower Detected Risk',
    };
  };

  const scoreTheme = getScoreTheme(estimatedScore, personalAllergensCount);

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
          AI detected <span className="font-bold text-teal-700">{items.length} ingredients</span>. Verify names, review the complete raw OCR transcription, or correct typos before calculating your safety score.
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

          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-extrabold border border-emerald-300">
              {Math.round((ocrData?.overallConfidence || 0.91) * 100)}% Match Confidence
            </span>
          </div>
        </div>

        {/* Preliminary Safety Score & Analysis Preview */}
        {items.length > 0 && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${scoreTheme.bg}`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-extrabold shadow-sm ${scoreTheme.badge}`}>
                <span className="text-xl leading-none">{estimatedScore}</span>
                <span className="text-[9px] uppercase tracking-wider font-semibold opacity-80">/ 100</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wide">Calculated Safety Score</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/80 border border-current">
                    {scoreTheme.label}
                  </span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {personalAllergensCount > 0 ? (
                    <span className="font-bold text-red-700">
                      ⚠️ Contains {personalAllergensCount} ingredient(s) matching your personal allergy watchlist ({evaluatedItems.filter(e => e.isPersonalAllergen).map(e => e.matchedAllergy || e.item.suggestedName).join(', ')})!
                    </span>
                  ) : hazardsCount > 0 ? (
                    <span>
                      Detected {hazardsCount} chemical hazard(s) and {irritantsCount} irritant(s) among {items.length} ingredients.
                    </span>
                  ) : (
                    <span>
                      All {items.length} detected ingredients appear clean and free from your personal allergy triggers.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateReport}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="bg-teal-700 hover:bg-teal-800 shrink-0 shadow-sm"
            >
              Generate Full Safety Report
            </Button>
          </div>
        )}

        {/* Quality Assessment Notice Banner */}
        {quality && !quality.isAcceptable && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-amber-900">{quality.feedbackMessage}</span>
              <p className="text-amber-800 leading-relaxed">
                You can review or edit the raw OCR text below, accept suggested corrections, or re-scan with brighter lighting if text was missed.
              </p>
            </div>
          </div>
        )}

        {/* View Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('chips')}
            className={`py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'chips' ? 'bg-white text-teal-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Extracted Ingredients ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('raw')}
            className={`py-2 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'raw' ? 'bg-white text-teal-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Complete Raw OCR Text</span>
          </button>
        </div>

        {/* TAB 1: INGREDIENT CHIPS VIEW */}
        {activeTab === 'chips' && (
          <div className="space-y-6">
            {/* Suspected Mistakes / Did You Mean Banner */}
            {items.some((i) => i.isSuspectedError) && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Suspected Optical Typos Detected ("Did You Mean?")</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  We matched blurry text against canonical cosmetic ingredients. Click a card to apply the correction:
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

            {/* Quick Test Preset Buttons */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                Quick-test formulation presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleLoadSample('sunscreen')}
                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg font-bold border border-amber-300 transition-colors"
                >
                  🧴 Chemical Sunscreen (Oxybenzone/Octinoxate)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('shampoo')}
                  className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg font-bold border border-rose-300 transition-colors"
                >
                  🫧 Harsh Shampoo (SLS/DMDM/Parabens)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadSample('clean')}
                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg font-bold border border-emerald-300 transition-colors"
                >
                  🌿 Clean Barrier Lotion (Ceramides/Squalane)
                </button>
              </div>
            </div>

            {/* Ingredients Chips Canvas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Confirmed Ingredient List ({items.length})</span>
                <span className="text-slate-400 font-normal">Click chip to edit or delete</span>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 min-h-[140px] flex flex-wrap gap-2.5 items-start">
                {items.length === 0 ? (
                  <div className="py-6 text-center w-full space-y-3">
                    <p className="text-xs text-slate-600 font-bold">No recognizable ingredients found in this scan.</p>
                    <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                      The image may be blurry, reflective, or not show the ingredient list. You can paste ingredients in the <button type="button" onClick={() => setActiveTab('raw')} className="text-teal-700 underline font-bold">Raw Text tab</button>, type names below, or test with a sample formulation:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleLoadSample('sunscreen')}
                        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold border border-amber-300 shadow-xs"
                      >
                        🧴 Load Sunscreen (Oxybenzone / Octinoxate)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSample('shampoo')}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-xl text-xs font-bold border border-rose-300 shadow-xs"
                      >
                        🫧 Load Shampoo (SLS / DMDM / Parabens)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLoadSample('clean')}
                        className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl text-xs font-bold border border-emerald-300 shadow-xs"
                      >
                        🌿 Load Clean Hypoallergenic Cream
                      </button>
                    </div>
                  </div>
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
          </div>
        )}

        {/* TAB 2: COMPLETE RAW OCR TRANSCRIPTION */}
        {activeTab === 'raw' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-700" />
                  Exact OCR Text Extracted from Camera
                </h4>
                <p className="text-xs text-slate-500">
                  Preserves complete reading order, paragraphs, numbers, and symbols without post-processing.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyRawText}
                leftIcon={hasCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              >
                {hasCopied ? 'Copied' : 'Copy Text'}
              </Button>
            </div>

            <textarea
              rows={10}
              value={editableRawText}
              onChange={(e) => setEditableRawText(e.target.value)}
              placeholder="Raw text from image will appear here..."
              className="w-full p-4 rounded-2xl border border-slate-300 bg-slate-900 text-slate-100 text-xs font-mono outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 leading-relaxed resize-y"
            />

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-600 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                You can edit this raw transcription and click <strong>Re-parse Ingredients</strong>.
              </span>

              <Button
                variant="primary"
                size="sm"
                onClick={handleReparseRawText}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="bg-teal-700 hover:bg-teal-800"
              >
                Re-parse Ingredients
              </Button>
            </div>
          </div>
        )}

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
