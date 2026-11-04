import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  RefreshCw, 
  CheckCircle2, 
  AlertOctagon, 
  Zap, 
  ZapOff, 
  Sparkles,
  Sliders,
  FileText,
  Flame,
  SunMoon,
  Image as ImageIcon,
  SwitchCamera,
  AlertTriangle,
  Check
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ScanHUDOverlay } from './ScanHUDOverlay';
import { enhanceImageForOCR, EnhancementMode, ImageQualityReport, analyzeImageQuality } from '../../utils/imageEnhancer';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClear: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClear }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Camera direction: environment (rear) vs user (front)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Quality validation report
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null);

  // Enhancement controls
  const [activeMode, setActiveMode] = useState<EnhancementMode>('smart');
  const [deblurStrength, setDeblurStrength] = useState<number>(3);

  // Hardware capabilities state
  const [hasTorch, setHasTorch] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rawFileRef = useRef<File | null>(null);

  const startCamera = async (direction: 'environment' | 'user' = facingMode) => {
    try {
      setHasPermission(null);
      stopCamera();

      // High-resolution request for crisp text rendering
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: direction },
          width: { ideal: 1920, min: 1280, max: 3840 },
          height: { ideal: 1080, min: 720, max: 2160 },
        },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setHasPermission(true);

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        try {
          const capabilities = (track as any).getCapabilities?.() || {};
          if (capabilities.torch) {
            setHasTorch(true);
          } else {
            setHasTorch(false);
          }
          if (capabilities.zoom) {
            setMaxZoom(capabilities.zoom.max || 3);
          }
          if (capabilities.focusMode?.includes('continuous')) {
            await (track as any).applyConstraints({
              advanced: [{ focusMode: 'continuous' }],
            });
          }
        } catch {
          // Hardware optional
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access denied or unequipped', err);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchActive;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchActive(nextState);
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
  };

  const setZoom = async (level: number) => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && maxZoom > 1) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ zoom: level }],
        });
        setZoomLevel(level);
      } catch (e) {
        console.warn('Zoom failed', e);
      }
    }
  };

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
        setCapturedImage(result.enhancedDataUrl);
        setQualityReport(result.quality);
        onCapture(result.enhancedFile);
      } catch (err) {
        console.warn('Enhancement failed:', err);
        setCapturedImage(URL.createObjectURL(file));
        onCapture(file);
      } finally {
        setIsEnhancing(false);
      }
    },
    [onCapture]
  );

  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video stream has loaded video frames
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (video.videoWidth && video.videoHeight) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      setIsCapturing(false);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, width, height);

    // Initial Quality Check on Raw Snapshot
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const gray = new Float32Array(width * height);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const quality = analyzeImageQuality(gray, width, height);
    setQualityReport(quality);

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.96);
    setCapturedImage(rawDataUrl);

    stopCamera();

    const rawBlob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.96)
    );
    const rawFile = new File([rawBlob], `label_camera_raw_${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    rawFileRef.current = rawFile;

    await applyEnhancement(rawFile, activeMode, deblurStrength);
    setIsCapturing(false);
  };

  const handleModeChange = (mode: EnhancementMode) => {
    setActiveMode(mode);
    if (rawFileRef.current) {
      applyEnhancement(rawFileRef.current, mode, deblurStrength);
    }
  };

  const handleStrengthChange = (strength: number) => {
    setDeblurStrength(strength);
    if (rawFileRef.current) {
      applyEnhancement(rawFileRef.current, activeMode, strength);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setQualityReport(null);
    rawFileRef.current = null;
    onClear();
    startCamera(facingMode);
  };

  if (hasPermission === false) {
    return (
      <div className="p-8 text-center bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
        <div className="p-3 bg-red-900/50 text-red-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
          <AlertOctagon className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold">Camera Permission Denied or Device Unavailable</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Please check your browser permissions to grant camera access, or use the Upload Image tab instead.
        </p>
        <Button variant="outline" size="sm" onClick={() => startCamera(facingMode)} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Retry Camera Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Viewport Frame */}
      <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 min-h-[340px] flex items-center justify-center shadow-inner">
        {capturedImage ? (
          <div className="relative w-full flex flex-col items-center justify-center p-2 bg-slate-900">
            <img
              src={capturedImage}
              alt="Captured Ingredient Label"
              className="max-h-96 object-contain rounded-xl w-full border border-slate-800 bg-black/40"
            />
            {/* Status Chip */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-950/90 text-teal-300 rounded-full text-[11px] font-bold border border-teal-500/40 backdrop-blur-md shadow-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                {isEnhancing ? 'Processing Enhancement...' : `Mode: ${activeMode.toUpperCase()}`}
              </span>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-96 object-cover"
            />

            {/* Live Camera Controls Overlay */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={handleToggleFacingMode}
                title="Switch Camera (Front / Rear)"
                className="p-2 rounded-full bg-slate-900/80 text-white border border-slate-700 hover:bg-slate-800 backdrop-blur-md transition-colors"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>

              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  title={torchActive ? 'Turn off Flashlight' : 'Turn on Flashlight'}
                  className={`p-2 rounded-full border backdrop-blur-md transition-colors ${
                    torchActive
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                      : 'bg-slate-900/80 text-white border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {torchActive ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              {maxZoom > 1 && (
                <button
                  type="button"
                  onClick={() => setZoom(zoomLevel === 1 ? Math.min(2, maxZoom) : 1)}
                  title="Toggle 2x Optical/Digital Zoom"
                  className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-xs font-mono font-bold border border-slate-700 hover:bg-slate-800 backdrop-blur-md"
                >
                  {zoomLevel}x
                </button>
              )}
            </div>

            {/* Live Sci-Fi HUD Framing Guide */}
            <ScanHUDOverlay />
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Image Quality Assessment Feedback Banner */}
      {capturedImage && qualityReport && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 transition-all ${
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
              Focus Score: {qualityReport.sharpnessScore} • Luminance: {qualityReport.brightness}/255
            </span>
          </div>
        </div>
      )}

      {/* Captured Controls & Post-Processing Studio */}
      {capturedImage ? (
        <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-bold text-slate-200">AI Deblur & Contrast Studio</span>
            </div>
            <span className="text-[11px] text-slate-400">Select mode to optimize OCR for your packaging</span>
          </div>

          {/* Enhancement Mode Selector */}
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
              <Sparkles className="w-4 h-4 text-teal-400" />
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
              <FileText className="w-4 h-4 text-amber-400" />
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
              <Flame className="w-4 h-4 text-red-400" />
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
              <SunMoon className="w-4 h-4 text-purple-400" />
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
              <ImageIcon className="w-4 h-4 text-slate-400" />
              <span>Raw Photo</span>
              <span className="text-[9px] font-normal text-slate-400">No filter</span>
            </button>
          </div>

          {/* Strength Slider */}
          {(activeMode === 'smart' || activeMode === 'maximum') && (
            <div className="flex items-center justify-between gap-4 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <span className="text-xs font-medium text-slate-300">Deblur Sharpness Strength:</span>
              <div className="flex items-center gap-3 flex-1 max-w-xs">
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

          {/* Actions Bar */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" size="sm" onClick={handleRetake} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retake Photo
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-teal-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Image Ready for Analysis
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={takeSnapshot}
            disabled={isCapturing}
            leftIcon={<Camera className="w-5 h-5" />}
            className="w-full sm:w-auto shadow-lg shadow-teal-700/20 bg-teal-700 hover:bg-teal-800"
          >
            {isCapturing ? 'Capturing Frame...' : 'Capture Label Snapshot'}
          </Button>
        </div>
      )}
    </div>
  );
};
