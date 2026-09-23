import React, { useState } from 'react';
import { X, AlertCircle, Edit2, Check } from 'lucide-react';
import { OCRItem } from '../../types';

interface IngredientChipProps {
  item: OCRItem;
  onUpdate: (id: string, newName: string) => void;
  onRemove: (id: string) => void;
}

export const IngredientChip: React.FC<IngredientChipProps> = ({ item, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.suggestedName);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(item.id, editText.trim());
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1.5 p-1 px-2.5 bg-teal-50 border border-teal-300 rounded-full shadow-sm text-xs">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="bg-white border border-teal-400 rounded px-2 py-0.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-teal-600 min-w-[120px]"
          autoFocus
        />
        <button
          onClick={handleSave}
          className="p-1 rounded-full text-emerald-700 hover:bg-emerald-100 transition-colors"
          title="Save correction"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="p-1 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isWarning = item.isSuspectedError || item.confidence < 0.75;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all group ${
        isWarning
          ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-sm'
          : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
      }`}
    >
      {isWarning && (
        <span title="Low OCR confidence or suspected error">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        </span>
      )}

      <span>{item.userCorrection || item.suggestedName}</span>

      {item.confidence && (
        <span
          className={`text-[10px] px-1 rounded font-mono ${
            item.confidence > 0.85 ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-100'
          }`}
          title="OCR confidence"
        >
          {Math.round(item.confidence * 100)}%
        </span>
      )}

      <button
        onClick={() => setIsEditing(true)}
        className="text-slate-400 hover:text-teal-700 p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100"
        title="Edit ingredient name"
      >
        <Edit2 className="w-3 h-3" />
      </button>

      <button
        onClick={() => onRemove(item.id)}
        className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors"
        title="Remove ingredient"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};
