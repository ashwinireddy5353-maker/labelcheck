import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/services';
import { MasterHazard } from '../../types';
import { Flame, ShieldAlert } from 'lucide-react';

export const AdminHazardsPage: React.FC = () => {
  const [hazards, setHazards] = useState<MasterHazard[]>([]);

  useEffect(() => {
    async function load() {
      const data = await adminApi.getMasterHazards();
      setHazards(data);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-400" />
            Chemical Hazards Registry
          </h1>
          <p className="text-xs text-slate-400">Restricted chemical carcinogens, endocrine disruptors & regulatory statuses.</p>
        </div>
      </div>

      <div className="space-y-4">
        {hazards.map((haz) => (
          <div key={haz.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-white text-sm">{haz.chemicalName}</h4>
              <span className="text-xs font-mono text-amber-400">CAS: {haz.casNumber}</span>
            </div>
            <p className="text-xs text-purple-300 font-semibold">{haz.hazardCategory}</p>
            <p className="text-xs text-slate-400">{haz.summary}</p>
            <p className="text-[11px] text-teal-400 font-mono">Status: {haz.regulatoryStatus}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
