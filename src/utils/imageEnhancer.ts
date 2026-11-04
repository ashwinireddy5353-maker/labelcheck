/**
 * Advanced Computer Vision, Image Quality Assessment & Deblurring Pipeline for OCR.
 * 
 * Specifically engineered to handle real camera captures:
 * 1. Image Quality Validation (Blur / Darkness / Overexposure assessment)
 * 2. Automatic Skew Detection & Rotation Correction (tilted documents & bottles)
 * 3. Multi-Scale Difference of Gaussians (DoG) wide-kernel unsharp masking
 * 4. Shock Filtering (iterative sign-Laplacian gradient flow edge steepening)
 * 5. Sauvola & Wolf local adaptive binarization using double integral images
 * 6. CLAHE (Contrast-Limited Adaptive Histogram Equalization)
 * 7. Small text resolution upscaling with high-quality smoothing
 */

export type EnhancementMode = 'smart' | 'document' | 'maximum' | 'inverted' | 'original';

export interface ImageQualityReport {
  brightness: number;        // 0 to 255
  sharpnessScore: number;    // Laplacian variance
  isBlurry: boolean;         // sharpnessScore < 60
  isDark: boolean;           // brightness < 50
  isOverexposed: boolean;    // brightness > 230
  feedbackMessage: string;
  isAcceptable: boolean;
}

export interface EnhancementOptions {
  mode?: EnhancementMode;
  strength?: number;        // 1 (subtle) to 5 (extreme)
  upscaleIfSmall?: boolean; // Scale up small photos (< 1400px)
  invert?: boolean;         // Invert black/white polarity
  clipLimit?: number;       // CLAHE clip limit (default 2.5)
  deskew?: boolean;         // Automatically detect and correct tilted text
}

export interface EnhancementResult {
  enhancedBlob: Blob;
  enhancedFile: File;
  enhancedDataUrl: string;
  originalDataUrl: string;
  width: number;
  height: number;
  mode: EnhancementMode;
  quality: ImageQualityReport;
  skewAngle: number;
}

/**
 * Loads an image source into an HTMLImageElement
 */
export function loadImage(source: File | Blob | string): Promise<{ img: HTMLImageElement; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let url: string;
    let isCreatedUrl = false;

    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      isCreatedUrl = true;
    }

    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.naturalWidth || img.width;
      tempCanvas.height = img.naturalHeight || img.height;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
      }
      const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.96);
      if (isCreatedUrl) {
        URL.revokeObjectURL(url);
      }
      resolve({ img, dataUrl });
    };

    img.onerror = (err) => {
      if (isCreatedUrl) URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for enhancement: ' + err));
    };

    img.src = url;
  });
}

// -------------------------------------------------------------
// IMAGE QUALITY ASSESSMENT (Blur & Lighting Detection)
// -------------------------------------------------------------
export function analyzeImageQuality(gray: Float32Array, w: number, h: number): ImageQualityReport {
  const total = w * h;
  let sumLum = 0;

  for (let i = 0; i < total; i++) {
    sumLum += gray[i];
  }
  const brightness = Math.round(sumLum / total);

  // Compute Variance of Laplacian (blur metric)
  let lapSum = 0;
  let lapSumSq = 0;
  let count = 0;

  // Sample with step to optimize speed on large images
  const step = Math.max(1, Math.floor(Math.sqrt(total) / 300));

  for (let y = step; y < h - step; y += step) {
    const yw = y * w;
    const yprev = (y - step) * w;
    const ynext = (y + step) * w;

    for (let x = step; x < w - step; x += step) {
      const c = gray[yw + x];
      const lap = 4 * c - (gray[yw + x - step] + gray[yw + x + step] + gray[yprev + x] + gray[ynext + x]);
      lapSum += lap;
      lapSumSq += lap * lap;
      count++;
    }
  }

  const meanLap = count > 0 ? lapSum / count : 0;
  const variance = count > 0 ? Math.max(0, lapSumSq / count - meanLap * meanLap) : 0;
  const sharpnessScore = Math.round(variance);

  const isDark = brightness < 50;
  const isOverexposed = brightness > 230;
  const isBlurry = sharpnessScore < 60;

  let feedbackMessage = 'Lighting and focus look good for text recognition.';
  if (isBlurry && isDark) {
    feedbackMessage = 'The image is too dark and blurry. Please improve lighting and hold camera steady.';
  } else if (isBlurry) {
    feedbackMessage = 'The image appears blurry or out of focus. Hold the camera steady 4–8 inches away.';
  } else if (isDark) {
    feedbackMessage = 'The image is too dark. Please turn on your flashlight or move to a brighter room.';
  } else if (isOverexposed) {
    feedbackMessage = 'Strong glare detected. Tilt the packaging slightly away from direct reflections.';
  }

  return {
    brightness,
    sharpnessScore,
    isBlurry,
    isDark,
    isOverexposed,
    feedbackMessage,
    isAcceptable: !isBlurry && !isDark && !isOverexposed,
  };
}

// -------------------------------------------------------------
// TEXT SKEW ANGLE DETECTION (Projection Profile Variance)
// -------------------------------------------------------------
export function detectTextSkewAngle(gray: Float32Array, w: number, h: number): number {
  // Downsample to ~300px width for fast Radon projection
  const targetW = 300;
  const scale = targetW / w;
  const targetH = Math.round(h * scale);
  const sample = new Uint8Array(targetW * targetH);

  // Compute Otsu or median threshold for sampling
  let sum = 0;
  for (let i = 0; i < gray.length; i += 10) sum += gray[i];
  const avg = sum / (gray.length / 10);

  for (let y = 0; y < targetH; y++) {
    const origY = Math.floor(y / scale);
    for (let x = 0; x < targetW; x++) {
      const origX = Math.floor(x / scale);
      sample[y * targetW + x] = gray[origY * w + origX] < avg ? 1 : 0;
    }
  }

  let bestAngle = 0;
  let maxVariance = 0;

  // Search angles from -15 to +15 degrees
  for (let deg = -15; deg <= 15; deg += 1) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const profile = new Float64Array(targetH);
    const counts = new Int32Array(targetH);

    for (let y = 0; y < targetH; y++) {
      const cy = y - targetH / 2;
      for (let x = 0; x < targetW; x++) {
        const cx = x - targetW / 2;
        const rotY = Math.round(cy * cos - cx * sin + targetH / 2);
        if (rotY >= 0 && rotY < targetH) {
          profile[rotY] += sample[y * targetW + x];
          counts[rotY]++;
        }
      }
    }

    let pSum = 0, pSumSq = 0, n = 0;
    for (let y = 0; y < targetH; y++) {
      if (counts[y] > 5) {
        const val = profile[y];
        pSum += val;
        pSumSq += val * val;
        n++;
      }
    }

    if (n > 0) {
      const variance = pSumSq / n - (pSum / n) * (pSum / n);
      if (variance > maxVariance) {
        maxVariance = variance;
        bestAngle = deg;
      }
    }
  }

  return bestAngle;
}

// -------------------------------------------------------------
// SEPARABLE BOX BLUR (O(N) for arbitrary radius)
// -------------------------------------------------------------
function boxBlurHorizontal(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const inv = 1 / (2 * r + 1);
  for (let y = 0; y < h; y++) {
    const yw = y * w;
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const x = Math.max(0, Math.min(w - 1, i));
      sum += src[yw + x];
    }
    for (let x = 0; x < w; x++) {
      dst[yw + x] = sum * inv;
      const xNext = Math.min(w - 1, x + r + 1);
      const xPrev = Math.max(0, x - r);
      sum += src[yw + xNext] - src[yw + xPrev];
    }
  }
}

function boxBlurVertical(src: Float32Array, dst: Float32Array, w: number, h: number, r: number) {
  const inv = 1 / (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      const y = Math.max(0, Math.min(h - 1, i));
      sum += src[y * w + x];
    }
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum * inv;
      const yNext = Math.min(h - 1, y + r + 1);
      const yPrev = Math.max(0, y - r);
      sum += src[yNext * w + x] - src[yPrev * w + x];
    }
  }
}

function separableBoxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const temp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  boxBlurHorizontal(src, temp, w, h, r);
  boxBlurVertical(temp, out, w, h, r);
  return out;
}

// -------------------------------------------------------------
// SHOCK FILTER (Iterative Sign-Laplacian Edge Steepening)
// -------------------------------------------------------------
function applyShockFilter(gray: Float32Array, w: number, h: number, iterations = 2, dt = 0.45): Float32Array {
  let cur = new Float32Array(gray);
  let next = new Float32Array(w * h);

  for (let it = 0; it < iterations; it++) {
    for (let y = 1; y < h - 1; y++) {
      const yw = y * w;
      const yprev = (y - 1) * w;
      const ynext = (y + 1) * w;

      for (let x = 1; x < w - 1; x++) {
        const idx = yw + x;
        const c = cur[idx];

        const dx = (cur[yw + x + 1] - cur[yw + x - 1]) * 0.5;
        const dy = (cur[ynext + x] - cur[yprev + x]) * 0.5;
        const grad = Math.sqrt(dx * dx + dy * dy);

        const lap = 4 * c - (cur[yw + x - 1] + cur[yw + x + 1] + cur[yprev + x] + cur[ynext + x]);

        const signLap = lap > 0.5 ? 1 : (lap < -0.5 ? -1 : 0);
        next[idx] = Math.min(255, Math.max(0, c - dt * signLap * grad));
      }
    }
    for (let x = 0; x < w; x++) {
      next[x] = cur[x];
      next[(h - 1) * w + x] = cur[(h - 1) * w + x];
    }
    for (let y = 0; y < h; y++) {
      next[y * w] = cur[y * w];
      next[y * w + (w - 1)] = cur[y * w + (w - 1)];
    }

    const temp = cur;
    cur = next;
    next = temp;
  }
  return cur;
}

// -------------------------------------------------------------
// CLAHE (Contrast-Limited Adaptive Histogram Equalization)
// -------------------------------------------------------------
function applyCLAHE(gray: Float32Array, w: number, h: number, numTilesX = 8, numTilesY = 8, clipLimit = 2.5): Float32Array {
  const tileW = Math.floor(w / numTilesX);
  const tileH = Math.floor(h / numTilesY);
  const numBins = 256;
  const tileCDFs: Float32Array[] = [];

  for (let ty = 0; ty < numTilesY; ty++) {
    for (let tx = 0; tx < numTilesX; tx++) {
      const hist = new Int32Array(numBins);
      const x0 = tx * tileW;
      const x1 = tx === numTilesX - 1 ? w : (tx + 1) * tileW;
      const y0 = ty * tileH;
      const y1 = ty === numTilesY - 1 ? h : (ty + 1) * tileH;
      const tileArea = (x1 - x0) * (y1 - y0);

      for (let y = y0; y < y1; y++) {
        const yw = y * w;
        for (let x = x0; x < x1; x++) {
          const val = Math.min(255, Math.max(0, Math.round(gray[yw + x])));
          hist[val]++;
        }
      }

      const clipVal = Math.max(1, Math.round((clipLimit * tileArea) / numBins));
      let excess = 0;
      for (let i = 0; i < numBins; i++) {
        if (hist[i] > clipVal) {
          excess += hist[i] - clipVal;
          hist[i] = clipVal;
        }
      }

      const bonus = Math.floor(excess / numBins);
      for (let i = 0; i < numBins; i++) hist[i] += bonus;

      const cdf = new Float32Array(numBins);
      let sum = 0;
      for (let i = 0; i < numBins; i++) {
        sum += hist[i];
        cdf[i] = (sum / tileArea) * 255;
      }
      tileCDFs.push(cdf);
    }
  }

  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const yw = y * w;
    const ty = Math.min(numTilesY - 1, Math.floor(y / tileH));
    const yRel = (y % tileH) / tileH;

    for (let x = 0; x < w; x++) {
      const tx = Math.min(numTilesX - 1, Math.floor(x / tileW));
      const xRel = (x % tileW) / tileW;

      const val = Math.min(255, Math.max(0, Math.round(gray[yw + x])));

      const txNext = Math.min(numTilesX - 1, tx + 1);
      const tyNext = Math.min(numTilesY - 1, ty + 1);

      const cdfTL = tileCDFs[ty * numTilesX + tx][val];
      const cdfTR = tileCDFs[ty * numTilesX + txNext][val];
      const cdfBL = tileCDFs[tyNext * numTilesX + tx][val];
      const cdfBR = tileCDFs[tyNext * numTilesX + txNext][val];

      const top = cdfTL * (1 - xRel) + cdfTR * xRel;
      const bot = cdfBL * (1 - xRel) + cdfBR * xRel;
      out[yw + x] = top * (1 - yRel) + bot * yRel;
    }
  }
  return out;
}

// -------------------------------------------------------------
// SAUVOLA & WOLF LOCAL ADAPTIVE BINARIZATION
// -------------------------------------------------------------
function applySauvolaBinarization(
  gray: Float32Array,
  w: number,
  h: number,
  windowSize = 25,
  k = 0.22,
  R = 128,
  invert = false
): Float32Array {
  const integral = new Float64Array((w + 1) * (h + 1));
  const integralSq = new Float64Array((w + 1) * (h + 1));

  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    const yw = y * w;
    for (let x = 0; x < w; x++) {
      const val = gray[yw + x];
      rowSum += val;
      rowSumSq += val * val;
      const idx = (y + 1) * (w + 1) + (x + 1);
      const aboveIdx = y * (w + 1) + (x + 1);
      integral[idx] = integral[aboveIdx] + rowSum;
      integralSq[idx] = integralSq[aboveIdx] + rowSumSq;
    }
  }

  const binary = new Float32Array(w * h);
  const halfWin = Math.floor(windowSize / 2);

  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - halfWin);
    const y1 = Math.min(h - 1, y + halfWin);
    const yw = y * w;

    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - halfWin);
      const x1 = Math.min(w - 1, x + halfWin);
      const count = (x1 - x0 + 1) * (y1 - y0 + 1);

      const A = y0 * (w + 1) + x0;
      const B = y0 * (w + 1) + (x1 + 1);
      const C = (y1 + 1) * (w + 1) + x0;
      const D = (y1 + 1) * (w + 1) + (x1 + 1);

      const sum = integral[D] - integral[B] - integral[C] + integral[A];
      const sumSq = integralSq[D] - integralSq[B] - integralSq[C] + integralSq[A];

      const mean = sum / count;
      const variance = Math.max(0, (sumSq - (sum * sum) / count) / count);
      const stdDev = Math.sqrt(variance);

      const threshold = mean * (1 + k * (stdDev / R - 1));

      const isDark = gray[yw + x] < threshold;
      if (invert) {
        binary[yw + x] = isDark ? 255 : 0;
      } else {
        binary[yw + x] = isDark ? 0 : 255;
      }
    }
  }

  return binary;
}

/**
 * Main Enhancement Function: Deblurs, deskews, and enhances images for OCR.
 */
export async function enhanceImageForOCR(
  imageSource: File | Blob | string,
  options: EnhancementOptions = {}
): Promise<EnhancementResult> {
  const {
    mode = 'smart',
    strength = 3,
    upscaleIfSmall = true,
    invert = false,
    clipLimit = 2.5,
    deskew = true,
  } = options;

  const { img, dataUrl: originalDataUrl } = await loadImage(imageSource);

  let origWidth = img.naturalWidth || img.width;
  let origHeight = img.naturalHeight || img.height;

  // 1. Resolution optimization: small camera captures (< 1400px width) lose fine text strokes
  let targetWidth = origWidth;
  let targetHeight = origHeight;

  if (upscaleIfSmall && targetWidth < 1400) {
    const scale = Math.min(2.5, 1600 / targetWidth);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  // Cap at 3200px for browser canvas stability
  if (targetWidth > 3200 || targetHeight > 3200) {
    const downScale = 3200 / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * downScale);
    targetHeight = Math.round(targetHeight * downScale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas 2D rendering context not available');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;
  const len = data.length;
  const totalPixels = targetWidth * targetHeight;

  // 2. Grayscale conversion (Luminance)
  const gray = new Float32Array(totalPixels);
  for (let i = 0, p = 0; i < len; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // 3. Quality Validation
  const quality = analyzeImageQuality(gray, targetWidth, targetHeight);

  // 4. Skew angle detection and deskewing
  let skewAngle = 0;
  if (deskew) {
    skewAngle = detectTextSkewAngle(gray, targetWidth, targetHeight);
    if (Math.abs(skewAngle) >= 1.5 && Math.abs(skewAngle) <= 15) {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = targetWidth;
      rotCanvas.height = targetHeight;
      const rotCtx = rotCanvas.getContext('2d');
      if (rotCtx) {
        rotCtx.translate(targetWidth / 2, targetHeight / 2);
        rotCtx.rotate((-skewAngle * Math.PI) / 180);
        rotCtx.drawImage(canvas, -targetWidth / 2, -targetHeight / 2);
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(rotCanvas, 0, 0);

        // Update gray buffer with rotated data
        const rotData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
        for (let i = 0, p = 0; i < len; i += 4, p++) {
          gray[p] = 0.299 * rotData[i] + 0.587 * rotData[i + 1] + 0.114 * rotData[i + 2];
        }
      }
    }
  }

  if (mode === 'original') {
    const blob = await new Promise<Blob>((resolve) => {
      if (imageSource instanceof Blob) resolve(imageSource);
      else {
        fetch(originalDataUrl).then(r => r.blob()).then(resolve);
      }
    });
    const file = new File([blob], `label_original_${Date.now()}.jpg`, { type: 'image/jpeg' });
    return {
      enhancedBlob: blob,
      enhancedFile: file,
      enhancedDataUrl: originalDataUrl,
      originalDataUrl,
      width: origWidth,
      height: origHeight,
      mode: 'original',
      quality,
      skewAngle,
    };
  }

  let processed: Float32Array<ArrayBufferLike> = gray;

  // 5. Select enhancement strategy based on user mode
  if (mode === 'document' || mode === 'inverted') {
    const isInv = mode === 'inverted' || invert;
    processed = applySauvolaBinarization(gray, targetWidth, targetHeight, 25, 0.22, 128, isInv);
  } else if (mode === 'maximum') {
    const clahe = applyCLAHE(gray, targetWidth, targetHeight, 8, 8, clipLimit + 1.0);
    const blurFine = separableBoxBlur(clahe, targetWidth, targetHeight, 3);
    const blurMed = separableBoxBlur(clahe, targetWidth, targetHeight, 8);

    const dogSharp = new Float32Array(totalPixels);
    const dogWeight = 0.8 + strength * 0.45;

    for (let i = 0; i < totalPixels; i++) {
      const hFine = clahe[i] - blurFine[i];
      const hMed = clahe[i] - blurMed[i];
      dogSharp[i] = Math.min(255, Math.max(0, clahe[i] + dogWeight * hFine + (dogWeight * 0.7) * hMed));
    }

    processed = applyShockFilter(dogSharp, targetWidth, targetHeight, 3, 0.5);
  } else {
    // 'smart': Dual-scale DoG Unsharp Mask + CLAHE + light Shock Filter
    const clahe = applyCLAHE(gray, targetWidth, targetHeight, 8, 8, clipLimit);
    const blurFine = separableBoxBlur(clahe, targetWidth, targetHeight, 2);
    const blurMed = separableBoxBlur(clahe, targetWidth, targetHeight, 6);

    const dogSharp = new Float32Array(totalPixels);
    const dogWeight = 0.6 + strength * 0.35;

    for (let i = 0; i < totalPixels; i++) {
      const hFine = clahe[i] - blurFine[i];
      const hMed = clahe[i] - blurMed[i];
      dogSharp[i] = Math.min(255, Math.max(0, clahe[i] + dogWeight * hFine + (dogWeight * 0.5) * hMed));
    }

    processed = applyShockFilter(dogSharp, targetWidth, targetHeight, 2, 0.45);
  }

  if (invert && mode !== 'inverted') {
    for (let p = 0; p < totalPixels; p++) {
      processed[p] = 255 - processed[p];
    }
  }

  // Write back to ImageData
  const currentImgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const outData = currentImgData.data;
  for (let i = 0, p = 0; i < len; i += 4, p++) {
    const val = Math.min(255, Math.max(0, processed[p]));
    outData[i] = val;     // R
    outData[i + 1] = val; // G
    outData[i + 2] = val; // B
    outData[i + 3] = 255; // A
  }

  ctx.putImageData(currentImgData, 0, 0);

  const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.96);
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.96)
  );

  const enhancedFile = new File(
    [blob],
    `enhanced_${mode}_${Date.now()}.jpg`,
    { type: 'image/jpeg' }
  );

  return {
    enhancedBlob: blob,
    enhancedFile,
    enhancedDataUrl,
    originalDataUrl,
    width: targetWidth,
    height: targetHeight,
    mode,
    quality,
    skewAngle,
  };
}

/**
 * Generates enhancement variations from the RAW image source for the multi-pass OCR ensemble.
 */
export async function generateEnhancementVariations(
  imageSource: File | Blob | string
): Promise<{
  original: { dataUrl: string };
  smart: EnhancementResult;
  document: EnhancementResult;
  maximum: EnhancementResult;
}> {
  const { dataUrl: originalDataUrl } = await loadImage(imageSource);

  const [smart, document, maximum] = await Promise.all([
    enhanceImageForOCR(imageSource, { mode: 'smart', strength: 3, deskew: true }),
    enhanceImageForOCR(imageSource, { mode: 'document', deskew: true }),
    enhanceImageForOCR(imageSource, { mode: 'maximum', strength: 4, deskew: true }),
  ]);

  return {
    original: { dataUrl: originalDataUrl },
    smart,
    document,
    maximum,
  };
}
