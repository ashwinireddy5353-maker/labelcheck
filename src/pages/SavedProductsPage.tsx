import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { savedApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { SafetyReport } from '../types';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ProductCard } from '../components/report/ProductCard';
import { Bookmark, BarChart2, Filter, Scan as ScanIcon } from 'lucide-react';

export const SavedProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [savedItems, setSavedItems] = useState<SafetyReport[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  useEffect(() => {
    async function loadSaved() {
      try {
        const data = await savedApi.getSavedProducts();
        setSavedItems(data);
      } catch {
        showToast('Failed to load saved products.', 'error');
      }
    }
    loadSaved();
  }, []);

  const categories = ['all', ...Array.from(new Set(savedItems.map((item) => item.category)))];

  const filteredItems = savedItems.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const toggleSelectForCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter((i) => i !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        showToast('You can compare up to 3 products at a time.', 'warning');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleLaunchCompare = () => {
    if (selectedForCompare.length < 2) {
      showToast('Select at least 2 products to launch comparison.', 'warning');
      return;
    }
    navigate(`/compare?ids=${selectedForCompare.join(',')}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Saved Products & Favorites</h1>
          <p className="text-xs text-slate-500">
            Bookmarked products with high safety ratings for quick reference.
          </p>
        </div>

        {selectedForCompare.length >= 2 && (
          <Button
            variant="primary"
            onClick={handleLaunchCompare}
            leftIcon={<BarChart2 className="w-4 h-4" />}
            className="shadow-lg shadow-teal-700/20"
          >
            Compare ({selectedForCompare.length}) Products
          </Button>
        )}
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-teal-700 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No Saved Products"
          description="Bookmark your favorite clean product scans to save them in this list."
          actionText="Scan Product Now"
          onAction={() => navigate('/scan')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredItems.map((prod) => {
            const isSelected = selectedForCompare.includes(prod.id);
            return (
              <div key={prod.id} className="relative flex flex-col">
                <ProductCard product={prod} type="saved" />
                <button
                  onClick={() => toggleSelectForCompare(prod.id)}
                  className={`mt-2 py-1.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>{isSelected ? '✓ Selected for Compare' : '+ Select for Compare'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
