import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  X, 
  AlertCircle, 
  FileCheck,
  Sparkles,
  Sliders,
  FileText,
  Flame,
  SunMoon,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { enhanceImageForOCR, EnhancementMode, ImageQualityReport } from '../../utils/imageEnhancer';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<EnhancementMode>('smart');
  const [deblurStrength, setDeblurStrength] = useState<number>(3);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const MAX_SIZE_MB = 15;

  const applyEnhancement = useCallback(
    async (file: File, mode: EnhancementMode, strength: number) => {
      setIsEnhancing(true);
      try {
        const result = await enhanceImageForOCR(file, {
          mode,
          strength,
          upscaleIfSmall: true,
          deskew: true,
        });
        setPreviewUrl(result.enhancedDataUrl);
        setQualityReport(result.quality);
        onFileSelect(result.enhancedFile);
      } catch (err) {
        console.warn('Enhancement failed:', err);
        setPreviewUrl(URL.createObjectURL(file));
        onFileSelect(file);
      } finally {
        setIsEnhancing(false);
      }
    },
    [onFileSelect]
  );

  const validateAndProcess = async (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload JPG, PNG, JPEG, or WebP images.');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    originalFileRef.current = file;
    await applyEnhancement(file, activeMode, deblurStrength);
  };

  const handleModeChange = (mode: EnhancementMode) => {
    setActiveMode(mode);
    if (originalFileRef.current) {
      applyEnhancement(originalFileRef.current, mode, deblurStrength);
    }
  };

  const handleStrengthChange = (strength: number) => {
    setDeblurStrength(strength);
    if (originalFileRef.current) {
      applyEnhancement(originalFileRef.current, activeMode, strength);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setQualityReport(null);
    setErrorMessage(null);
    originalFileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="w-full space-y-4">
      {selectedFile && previewUrl ? (
        <div className="relative p-4 bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center space-y-4 shadow-xl">
          <div className="relative max-h-80 overflow-hidden rounded-xl w-full flex items-center justify-center bg-slate-950 border border-slate-800">
            <img src={previewUrl} alt="Ingredient Label Preview" className="max-h-80 object-contain" />
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 bg-slate-950/90 text-teal-300 rounded-full text-[10px] font-bold border border-teal-500/40 backdrop-blur-md shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-teal-400" />
                {isEnhancing ? 'Enhancing...' : `Mode: ${activeMode.toUpperCase()}`}
              </span>
            </div>
          </div>

          {/* Quality Feedback Banner */}
          {qualityReport && (
            <div
              className={`w-full p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                qualityReport.isAcceptable
                  ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-200'
                  : 'bg-amber-950/60 border-amber-700/50 text-amber-200'
              }`}
            >
              {qualityReport.isAcceptable ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-semibold">{qualityReport.feedbackMessage}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Focus Score: {qualityReport.sharpnessScore} • Brightness: {qualityReport.brightness}/255
                </span>
              </div>
            </div>
          )}

          {/* AI Deblur & Contrast Filter Studio */}
          <div className="w-full space-y-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-slate-200">AI Deblur & Contrast Optimization</span>
              </div>
              <span className="text-[10px] text-slate-400">Select preset to optimize OCR</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('smart')}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                  activeMode === 'smart'
                    ? 'bg-teal-950 text-teal-300 border-teal-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Smart Deblur</span>
                <span className="text-[9px] font-normal text-slate-400">DoG + CLAHE</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('document')}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                  activeMode === 'document'
                    ? 'bg-teal-950 text-teal-300 border-teal-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>B&W Document</span>
                <span className="text-[9px] font-normal text-slate-400">Sauvola Adaptive</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('maximum')}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                  activeMode === 'maximum'
                    ? 'bg-teal-950 text-teal-300 border-teal-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>Max Deblur</span>
                <span className="text-[9px] font-normal text-slate-400">Shock Steepening</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('inverted')}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                  activeMode === 'inverted'
                    ? 'bg-teal-950 text-teal-300 border-teal-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <SunMoon className="w-3.5 h-3.5 text-purple-400" />
                <span>Invert Colors</span>
                <span className="text-[9px] font-normal text-slate-400">White on Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('original')}
                className={`p-2 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all border ${
                  activeMode === 'original'
                    ? 'bg-teal-950 text-teal-300 border-teal-500 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Raw Photo</span>
                <span className="text-[9px] font-normal text-slate-400">No filter</span>
              </button>
            </div>

            {(activeMode === 'smart' || activeMode === 'maximum') && (
              <div className="flex items-center justify-between gap-4 bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-300">Sharpness Strength:</span>
                <div className="flex items-center gap-2 flex-1 max-w-xs">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={deblurStrength}
                    onChange={(e) => handleStrengthChange(Number(e.target.value))}
                    className="w-full accent-teal-500 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-teal-400 w-6 text-center">
                    {deblurStrength}x
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between w-full px-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-400">Ready for AI analysis</p>
              </div>
            </div>

            <Button variant="danger" size="sm" onClick={handleRemove} leftIcon={<X className="w-4 h-4" />}>
              Replace Image
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-teal-500 bg-teal-50/60 scale-[1.01]'
              : 'border-slate-300 hover:border-teal-600 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mx-auto w-14 h-14 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-4 shadow-sm">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h4 className="text-base font-bold text-slate-900">Drag & Drop Product Label Image</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Supports packaged product labels in JPG, PNG, JPEG, or WebP up to 15MB.
          </p>

          <Button variant="outline" size="sm" className="mt-5" leftIcon={<ImageIcon className="w-4 h-4" />}>
            Browse Device Files
          </Button>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center justify-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
