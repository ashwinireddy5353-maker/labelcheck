import React, { useEffect, useState } from 'react';
import { Scan, Sparkles, ShieldCheck } from 'lucide-react';

export const ScanHUDOverlay: React.FC = () => {
  const [detectedTokens, setDetectedTokens] = useState<string[]>([]);

  useEffect(() => {
    const tokens = ['Aqua', 'Glycerin', 'Fragrance', 'Parabens', 'SLS', 'Ceramides', 'Tocopherol'];
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < tokens.length) {
        setDetectedTokens((prev) => [...prev, tokens[idx]]);
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 350);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl border-2 border-teal-500/40">
      {/* Animated Scanning Laser Line */}
      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_15px_#2dd4bf] animate-scan-laser" />

      {/* Frame Reticle Corners */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-teal-400" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-teal-400" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-teal-400" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-teal-400" />

      {/* HUD Scanner Status Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/85 text-teal-300 text-[10px] font-mono px-3 py-1 rounded-full border border-teal-500/50 flex items-center gap-2 backdrop-blur-xs shadow-lg">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
        <span>AI OCR SCANNER HUD • STREAM ACTIVE</span>
      </div>

      {/* Detected Bounding Box Chips Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5 justify-center">
        {detectedTokens.map((tok, i) => (
          <span
            key={i}
            className="px-2 py-0.5 bg-teal-900/80 text-teal-200 border border-teal-400/50 text-[10px] font-mono rounded animate-fade-in shadow-xs"
          >
            [OCR: {tok}]
          </span>
        ))}
      </div>
    </div>
  );
};
