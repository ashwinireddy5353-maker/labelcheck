import React from 'react';
import { Scan, Focus } from 'lucide-react';

export const ScanHUDOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl border-2 border-teal-500/40">
      {/* Animated Scanning Laser Line */}
      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-scan-laser" />

      {/* Frame Reticle Corners */}
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-teal-400" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-teal-400" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-teal-400" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-teal-400" />

      {/* Center Target Box */}
      <div className="absolute inset-10 sm:inset-16 border border-dashed border-teal-400/30 rounded-xl flex items-center justify-center">
        <div className="w-8 h-8 border border-teal-400/40 rounded-full flex items-center justify-center">
          <Focus className="w-4 h-4 text-teal-400/60" />
        </div>
      </div>

      {/* HUD Scanner Status Banner */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/85 text-teal-300 text-[10px] font-mono px-3 py-1 rounded-full border border-teal-500/50 flex items-center gap-2 backdrop-blur-xs shadow-lg">
        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
        <span>POSITION INGREDIENT LIST INSIDE FRAME</span>
      </div>

      {/* Alignment Guidance Tip */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-center w-full px-4">
        <span className="inline-block px-3 py-0.5 bg-slate-950/80 text-teal-200/90 text-[10px] font-mono rounded-full border border-teal-500/30 backdrop-blur-xs">
          HOLD 4–8 INCHES AWAY • ENSURE BRIGHT LIGHTING
        </span>
      </div>
    </div>
  );
};
