import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, AlertCircle, FileCheck } from 'lucide-react';
import { Button } from '../ui/Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  const MAX_SIZE_MB = 10;

  const validateAndProcess = (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMessage('Invalid file type. Please upload JPG, PNG, JPEG, or WebP images.');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max allowed size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    onFileSelect(file);
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
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClear();
  };

  return (
    <div className="w-full space-y-4">
      {selectedFile && previewUrl ? (
        <div className="relative p-4 bg-slate-900 text-white rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center">
          <div className="relative max-h-72 overflow-hidden rounded-xl w-full flex items-center justify-center bg-slate-950">
            <img src={previewUrl} alt="Ingredient Label Preview" className="max-h-72 object-contain" />
          </div>

          <div className="mt-4 flex items-center justify-between w-full px-2">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold truncate max-w-xs">{selectedFile.name}</p>
                <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for AI OCR</p>
              </div>
            </div>

            <Button variant="danger" size="sm" onClick={handleRemove} leftIcon={<X className="w-4 h-4" />}>
              Remove & Replace
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
            Supports high-resolution packaged product labels in JPG, PNG, JPEG, or WebP up to 10MB.
          </p>

          <Button variant="outline" size="sm" className="mt-5" leftIcon={<ImageIcon className="w-4 h-4" />}>
            Browse Local File
          </Button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
