import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { historyApi, savedApi } from '../api/services';
import { Scan, SafetyReport } from '../types';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/report/ProductCard';
import { IngredientSandbox } from '../components/dashboard/IngredientSandbox';
import { 
  Sparkles, 
  ScanText, 
  Bookmark, 
  AlertTriangle, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  Camera, 
  Upload,
  FileText,
  Clock,
  Scan as ScanIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar 
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scans, setScans] = useState<Scan[]>([]);
  const [savedProducts, setSavedProducts] = useState<SafetyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [scansData, savedData] = await Promise.all([
          historyApi.getScans(),
          savedApi.getSavedProducts(),
        ]);
        setScans(scansData);
        setSavedProducts(savedData);
      } catch (err) {
        console.error('Failed to fetch dashboard metrics', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const totalScansCount = scans.length;
  const flaggedCount = scans.filter((s) => s.score < 60 || s.hazardsCount > 0).length;
  const savedCount = savedProducts.length;

  // Recharts Scan History Analytics Data
  const chartData = [
    { day: 'Mon', scans: 1, hazards: 0, avgScore: 88 },
    { day: 'Tue', scans: 3, hazards: 1, avgScore: 72 },
    { day: 'Wed', scans: 2, hazards: 1, avgScore: 65 },
    { day: 'Thu', scans: 4, hazards: 2, avgScore: 54 },
    { day: 'Fri', scans: 2, hazards: 0, avgScore: 92 },
    { day: 'Sat', scans: 5, hazards: 2, avgScore: 60 },
    { day: 'Sun', scans: 3, hazards: 1, avgScore: 78 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-700 text-white rounded-3xl p-6 md:p-10 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white/10 px-3 py-1 rounded-full text-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              AI Allergen & Hazard Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.fullName || 'User'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
              Ready to check your next product label? Scan any bottle, tube, or package to cross-examine ingredients against your profile allergies.
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/scan')}
            leftIcon={<ScanIcon className="w-5 h-5" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="bg-white text-teal-900 hover:bg-slate-100 shadow-md font-bold shrink-0"
          >
            Scan a Product Now
          </Button>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Quick Action Scanner Shortcut Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/scan?tab=upload')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-card cursor-pointer transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Upload Label Image</h4>
            <p className="text-xs text-slate-500">JPG, PNG, JPEG, WebP</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/scan?tab=camera')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-card cursor-pointer transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Live Camera Snapshot</h4>
            <p className="text-xs text-slate-500">Scan directly from camera</p>
          </div>
        </div>

        <div
          onClick={() => navigate('/scan?tab=manual')}
          className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-teal-500 hover:shadow-card cursor-pointer transition-all flex items-center gap-4 group"
        >
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Paste Text Manually</h4>
            <p className="text-xs text-slate-500">Raw ingredient list input</p>
          </div>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Scans</span>
            <ScanText className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">{totalScansCount}</p>
          <p className="text-[11px] text-slate-500">Packaged product labels scanned</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Products Flagged</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-extrabold text-amber-700">{flaggedCount}</p>
          <p className="text-[11px] text-slate-500">Contains allergens or hazards</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Saved Products</span>
            <Bookmark className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700">{savedCount}</p>
          <p className="text-[11px] text-slate-500">Bookmarked clean alternatives</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Active Allergies</span>
            <ShieldCheck className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-3xl font-extrabold text-slate-900">
            {user?.profile?.allergies?.length || 0}
          </p>
          <p className="text-[11px] text-slate-500">Configured in personal profile</p>
        </div>
      </div>

      {/* Interactive Formulation Lab Sandbox Widget */}
      <IngredientSandbox />

      {/* Safety Overview Chart + Recent Scans List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts Scan Trends Visualization */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-700" />
                Weekly Scan Activity & Safety Score Trends
              </h3>
              <p className="text-xs text-slate-500">Scans performed vs chemical hazard detection frequency</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="scans" stroke="#0f766e" strokeWidth={3} fillOpacity={1} fill="url(#scanGradient)" />
                <Bar dataKey="hazards" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Scans Shortcut List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Recent Scans
              </h3>
              <Link to="/history" className="text-xs font-bold text-teal-700 hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {scans.slice(0, 3).map((scan) => (
                <div
                  key={scan.id}
                  onClick={() => navigate(`/report/${scan.reportId || scan.id}`)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-teal-50/50 hover:border-teal-200 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={scan.imageUrl || 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=100&q=80'}
                      alt={scan.productName}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{scan.productName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{scan.brand}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                        scan.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {scan.score}/100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => navigate('/history')} className="w-full">
            Full History Archive
          </Button>
        </div>
      </div>

      {/* Safer Alternatives Section Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Recommended Clean Alternatives</h3>
            <p className="text-xs text-slate-500">Products with high safety ratings avoiding your saved sensitivities</p>
          </div>
          <Link to="/saved" className="text-xs font-bold text-teal-700 hover:underline">
            Manage Saved Items
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {savedProducts.slice(0, 3).map((prod) => (
            <ProductCard key={prod.id} product={prod} type="saved" />
          ))}
        </div>
      </div>
    </div>
  );
};
