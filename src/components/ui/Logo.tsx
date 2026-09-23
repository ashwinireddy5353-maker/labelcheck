import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ className = '', showTagline = false, size = 'md' }) => {
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
  }[size];

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl',
  }[size];

  return (
    <Link to="/" className={`inline-flex items-center gap-2.5 group ${className}`}>
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-md group-hover:shadow-teal-500/25 transition-all duration-300 p-1.5 ${iconSizes}`}>
        {/* Label Tag + Shield Icon Combined */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Shield frame */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {/* Tag hole */}
          <circle cx="12" cy="7" r="1" fill="currentColor" />
          {/* Check mark */}
          <path d="m9 13 2 2 4-4" strokeWidth="2.5" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-extrabold tracking-tight text-slate-900 leading-none ${textSizes}`}>
          Label<span className="text-teal-700">Check</span>
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium text-slate-500 tracking-wide mt-0.5">
            Know What’s Inside. Choose What’s Safer.
          </span>
        )}
      </div>
    </Link>
  );
};
