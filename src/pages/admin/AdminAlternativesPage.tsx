import React from 'react';
import { initialAlternatives } from '../../api/mockData';
import { ProductCard } from '../../components/report/ProductCard';
import { RefreshCw } from 'lucide-react';

export const AdminAlternativesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-teal-400" />
            Safer Alternatives Mapping Engine
          </h1>
          <p className="text-xs text-slate-400">Configure clean product recommendation mappings for flagged scans.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {initialAlternatives.map((alt) => (
          <ProductCard key={alt.id} product={alt} type="alternative" />
        ))}
      </div>
    </div>
  );
};
