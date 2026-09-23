import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { 
  Scan, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  BrainCircuit, 
  Search, 
  History, 
  CheckCircle2, 
  ArrowRight, 
  FileSearch,
  Lock,
  HeartHandshake
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-24 pb-16 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-teal-50/70 via-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Left Content */}
            <div className="space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 shadow-xs">
                <Sparkles className="w-4 h-4 text-teal-700" />
                <span>AI-Powered Ingredient Label Safety Analyzer</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Decode Your Product Label with <span className="text-teal-700">AI Precision</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                Instantly scan packaged product labels, extract ingredients via optical character recognition (OCR), detect hidden allergens, irritants, and chemical hazards, and receive a personalized safety score from 0–100 based on your unique skin sensitivities.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/scan')}
                  leftIcon={<Scan className="w-5 h-5" />}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full sm:w-auto shadow-lg shadow-teal-700/20"
                >
                  Scan a Product Now
                </Button>

                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Explore How It Works
                  </Button>
                </a>
              </div>

              {/* Trust Badges */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-center lg:text-left max-w-md">
                <div>
                  <p className="text-xl font-bold text-slate-900">4,800+</p>
                  <p className="text-xs text-slate-500">Indexed Ingredients</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-teal-700">98.4%</p>
                  <p className="text-xs text-slate-500">OCR Accuracy</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600">0-100</p>
                  <p className="text-xs text-slate-500">Risk Scoring</p>
                </div>
              </div>
            </div>

            {/* Hero Right Visual Demo Card */}
            <div className="relative">
              <div className="relative mx-auto max-w-md bg-white p-6 rounded-3xl shadow-2xl border border-slate-200 space-y-5">
                {/* Simulated Product Header */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=200&q=80"
                    alt="Sample Product"
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-teal-700 tracking-wider">Live OCR Analysis</span>
                    <h4 className="text-sm font-bold text-slate-900">Hydrating Daily Lotion</h4>
                    <p className="text-xs text-slate-500">8 Ingredients Scanned</p>
                  </div>
                  <div className="ml-auto p-2 bg-amber-100 text-amber-900 font-extrabold rounded-xl text-sm border border-amber-300">
                    42 / 100
                  </div>
                </div>

                {/* Animated OCR Scanning Simulation */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Extracted Ingredients</span>
                    <span className="text-teal-700">Matched with EWG & CosIng</span>
                  </div>

                  <div className="space-y-2 p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px]">
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>✓ Aqua (Water)</span>
                      <span className="text-[10px] text-slate-400">Safe</span>
                    </div>
                    <div className="flex justify-between items-center text-red-400 font-bold bg-red-950/60 p-1 rounded">
                      <span>⚠ DMDM Hydantoin</span>
                      <span className="text-[10px] bg-red-800 text-white px-1.5 rounded">Hazardous</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-400 bg-amber-950/40 p-1 rounded">
                      <span>⚠ Parfum / Fragrance</span>
                      <span className="text-[10px] bg-amber-800 text-white px-1.5 rounded">Allergen Match</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>✓ Glycerin</span>
                      <span className="text-[10px] text-slate-400">Safe</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
                  <span className="font-semibold">Personalized Warning Triggered:</span>
                  <span className="font-bold text-red-700">Matches Fragrance Allergy</span>
                </div>
              </div>

              {/* Subtle background glow */}
              <div className="absolute -inset-4 bg-teal-600/10 rounded-full blur-3xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            Four Simple Steps
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">How LabelCheck Protects You</h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            From raw camera snapshot to personalized safety insights in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            {
              step: '01',
              title: 'Upload or Capture',
              desc: 'Take a camera snapshot of any packaged product label or upload a file.',
              icon: Scan,
            },
            {
              step: '02',
              title: 'AI OCR Extraction',
              desc: 'Our optical recognition engine parses raw ingredient lists, normalizing chemical formulas.',
              icon: BrainCircuit,
            },
            {
              step: '03',
              title: 'Allergen & Hazard Screening',
              desc: 'Cross-references ingredients against EU CosIng, EWG hazard scores, and your personal allergies.',
              icon: ShieldCheck,
            },
            {
              step: '04',
              title: 'Get 0–100 Safety Report',
              desc: 'View your personalized safety score, ingredient breakdown, and clean alternative recommendations.',
              icon: CheckCircle2,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-card transition-all duration-300 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-2xl font-extrabold text-slate-300 font-mono">{item.step}</span>
                </div>

                <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold">Advanced Ingredient Intelligence</h2>
            <p className="text-sm text-slate-400">
              Built with cutting-edge optical recognition and structured health database rules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'High Precision AI OCR',
                desc: 'Extracts dense, small-font ingredient lists from curved cosmetic bottles, boxes, and food labels.',
                icon: FileSearch,
              },
              {
                title: 'Allergen & Irritant Detection',
                desc: 'Identifies fragrance allergens, parabens, sulfates, and sensitizing essential oils.',
                icon: AlertTriangle,
              },
              {
                title: 'Fuzzy Match Error Correction',
                desc: 'Automatically corrects OCR typos ("Parfum" -> "Fragrance / Parfum") with manual confirmation.',
                icon: BrainCircuit,
              },
              {
                title: 'Personalized Safety Score',
                desc: 'Calculates a dynamic 0–100 rating mapped strictly to your saved allergies and skin type.',
                icon: ShieldCheck,
              },
              {
                title: 'Safer Alternative Engine',
                desc: 'Recommends cleaner, non-irritating product alternatives for flagged items.',
                icon: Sparkles,
              },
              {
                title: 'Complete Scan History',
                desc: 'Access your full archive of past label scans, compare ingredients side by side, and save favorites.',
                icon: History,
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 bg-slate-800/80 rounded-3xl border border-slate-700/60 hover:border-teal-500 transition-all space-y-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-900/60 text-teal-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why LabelCheck Section */}
      <section id="why-labelcheck" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-teal-700 to-emerald-700 rounded-3xl text-white p-8 md:p-14 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                Why Choose LabelCheck?
              </span>
              <h2 className="text-3xl font-extrabold leading-tight">
                Empowering You to Make Informed, Allergen-Free Choices
              </h2>
              <p className="text-sm text-teal-50 leading-relaxed">
                Ingredient labels are deliberately hard to read with chemical jargon and tiny fonts. LabelCheck brings radical transparency to everyday cosmetics, personal care, and household products.
              </p>
              <div className="space-y-2 text-xs pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>100% transparent ingredient classification from public databases</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Customized rules matching your exact personal allergies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Easy side-by-side product comparison</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/register')}
                className="bg-white text-teal-900 hover:bg-slate-100 shadow-lg font-bold"
              >
                Create Free Account & Start Scanning
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Medical Disclaimer Banner */}
      <section id="disclaimer" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200 flex items-start gap-4">
          <Lock className="w-6 h-6 text-slate-500 shrink-0 mt-1" />
          <div className="space-y-1 text-xs text-slate-600 leading-relaxed">
            <h4 className="font-bold text-slate-900 text-sm">Informational Tool & Non-Medical Disclaimer</h4>
            <p>
              LabelCheck is designed as an educational ingredient hazard analysis tool. Safety ratings (0–100) are computer-generated risk estimations and do not constitute certified medical diagnosis, allergy testing, or regulatory product approval. Always consult a licensed healthcare professional for clinical advice.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
