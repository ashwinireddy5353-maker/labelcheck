import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/services';
import { useToast } from '../../context/ToastContext';
import { MasterIngredient, RiskLevel } from '../../types';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { RiskBadge } from '../../components/ui/RiskBadge';
import { Database, Plus, Search, Trash2, Edit2 } from 'lucide-react';

export const AdminIngredientsPage: React.FC = () => {
  const { showToast } = useToast();
  const [ingredients, setIngredients] = useState<MasterIngredient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MasterIngredient> | null>(null);

  useEffect(() => {
    async function loadMasterData() {
      try {
        const res = await adminApi.getMasterIngredients();
        setIngredients(res);
      } catch {
        showToast('Failed to fetch master ingredient registry.', 'error');
      }
    }
    loadMasterData();
  }, []);

  const handleOpenModal = (item?: MasterIngredient) => {
    setEditingItem(
      item || {
        name: '',
        casNumber: '',
        category: 'Preservative',
        riskLevel: 'low',
        description: '',
        isAllergen: false,
        isIrritant: false,
        isHazardous: false,
        ewgScore: 1,
      }
    );
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingItem || !editingItem.name) return;
    try {
      const saved = await adminApi.saveMasterIngredient(editingItem);
      setIngredients((prev) => {
        const filtered = prev.filter((i) => i.id !== saved.id);
        return [saved, ...filtered];
      });
      showToast('Master ingredient definition saved!', 'success');
      setIsModalOpen(false);
    } catch {
      showToast('Failed to save ingredient.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteMasterIngredient(id);
      setIngredients((prev) => prev.filter((i) => i.id !== id));
      showToast('Ingredient definition deleted.', 'success');
    } catch {
      showToast('Failed to delete item.', 'error');
    }
  };

  const filtered = ingredients.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Database className="w-6 h-6 text-teal-400" />
            Master Ingredient Dictionary
          </h1>
          <p className="text-xs text-slate-400">Manage chemical hazard risk scores, CAS numbers, and synonyms.</p>
        </div>

        <Button variant="primary" onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
          Add New Ingredient
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Search by ingredient name or chemical class..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-teal-500"
        />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="py-3 px-4">Chemical Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">EWG & Risk</th>
              <th className="py-3 px-4">Flags</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/50">
                <td className="py-3.5 px-4 font-bold text-white">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-[11px] text-slate-400 font-normal">CAS: {item.casNumber || 'N/A'}</p>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-400">{item.category}</td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-400">Score {item.ewgScore || 1}</span>
                    <RiskBadge level={item.riskLevel} size="sm" />
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex gap-1 text-[10px]">
                    {item.isAllergen && <span className="bg-red-950 text-red-400 px-1.5 py-0.5 rounded border border-red-800">Allergen</span>}
                    {item.isIrritant && <span className="bg-amber-950 text-amber-400 px-1.5 py-0.5 rounded border border-amber-800">Irritant</span>}
                    {item.isHazardous && <span className="bg-purple-950 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800">Hazard</span>}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button onClick={() => handleOpenModal(item)} className="p-1 text-slate-400 hover:text-white mr-2">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1 text-slate-400 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CRUD Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem?.id ? 'Edit Ingredient' : 'New Ingredient Entry'}
      >
        <div className="space-y-4 text-xs">
          <Input
            label="Ingredient Name"
            value={editingItem?.name || ''}
            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
          />
          <Input
            label="CAS Registry Number"
            value={editingItem?.casNumber || ''}
            onChange={(e) => setEditingItem({ ...editingItem, casNumber: e.target.value })}
          />
          <div>
            <label className="font-semibold block mb-1">Risk Level</label>
            <select
              value={editingItem?.riskLevel || 'low'}
              onChange={(e) => setEditingItem({ ...editingItem, riskLevel: e.target.value as RiskLevel })}
              className="w-full p-2.5 border rounded-xl"
            >
              <option value="low">Low Concern</option>
              <option value="moderate">Moderate Concern</option>
              <option value="high">High Concern</option>
              <option value="hazardous">Potentially Hazardous</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>Save Definition</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
