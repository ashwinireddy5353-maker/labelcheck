import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/services';
import { MasterAllergen } from '../../types';
import { AlertTriangle, Plus, Search } from 'lucide-react';

export const AdminAllergensPage: React.FC = () => {
  const [allergens, setAllergens] = useState<MasterAllergen[]>([]);

  useEffect(() => {
    async function load() {
      const data = await adminApi.getMasterAllergens();
      setAllergens(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            Master Allergen Registry
          </h1>
          <p className="text-xs text-slate-400">Manage sensitized allergen triggers and severity rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allergens.map((alg) => (
          <div key={alg.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-white text-base">{alg.name}</h4>
              <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 font-bold text-[10px] uppercase border border-red-800">
                {alg.severity} Severity
              </span>
            </div>
            <p className="text-xs text-slate-400">{alg.description}</p>
            <div className="text-[11px] text-slate-500 pt-2">
              <span className="font-bold text-slate-300">Common Products: </span>
              {alg.commonProducts.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
