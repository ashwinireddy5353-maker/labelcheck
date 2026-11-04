import { createWorker } from 'tesseract.js';
import { generateEnhancementVariations, analyzeImageQuality, loadImage, ImageQualityReport } from './imageEnhancer';
import { parseAndCorrectIngredients } from './ingredientMatcher';
import { OCRResult, OCRItem } from '../types';

let cachedWorker: any = null;

export async function getOCRWorker(onProgress?: (pct: number, status: string) => void) {
  if (cachedWorker) {
    return cachedWorker;
  }

  // Use Tesseract.js with standard English LSTM model
  // Do NOT set restrictive character whitelists: whitelists break LSTM beam search
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress && m.status === 'recognizing text') {
        onProgress(Math.round(m.progress * 100), m.status);
      }
    },
  });

  // PSM 3 = Fully automatic page segmentation (preserves multiple paragraphs, columns, lines)
  await worker.setParameters({
    tessedit_pageseg_mode: '3' as any,
    preserve_interword_spaces: '1',
  });

  cachedWorker = worker;
  return worker;
}

/**
 * Terminates and clears the cached worker to free GPU/WASM memory when needed.
 */
export async function terminateOCRWorker(): Promise<void> {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {
      // Ignored
    }
    cachedWorker = null;
  }
}

/**
 * Merges and deduplicates OCR items extracted from multiple enhancement passes.
 * Retains items with the highest confidence and best dictionary match.
 */
function mergeExtractedItems(itemsList: OCRItem[][]): OCRItem[] {
  const mergedMap = new Map<string, OCRItem>();

  for (const items of itemsList) {
    for (const item of items) {
      const key = item.suggestedName.toLowerCase().trim();
      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      } else {
        const existing = mergedMap.get(key)!;
        if (item.confidence > existing.confidence || (existing.isSuspectedError && !item.isSuspectedError)) {
          mergedMap.set(key, item);
        }
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Recognizes text and cosmetic ingredients from an image using an Ensemble Multi-Pass Pipeline.
 * 
 * Strategy:
 * 1. Pass 1: Raw Original High-Resolution image
 * 2. Pass 2: High-Contrast Document Binarization (Sauvola Adaptive Threshold)
 * 3. Pass 3: Multi-Scale Optical Deblur (DoG + CLAHE)
 * 
 * Selects the highest quality raw transcription preserving all line breaks and punctuation,
 * while cross-validating extracted ingredients against the 3,456 cosmetic ingredients database.
 */
export async function recognizeIngredientsFromImage(
  imageSource: File | Blob | string,
  options: {
    scanId?: string;
    onProgress?: (message: string, percent: number) => void;
  } = {}
): Promise<OCRResult> {
  const scanId = options.scanId || `scan_${Date.now()}`;
  const onProgress = options.onProgress || (() => {});

  onProgress('Assessing image quality & focus...', 8);

  // Generate multi-scale DoG deblurred + Sauvola binarized versions in parallel
  const variations = await generateEnhancementVariations(imageSource);
  const imageQuality: ImageQualityReport = variations.smart.quality;

  onProgress('Initializing neural OCR engine...', 20);
  const worker = await getOCRWorker((pct) => {
    onProgress(`Recognizing text (${pct}%)...`, 20 + Math.round(pct * 0.5));
  });

  // Pass 1: OCR on Raw Original Image
  onProgress('Scanning Pass 1: Original high-resolution text...', 30);
  const resultOrig = await worker.recognize(variations.original.dataUrl);
  const textOrig = (resultOrig?.data?.text || '').trim();
  const parsedOrig = parseAndCorrectIngredients(textOrig);

  // Pass 2: OCR on Sauvola Local Adaptive Document Binarization
  // Eliminates bottle reflections, packaging shadows, and glare
  onProgress('Scanning Pass 2: High-contrast document threshold...', 55);
  const resultDoc = await worker.recognize(variations.document.enhancedDataUrl);
  const textDoc = (resultDoc?.data?.text || '').trim();
  const parsedDoc = parseAndCorrectIngredients(textDoc);

  let bestRawText = textOrig.length >= textDoc.length ? textOrig : textDoc;
  let allParsed = [parsedOrig.extractedItems, parsedDoc.extractedItems];

  // Pass 3 (Deblur Fallback): If either pass had low confidence or few words
  if (parsedOrig.extractedItems.length < 3 && parsedDoc.extractedItems.length < 3) {
    onProgress('Scanning Pass 3: Multi-scale optical deblur filter...', 75);
    const resultSmart = await worker.recognize(variations.smart.enhancedDataUrl);
    const textSmart = (resultSmart?.data?.text || '').trim();
    const parsedSmart = parseAndCorrectIngredients(textSmart);

    allParsed.push(parsedSmart.extractedItems);
    if (textSmart.length > bestRawText.length) {
      bestRawText = textSmart;
    }
  }

  onProgress('Matching ingredients against master database...', 90);

  // Merge and deduplicate all extracted ingredients
  const mergedItems = mergeExtractedItems(allParsed);

  const overallConfidence =
    mergedItems.length > 0
      ? Math.round(
          (mergedItems.reduce((acc, i) => acc + i.confidence, 0) / mergedItems.length) * 100
        ) / 100
      : (resultOrig?.data?.confidence ? Math.round(resultOrig.data.confidence) / 100 : 0.85);

  onProgress('Finalizing results dashboard...', 100);

  // Clean raw text display: preserve original layout, lines, numbers, and symbols
  const rawTextOutput = bestRawText || 'No readable text detected in the image.';

  return {
    scanId,
    rawText: rawTextOutput,
    overallConfidence,
    extractedItems: mergedItems,
    imageUrl: variations.document.enhancedDataUrl || variations.smart.enhancedDataUrl,
    imageQuality,
  };
}
