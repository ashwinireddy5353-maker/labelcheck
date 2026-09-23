import React from 'react';
import { RiskLevel } from '../../types';
import { AlertCircle, AlertTriangle, ShieldCheck, AlertOctagon, HelpCircle } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  customText?: string;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, customText, size = 'md' }) => {
  const configs = {
    low: {
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: ShieldCheck,
      text: 'Low Concern',
    },
    moderate: {
      bg: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: AlertTriangle,
      text: 'Moderate Concern',
    },
    high: {
      bg: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: AlertCircle,
      text: 'High Concern',
    },
    hazardous: {
      bg: 'bg-red-100 text-red-800 border-red-200 font-bold',
      icon: AlertOctagon,
      text: 'Potentially Hazardous',
    },
    unknown: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      icon: HelpCircle,
      text: 'Requires Review',
    },
  }[level];

  const IconComponent = configs.icon;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border shrink-0 ${padding} ${configs.bg}`}
    >
      <IconComponent className={`${iconSize} shrink-0`} />
      <span>{customText || configs.text}</span>
    </span>
  );
};
