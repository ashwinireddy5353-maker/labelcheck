import React from 'react';

interface SafetyScoreCircleProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  subtext?: string;
}

export const SafetyScoreCircle: React.FC<SafetyScoreCircleProps> = ({
  score,
  size = 'lg',
  showLabel = true,
  subtext,
}) => {
  const clampScore = Math.max(0, Math.min(100, Math.round(score)));

  // SVG dimensions based on size
  const dimensions = {
    sm: { circle: 80, stroke: 6, text: 'text-xl', sub: 'text-[9px]' },
    md: { circle: 120, stroke: 8, text: 'text-3xl', sub: 'text-xs' },
    lg: { circle: 160, stroke: 12, text: 'text-5xl', sub: 'text-xs' },
    xl: { circle: 200, stroke: 14, text: 'text-6xl', sub: 'text-sm' },
  }[size];

  const radius = (dimensions.circle - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampScore / 100) * circumference;

  // Determine color theme based on score thresholds
  const getColor = (val: number) => {
    if (val >= 80) {
      return {
        stroke: '#10b981', // Emerald Green
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Lower Detected Risk',
        glow: 'shadow-emerald-500/20',
      };
    } else if (val >= 60) {
      return {
        stroke: '#0f766e', // Deep Teal
        bg: 'bg-teal-50 text-teal-800 border-teal-200',
        label: 'Moderate Detected Risk',
        glow: 'shadow-teal-500/20',
      };
    } else if (val >= 30) {
      return {
        stroke: '#d97706', // Amber
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        label: 'Higher Detected Risk',
        glow: 'shadow-amber-500/20',
      };
    } else {
      return {
        stroke: '#dc2626', // Red
        bg: 'bg-red-50 text-red-800 border-red-200',
        label: 'Significant Detected Concerns',
        glow: 'shadow-red-500/20',
      };
    }
  };

  const theme = getColor(clampScore);

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <div className={`relative flex items-center justify-center p-2 rounded-full shadow-lg ${theme.glow}`}>
        <svg
          width={dimensions.circle}
          height={dimensions.circle}
          className="transform -rotate-90 transition-all duration-700"
        >
          {/* Background circle */}
          <circle
            cx={dimensions.circle / 2}
            cy={dimensions.circle / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={dimensions.stroke}
            fill="transparent"
          />
          {/* Animated score arc */}
          <circle
            cx={dimensions.circle / 2}
            cy={dimensions.circle / 2}
            r={radius}
            stroke={theme.stroke}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Score content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-extrabold tracking-tight text-slate-900 ${dimensions.text}`}>
            {clampScore}
          </span>
          <span className={`font-semibold text-slate-400 uppercase tracking-widest ${dimensions.sub}`}>
            / 100
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="mt-3 flex flex-col items-center">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${theme.bg}`}>
            {theme.label}
          </span>
          {subtext && (
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs">{subtext}</p>
          )}
        </div>
      )}
    </div>
  );
};
