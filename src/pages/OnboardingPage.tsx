import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/ui/Logo';
import { 
  ShieldAlert, 
  Sparkles, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Search,
  Plus,
  X,
  Droplet
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  // Form states
  const [ageGroup, setAgeGroup] = useState<string>(user?.profile?.ageGroup || '25-34');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>(user?.profile?.allergies || [
    'Fragrance / Parfums',
    'Methylisothiazolinone (MI)',
  ]);
  const [customAllergenInput, setCustomAllergenInput] = useState('');

  const [skinType, setSkinType] = useState<any>(user?.profile?.skinType || 'sensitive');
  const [selectedSensitivities, setSelectedSensitivities] = useState<string[]>(
    user?.profile?.skinSensitivities || ['Eczema-prone', 'Contact Dermatitis']
  );

  const [avoidList, setAvoidList] = useState<string[]>(
    user?.profile?.avoidIngredients || ['Parabens', 'Sodium Lauryl Sulfate (SLS)', 'Oxybenzone']
  );
  const [customAvoidInput, setCustomAvoidInput] = useState('');

  const [categories, setCategories] = useState<string[]>(
    user?.profile?.preferredCategories || ['Skincare', 'Sunscreen', 'Haircare']
  );
  const [fragranceSensitivity, setFragranceSensitivity] = useState(true);

  // Common Presets
  const commonAllergies = [
    'Fragrance / Parfums',
    'Formaldehyde & Releasers',
    'Methylisothiazolinone (MI)',
    'Nickel',
    'Linalool & Limonene (Oxidized)',
    'Benzalkonium Chloride',
    'BHA / BHT',
    'Synthetic Dyes (CI Codes)',
  ];

  const commonSkinTypes = [
    { id: 'sensitive', label: 'Sensitive Skin', desc: 'Prone to redness, stinging, and immediate reaction to harsh formulas.' },
    { id: 'dry', label: 'Dry Skin', desc: 'Tightness, flaking, and damaged lipid barrier.' },
    { id: 'oily', label: 'Oily / Acne Prone', desc: 'Excess sebum, clogged pores, comedogenic sensitivity.' },
    { id: 'combination', label: 'Combination Skin', desc: 'Oily T-zone with dry or normal cheek areas.' },
    { id: 'normal', label: 'Normal / Balanced', desc: 'Generally tolerant to standard cosmetic formulations.' },
  ];

  const commonSensitivities = [
    'Eczema-prone',
    'Rosacea flares',
    'Contact Dermatitis',
    'Acne-prone breakouts',
    'Stinging around eyes',
  ];

  const commonAvoid = [
    'Parabens',
    'Phthalates',
    'Sodium Lauryl Sulfate (SLS)',
    'Oxybenzone',
    'Formaldehyde',
    'Triclosan',
    'Mineral Oil / Petrolatum',
    'Denatured Alcohol',
  ];

  const commonCategories = [
    'Skincare',
    'Sunscreen',
    'Haircare',
    'Body Care',
    'Makeup & Cosmetics',
    'Baby Care Products',
  ];

  const handleAddCustomAllergen = () => {
    if (customAllergenInput.trim() && !selectedAllergies.includes(customAllergenInput.trim())) {
      setSelectedAllergies([...selectedAllergies, customAllergenInput.trim()]);
      setCustomAllergenInput('');
    }
  };

  const handleAddCustomAvoid = () => {
    if (customAvoidInput.trim() && !avoidList.includes(customAvoidInput.trim())) {
      setAvoidList([...avoidList, customAvoidInput.trim()]);
      setCustomAvoidInput('');
    }
  };

  const toggleSelection = (list: string[], setList: (val: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleComplete = async () => {
    try {
      await updateProfile({
        ageGroup,
        allergies: selectedAllergies,
        skinType,
        skinSensitivities: selectedSensitivities,
        avoidIngredients: avoidList,
        preferredCategories: categories,
        fragranceSensitivity,
        isOnboardingCompleted: true,
      });
      showToast('Personalized profile configured!', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast('Failed to save profile. Proceeding to dashboard.', 'warning');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-10 space-y-8">
        {/* Header & Step Indicator */}
        <div className="space-y-4 text-center">
          <Logo size="md" className="justify-center" />
          <h2 className="text-2xl font-extrabold text-slate-900">Personalize Your AI Safety Radar</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Tell LabelCheck about your skin profile and allergies so we can flag hazards tailored specifically to you.
          </p>

          {/* Progress Bar */}
          <div className="space-y-1 max-w-sm mx-auto pt-2">
            <div className="flex justify-between text-xs font-bold text-teal-700">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-teal-700 h-full transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* STEP 1: Allergies */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                Step 1: Do you have known cosmetic allergies?
              </h3>
              <p className="text-xs text-slate-500">Select all ingredients or compounds that trigger allergic reactions.</p>
            </div>

            {/* Selected Chips */}
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[70px]">
              {selectedAllergies.length === 0 ? (
                <span className="text-xs text-slate-400 italic">No allergies selected yet. Pick from below or type custom item.</span>
              ) : (
                selectedAllergies.map((alg) => (
                  <span
                    key={alg}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold border border-red-200"
                  >
                    <span>{alg}</span>
                    <button
                      onClick={() => toggleSelection(selectedAllergies, setSelectedAllergies, alg)}
                      className="text-red-500 hover:text-red-900"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Type custom allergen name (e.g. Nickel, Linalool)..."
                  value={customAllergenInput}
                  onChange={(e) => setCustomAllergenInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAllergen())}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-600"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleAddCustomAllergen} leftIcon={<Plus className="w-4 h-4" />}>
                Add
              </Button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">Common Cosmetic Allergens:</span>
              <div className="flex flex-wrap gap-2">
                {commonAllergies.map((item) => {
                  const isSelected = selectedAllergies.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleSelection(selectedAllergies, setSelectedAllergies, item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Skin Profile & Sensitivities */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-teal-600" />
                Step 2: What is your primary Skin Type & Sensitivity?
              </h3>
              <p className="text-xs text-slate-500">Helps us weigh irritant scores appropriately for your barrier health.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {commonSkinTypes.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setSkinType(st.id as any)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    skinType === st.id
                      ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{st.label}</span>
                    {skinType === st.id && <Check className="w-4 h-4 text-teal-700" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{st.desc}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-700">Skin Sensitivities & Conditions:</span>
              <div className="flex flex-wrap gap-2">
                {commonSensitivities.map((sens) => {
                  const isSelected = selectedSensitivities.includes(sens);
                  return (
                    <button
                      key={sens}
                      onClick={() => toggleSelection(selectedSensitivities, setSelectedSensitivities, sens)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sens}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Avoid List */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <X className="w-5 h-5 text-amber-600" />
                Step 3: Specific Ingredients You Wish to Avoid
              </h3>
              <p className="text-xs text-slate-500">Parabens, sulfates, silicones, or chemicals you prefer not to use.</p>
            </div>

            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[70px]">
              {avoidList.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300"
                >
                  <span>{item}</span>
                  <button onClick={() => toggleSelection(avoidList, setAvoidList, item)}>
                    <X className="w-3.5 h-3.5 text-amber-700" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type custom ingredient (e.g. Phthalates, Oxybenzone)..."
                value={customAvoidInput}
                onChange={(e) => setCustomAvoidInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomAvoid())}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-600"
              />
              <Button variant="outline" size="sm" onClick={handleAddCustomAvoid} leftIcon={<Plus className="w-4 h-4" />}>
                Add
              </Button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700">Popular Avoid Presets:</span>
              <div className="flex flex-wrap gap-2">
                {commonAvoid.map((item) => {
                  const isSelected = avoidList.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleSelection(avoidList, setAvoidList, item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Preferences & Confirmation */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Step 4: Product Preferences & Summary
              </h3>
              <p className="text-xs text-slate-500">Confirm your setup to finalize your LabelCheck dashboard.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fragranceSensitivity}
                  onChange={(e) => setFragranceSensitivity(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900">Enable Strict Fragrance Allergy Watch</span>
                  <p className="text-[11px] text-slate-500">Automatically flag all undisclosed essential oils and aroma blends.</p>
                </div>
              </label>

              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-slate-700">Categories You Frequently Purchase:</span>
                <div className="flex flex-wrap gap-2">
                  {commonCategories.map((cat) => {
                    const isSelected = categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleSelection(categories, setCategories, cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(step - 1)}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Skip setup for now
            </button>
          )}

          {step < totalSteps ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStep(step + 1)}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next Step
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleComplete}
              rightIcon={<Check className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Save Profile & Start Scanning
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
