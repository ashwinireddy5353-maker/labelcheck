import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Button } from '../ui/Button';
import { ScanHUDOverlay } from './ScanHUDOverlay';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClear: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClear }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setHasPermission(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setHasPermission(true);
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
    startCamera();
    return () => stopCamera();
  }, []);

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);

      // Convert dataUrl to File object
      fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], `label_camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
        });
      stopCamera();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    onClear();
    startCamera();
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
        <Button variant="outline" size="sm" onClick={startCamera} leftIcon={<RefreshCw className="w-4 h-4" />}>
          Retry Camera Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 min-h-[300px] flex items-center justify-center">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured Label" className="max-h-80 object-contain w-full" />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-h-80 object-cover"
            />
            {/* Live Sci-Fi HUD Overlay */}
            <ScanHUDOverlay />
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex items-center justify-center gap-4">
        {capturedImage ? (
          <>
            <Button variant="outline" onClick={handleRetake} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Retake Photo
            </Button>
            <Button variant="primary" leftIcon={<CheckCircle2 className="w-4 h-4" />}>
              Use Captured Image
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={takeSnapshot}
            disabled={!hasPermission}
            leftIcon={<Camera className="w-5 h-5" />}
          >
            Capture Label Photo
          </Button>
        )}
      </div>
    </div>
  );
};
