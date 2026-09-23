import React from 'react';
import { AlternativeProduct, SafetyReport } from '../../types';
import { Button } from '../ui/Button';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: AlternativeProduct | SafetyReport;
  type?: 'alternative' | 'saved';
  onAction?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();

  const isAlternative = 'reasonSuggested' in product;

  // Safely extract score and name
  const score = 'safetyScore' in product ? product.safetyScore : product.score;
  const productName = 'name' in product ? product.name : product.productName;

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (val >= 60) return 'bg-teal-100 text-teal-800 border-teal-300';
    if (val >= 30) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-card transition-all duration-300 overflow-hidden flex flex-col group">
      {/* Product Image & Badge */}
      <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center">
        <img
          src={product.imageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'}
          alt={productName || 'Product'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

        {/* Score Badge */}
        <div
          className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-extrabold border shadow-sm ${getScoreColor(
            score
          )}`}
        >
          {score} / 100 Safety Score
        </div>

        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-300">
            {product.category || 'Personal Care'}
          </p>
          <h4 className="text-sm font-bold truncate">
            {productName || 'Product'}
          </h4>
          <p className="text-xs text-slate-300">{product.brand}</p>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {isAlternative ? (
          <div className="space-y-2 text-xs">
            <p className="text-slate-600 leading-relaxed italic">
              "{product.reasonSuggested}"
            </p>

            {product.avoidedConcerns && product.avoidedConcerns.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avoided Concerns:</span>
                <div className="flex flex-wrap gap-1">
                  {product.avoidedConcerns.map((concern, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {concern}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 space-y-1">
            <p>Scanned on: {new Date('scanDate' in product ? product.scanDate : Date.now()).toLocaleDateString()}</p>
            <p className="font-semibold text-slate-700">{'riskLabel' in product ? product.riskLabel : 'Lower Risk'}</p>
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 group-hover:bg-teal-700 group-hover:text-white group-hover:border-teal-700 transition-colors"
          onClick={() => {
            if ('reportId' in product && product.reportId) {
              navigate(`/report/${product.reportId}`);
            } else if ('id' in product) {
              navigate(`/report/${product.id}`);
            } else {
              navigate('/scan');
            }
          }}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
        >
          View Full Safety Analysis
        </Button>
      </div>
    </div>
  );
};
