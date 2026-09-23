import React from 'react';
import { PackageSearch } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-14 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
      <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl mb-4 shadow-sm">
        {icon || <PackageSearch className="w-10 h-10" />}
      </div>
      <h4 className="text-lg font-bold text-slate-800">{title}</h4>
      <p className="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">{description}</p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary" className="mt-6">
          {actionText}
        </Button>
      )}
    </div>
  );
};
