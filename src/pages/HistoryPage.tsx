import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { Scan } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { 
  Search, 
  Grid, 
  List, 
  Trash2, 
  ArrowUpDown, 
  Filter, 
  Scan as ScanIcon, 
  Calendar,
  Sparkles
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [scans, setScans] = useState<Scan[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadScans() {
      try {
        const data = await historyApi.getScans();
        setScans(data);
      } catch {
        showToast('Failed to load scan history.', 'error');
      }
    }
    loadScans();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await historyApi.deleteScan(deleteTargetId);
      setScans((prev) => prev.filter((s) => s.id !== deleteTargetId));
      showToast('Scan history item removed.', 'success');
      setDeleteTargetId(null);
    } catch {
      showToast('Failed to delete scan entry.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredScans = scans
    .filter((scan) => {
      const matchesSearch =
        scan.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (scoreFilter === 'high') return scan.score >= 80;
      if (scoreFilter === 'moderate') return scan.score >= 60 && scan.score < 80;
      if (scoreFilter === 'hazard') return scan.score < 60;

      return true;
    })
    .sort((a, b) => {
      const timeA = new Date(a.scanDate).getTime();
      const timeB = new Date(b.scanDate).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Scan History Archive</h1>
          <p className="text-xs text-slate-500">
            View all past product scans, scores, and flagged chemical findings.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/scan')}
          leftIcon={<ScanIcon className="w-4 h-4" />}
        >
          Scan New Label
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by product name, brand, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-teal-600 focus:bg-white"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:border-teal-600"
          >
            <option value="all">All Risk Scores</option>
            <option value="high">Lower Risk (80+)</option>
            <option value="moderate">Moderate Risk (60-79)</option>
            <option value="hazard">Higher Risk (&lt;60)</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-100"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort: {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>

          {/* Toggle Grid vs List */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'grid' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs transition-all ${
                viewMode === 'list' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {filteredScans.length === 0 ? (
        <EmptyState
          title="No Scans Found"
          description="We couldn't find any historical scan entries matching your active filter criteria."
          actionText="Perform a New Scan"
          onAction={() => navigate('/scan')}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredScans.map((scan) => (
            <div
              key={scan.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-card transition-all overflow-hidden flex flex-col justify-between group"
            >
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={scan.imageUrl || 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=400&q=80'}
                  alt={scan.productName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold border shadow-xs ${
                      scan.score >= 80 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {scan.score}/100
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700">
                    {scan.category}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 truncate">{scan.productName}</h4>
                  <p className="text-xs text-slate-500">{scan.brand}</p>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(scan.scanDate).toLocaleDateString()}
                  </span>
                  <span className="font-semibold text-slate-700">{scan.allergensCount} Allergens</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/report/${scan.reportId || scan.id}`)}
                  >
                    View Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTargetId(scan.id)}
                    className="text-red-600 hover:bg-red-50 border-slate-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
          {filteredScans.map((scan) => (
            <div key={scan.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <img
                  src={scan.imageUrl}
                  alt={scan.productName}
                  className="w-12 h-12 rounded-xl object-cover"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{scan.productName}</h4>
                  <p className="text-xs text-slate-500">{scan.brand} • {scan.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    scan.score >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {scan.score}/100
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/report/${scan.reportId || scan.id}`)}
                >
                  View
                </Button>
                <button onClick={() => setDeleteTargetId(scan.id)} className="text-slate-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Scan History Record?"
        message="Are you sure you want to remove this scan entry from your history archive?"
        confirmText="Delete Record"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
