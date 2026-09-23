import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { DatasetImport } from '../../types';
import { Button } from '../../components/ui/Button';
import { FileSpreadsheet, UploadCloud, CheckCircle2, RefreshCw } from 'lucide-react';

export const AdminDatasetsPage: React.FC = () => {
  const { showToast } = useToast();
  const [datasets, setDatasets] = useState<DatasetImport[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await adminApi.getDatasets();
      setDatasets(data);
    }
    load();
  }, []);

  const handleSimulateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploading(true);
    try {
      const newDs = await adminApi.importDataset(file.name, Math.floor(Math.random() * 2000) + 500);
      setDatasets((prev) => [newDs, ...prev]);
      showToast(`Dataset "${file.name}" imported successfully!`, 'success');
    } catch {
      showToast('Dataset import failed.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-teal-400" />
            Ingredient Dataset Importer & Sync
          </h1>
          <p className="text-xs text-slate-400">Import CSV or JSON dataset updates from EU CosIng, EWG, or FDA registries.</p>
        </div>
      </div>

      <div className="p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-900 text-center space-y-4">
        <UploadCloud className="w-10 h-10 text-teal-400 mx-auto" />
        <h4 className="text-base font-bold text-white">Upload New Chemical Dataset File</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">Supports CSV or JSON formatted ingredient dictionaries.</p>

        <label className="inline-flex">
          <input type="file" accept=".csv,.json" onChange={handleSimulateImport} className="hidden" />
          <Button variant="primary" isLoading={isUploading} leftIcon={<UploadCloud className="w-4 h-4" />}>
            Choose File & Import
          </Button>
        </label>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">Dataset Filename</th>
              <th className="py-3 px-4">Records</th>
              <th className="py-3 px-4">Import Date</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {datasets.map((ds) => (
              <tr key={ds.id}>
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <span>{ds.filename}</span>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{ds.recordCount} rows</td>
                <td className="py-3.5 px-4 text-slate-400">{new Date(ds.importedAt).toLocaleDateString()}</td>
                <td className="py-3.5 px-4 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px] border border-emerald-800">
                    Completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
