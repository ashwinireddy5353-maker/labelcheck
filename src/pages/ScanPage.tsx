import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { scanApi } from '../api/services';
import { useToast } from '../context/ToastContext';
import { FileUpload } from '../components/scan/FileUpload';
import { CameraCapture } from '../components/scan/CameraCapture';
import { ScanProgress } from '../components/scan/ScanProgress';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Upload, 
  Camera, 
  FileText, 
  Sparkles, 
  ArrowRight, 
  RefreshCw, 
  Scan as ScanIcon 
} from 'lucide-react';

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as 'upload' | 'camera' | 'manual') || 'upload';
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'manual'>(initialTab);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Cosmetics & Skincare');

  const [isProcessing, setIsProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  const samplePlaceholder = 'Aqua (Water), Glycerin, Fragrance / Parfum, Sodium Lauryl Sulfate, DMDM Hydantoin, Methylparaben, Tocopheryl Acetate, Botanical Ext 402X';

  const handleStartScan = async () => {
    setHasError(false);

    if (activeTab === 'upload' || activeTab === 'camera') {
      if (!selectedFile) {
        showToast('Please upload or capture a label image first.', 'warning');
        return;
      }
    } else if (activeTab === 'manual') {
      if (!manualText.trim()) {
        showToast('Please enter or paste an ingredient list.', 'warning');
        return;
      }
    }

    setIsProcessing(true);

    try {
      let scanId = `scan_${Date.now()}`;
      if (selectedFile) {
        const uploadRes = await scanApi.uploadScanImage(selectedFile);
        scanId = uploadRes.scanId;
      }
      setCurrentScanId(scanId);
    } catch (err: any) {
      console.error('Scan initiation failed', err);
      setHasError(true);
      setErrorMessage(err.message || 'Failed to initiate AI scan session.');
      setIsProcessing(false);
    }
  };

  const handleScanAnimationComplete = async () => {
    if (!currentScanId) return;

    try {
      // Trigger OCR extraction
      const ocrResult = await scanApi.performOCR(
        currentScanId,
        activeTab === 'manual' ? manualText : undefined
      );

      // Save raw extracted state for OCR review page
      sessionStorage.setItem(`labelcheck_ocr_${currentScanId}`, JSON.stringify({
        ocrResult,
        productName: productName || 'Scanned Packaged Product',
        category,
      }));

      setIsProcessing(false);
      navigate(`/scan/review/${currentScanId}`);
    } catch (err: any) {
      setHasError(true);
      setErrorMessage('OCR Extraction failed. Image may be blurry or illegible.');
      setIsProcessing(false);
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <ScanProgress onComplete={handleScanAnimationComplete} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Title Header */}
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200">
          <Sparkles className="w-3.5 h-3.5 text-teal-700" />
          Product Scan Workspace
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900">Scan Product Label</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Upload a high-res image, snap a live photo, or paste text to screen for allergens and hazardous chemicals.
        </p>
      </div>

      {/* Main Scan Form Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 space-y-6">
        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'upload' ? 'bg-white text-teal-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Image</span>
            <span className="sm:hidden">Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'camera' ? 'bg-white text-teal-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">Camera Capture</span>
            <span className="sm:hidden">Camera</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'manual' ? 'bg-white text-teal-700 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Manual Input</span>
            <span className="sm:hidden">Manual</span>
          </button>
        </div>

        {/* Product Meta Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <Input
            label="Product Name (Optional)"
            placeholder="e.g. Daily Moisture Body Lotion"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <div>
            <label className="text-xs font-semibold text-slate-700 tracking-wide block mb-1.5">
              Product Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600"
            >
              <option value="Cosmetics & Skincare">Cosmetics & Skincare</option>
              <option value="Haircare">Haircare & Shampoos</option>
              <option value="Sunscreen">Sunscreen & Solar Protection</option>
              <option value="Body & Cleansing">Body Wash & Soaps</option>
              <option value="Baby Care">Baby & Pediatric Care</option>
              <option value="Packaged Foods">Packaged Foods / Consumables</option>
            </select>
          </div>
        </div>

        {/* Tab 1: File Upload */}
        {activeTab === 'upload' && (
          <FileUpload
            onFileSelect={(file) => setSelectedFile(file)}
            selectedFile={selectedFile}
            onClear={() => setSelectedFile(null)}
          />
        )}

        {/* Tab 2: Camera Capture */}
        {activeTab === 'camera' && (
          <CameraCapture
            onCapture={(file) => setSelectedFile(file)}
            onClear={() => setSelectedFile(null)}
          />
        )}

        {/* Tab 3: Manual Text Input */}
        {activeTab === 'manual' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
              <span>Paste Ingredient List</span>
              <span className="text-slate-400 font-mono">{manualText.length} characters</span>
            </div>

            <textarea
              rows={6}
              placeholder={samplePlaceholder}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition-all leading-relaxed"
            />

            <div className="flex justify-between items-center text-xs text-slate-500">
              <button
                onClick={() => setManualText(samplePlaceholder)}
                className="text-teal-700 font-semibold hover:underline"
              >
                + Load sample lotion ingredient text
              </button>
              {manualText && (
                <button onClick={() => setManualText('')} className="text-red-600 hover:underline">
                  Clear Text
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Feedback Display */}
        {hasError && (
          <ErrorState
            title="Scan Processing Error"
            message={errorMessage}
            onRetry={handleStartScan}
          />
        )}

        {/* Submit Scan Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedFile(null);
              setManualText('');
              setProductName('');
            }}
          >
            Clear All Fields
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={handleStartScan}
            leftIcon={<ScanIcon className="w-5 h-5" />}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="shadow-lg shadow-teal-700/20"
          >
            Analyze Ingredients with AI
          </Button>
        </div>
      </div>
    </div>
  );
};
