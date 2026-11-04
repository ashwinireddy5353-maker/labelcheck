import canonicalList from './canonicalIngredients.json';
import { OCRItem } from '../types';

// Pre-index canonical ingredients for fast lowercase lookups
const canonicalIngredients: string[] = canonicalList as string[];
const canonicalLowerMap = new Map<string, string>();

for (const name of canonicalIngredients) {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (!canonicalLowerMap.has(lower) || trimmed[0] === trimmed[0].toUpperCase()) {
    canonicalLowerMap.set(lower, trimmed);
  }
}

/**
 * Standard cosmetic chemical acronyms that should be kept uppercase.
 */
const UPPERCASE_ACRONYMS = new Set([
  'EDTA', 'DMDM', 'PEG', 'PPG', 'PCA', 'BHT', 'BHA', 'SLS', 'SLES', 
  'TEA', 'DEA', 'MEHA', 'INCI', 'UV', 'UVA', 'UVB', 'SPF', 'CI'
]);

/**
 * Formats cosmetic ingredient names with clean INCI Title Casing.
 * Preserves chemical acronyms (e.g., "Disodium EDTA", "PEG-40", "1,2-Hexanediol").
 */
export function formatIngredientCasing(name: string): string {
  if (!name) return '';
  
  return name
    .split(/(\s+|[-/()])/)
    .map((token) => {
      if (!token || /^(\s+|[-/()])$/.test(token)) return token;
      
      const upper = token.toUpperCase();
      if (UPPERCASE_ACRONYMS.has(upper)) return upper;
      
      // Preserve numbered prefixes like 1,2- or 3-O-
      if (/^\d/.test(token)) return token;

      // Title case
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Common OCR character confusion matrix for blurry/distorted fonts.
 */
export function normalizeOcrConfusions(text: string): string {
  return text
    .replace(/[|!]/g, 'l')
    .replace(/\b0([a-z])/gi, 'o$1')
    .replace(/([a-z])0\b/gi, '$1o')
    .replace(/([a-z])0([a-z])/gi, '$1o$2')
    .replace(/rn/g, 'm')
    .replace(/cl/g, 'd')
    .replace(/vv/g, 'w')
    .replace(/([a-z])1([a-z])/gi, '$1l$2');
}

/**
 * Calculates Levenshtein distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // deletion
        dp[i][j - 1] + 1,       // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Computes string similarity score between 0.0 and 1.0.
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Substring containment for long chemical names
  if (s1.length > 5 && s2.includes(s1)) return 0.95;
  if (s2.length > 5 && s1.includes(s2)) return 0.95;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

/**
 * Matches a candidate word or phrase against the master 3,456 cosmetic ingredients dictionary.
 */
export function findBestIngredientMatch(rawCandidate: string): {
  matchedName: string;
  similarity: number;
  exact: boolean;
} {
  let clean = rawCandidate.trim().replace(/^[\W_]+|[\W_]+$/g, '');
  // Strip trailing percentages (e.g. "10%", "2.5%")
  clean = clean.replace(/\s+\d+(\.\d+)?%\s*$/, '');

  if (clean.length < 2) {
    return { matchedName: clean, similarity: 0, exact: false };
  }

  const lower = clean.toLowerCase();

  // 1. Direct dictionary match
  if (canonicalLowerMap.has(lower)) {
    return {
      matchedName: formatIngredientCasing(canonicalLowerMap.get(lower)!),
      similarity: 1.0,
      exact: true,
    };
  }

  // 2. Parenthetical translation handling e.g. "Aqua (Water)" or "Tocopheryl Acetate (Vitamin E)"
  const parenMatch = clean.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const basePart = parenMatch[1].trim().toLowerCase();
    const subPart = parenMatch[2].trim().toLowerCase();
    if (canonicalLowerMap.has(basePart)) {
      return {
        matchedName: formatIngredientCasing(canonicalLowerMap.get(basePart)!),
        similarity: 0.98,
        exact: true,
      };
    }
    if (canonicalLowerMap.has(subPart)) {
      return {
        matchedName: formatIngredientCasing(canonicalLowerMap.get(subPart)!),
        similarity: 0.98,
        exact: true,
      };
    }
  }

  // 3. Slash translation handling e.g. "Water / Eau" or "Parfum / Fragrance"
  if (clean.includes('/')) {
    const parts = clean.split('/').map(p => p.trim().toLowerCase());
    for (const p of parts) {
      if (canonicalLowerMap.has(p)) {
        return {
          matchedName: formatIngredientCasing(canonicalLowerMap.get(p)!),
          similarity: 0.98,
          exact: true,
        };
      }
    }
  }

  // 4. Normalized OCR confusions match (e.g. "G1ycerin" -> "Glycerin", "Phenoxyethano1" -> "Phenoxyethanol")
  const deblurred = normalizeOcrConfusions(lower);
  if (canonicalLowerMap.has(deblurred)) {
    return {
      matchedName: formatIngredientCasing(canonicalLowerMap.get(deblurred)!),
      similarity: 0.98,
      exact: false,
    };
  }

  // 5. Fuzzy search through candidate dictionary with length bounding
  let bestMatch = clean;
  let bestScore = 0;

  const cleanLen = clean.length;
  for (const canonical of canonicalIngredients) {
    // Only compare strings with length difference <= 4
    if (Math.abs(canonical.length - cleanLen) > 4) continue;

    const score = calculateSimilarity(clean, canonical);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = canonical;
      if (bestScore === 1.0) break;
    }
  }

  return {
    matchedName: formatIngredientCasing(bestMatch),
    similarity: bestScore,
    exact: bestScore >= 0.98,
  };
}

/**
 * Tokenizes a commaless or messy stream of words using a dictionary-driven sliding window (N-grams).
 * Handles images where OCR completely omitted commas between ingredients.
 */
function tokenizeByDictionaryNgrams(text: string): { original: string; matched: string; confidence: number }[] {
  const words = text
    .split(/[\s,;•·/|\n]+/)
    .map(w => w.trim().replace(/^[\W_]+|[\W_]+$/g, ''))
    .filter(w => w.length > 1 && !/^[0-9\W]+$/.test(w));

  const results: { original: string; matched: string; confidence: number }[] = [];
  const seen = new Set<string>();
  let i = 0;

  while (i < words.length) {
    let bestMatch: { name: string; score: number } | null = null;
    let bestLen = 0;

    // Check 4-word, 3-word, 2-word, then 1-word phrases
    for (let len = Math.min(4, words.length - i); len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(' ');
      const match = findBestIngredientMatch(phrase);
      if (match.similarity >= 0.82) {
        if (!bestMatch || match.similarity > bestMatch.score) {
          bestMatch = { name: match.matchedName, score: match.similarity };
          bestLen = len;
          if (match.similarity >= 0.98) break;
        }
      }
    }

    if (bestMatch && bestMatch.score >= 0.82) {
      const originalPhrase = words.slice(i, i + bestLen).join(' ');
      const key = bestMatch.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          original: originalPhrase,
          matched: bestMatch.name,
          confidence: Math.round(bestMatch.score * 100) / 100,
        });
      }
      i += bestLen;
    } else {
      i++;
    }
  }

  return results;
}

/**
 * Cleans and extracts ingredient entries from raw OCR text.
 * Employs a hybrid strategy: comma-delimiter parsing + dictionary-driven N-gram segmentation
 * to guarantee complete ingredient extraction even from blurry, commaless packaging shots.
 */
export function parseAndCorrectIngredients(rawOcrText: string): {
  extractedItems: OCRItem[];
  cleanedText: string;
  overallConfidence: number;
} {
  if (!rawOcrText || !rawOcrText.trim()) {
    return {
      extractedItems: [],
      cleanedText: '',
      overallConfidence: 0,
    };
  }

  let text = rawOcrText;

  // 1. Isolate ingredients section if explicit header exists
  const headerMatch = text.match(
    /(?:INGREDIENTS?|COMPOSITION|CONTAINS|ACTIVE\s+INGREDIENTS?|INACTIVE\s+INGREDIENTS?|MAY\s+CONTAIN)\s*[:：\-]\s*([\s\S]*)/i
  );
  if (headerMatch && headerMatch[1].trim().length > 10) {
    text = headerMatch[1];
  }

  // Remove common non-ingredient trailing sections (e.g. Directions, Warnings, Batch, Made in)
  const cutoffMatch = text.match(
    /(?:DIRECTIONS|HOW\s+TO\s+USE|WARNING|CAUTION|DISTRIBUTED\s+BY|MANUFACTURED\s+FOR|NET\s+WT|BATCH|EXP|LOT|MADE\s+IN)\b[\s\S]*/i
  );
  if (cutoffMatch && cutoffMatch.index && cutoffMatch.index > 20) {
    text = text.substring(0, cutoffMatch.index);
  }

  // Protect chemical commas like "1,2-Hexanediol"
  text = text.replace(/(\d)\s*,\s*(\d)-/g, (_m, a, b) => `${a}__COMMA__${b}-`);

  // Count commas in the body
  const commaCount = (text.match(/,/g) || []).length;

  const items: OCRItem[] = [];
  const seenKeys = new Set<string>();

  // If text has very few commas (< 3) but many words, use Dictionary N-gram Tokenizer
  if (commaCount < 3) {
    const ngramTokens = tokenizeByDictionaryNgrams(text);
    if (ngramTokens.length > 0) {
      ngramTokens.forEach((tok, idx) => {
        seenKeys.add(tok.matched.toLowerCase());
        items.push({
          id: `item_ng_${idx}_${Date.now()}`,
          originalText: tok.original,
          suggestedName: tok.matched,
          confidence: tok.confidence,
          isSuspectedError: tok.original.toLowerCase() !== tok.matched.toLowerCase(),
          userCorrection: undefined,
        });
      });

      const avgConf =
        items.length > 0
          ? items.reduce((acc, i) => acc + i.confidence, 0) / items.length
          : 0.85;

      return {
        extractedItems: items,
        cleanedText: text.replace(/__COMMA__/g, ','),
        overallConfidence: Math.round(avgConf * 100) / 100,
      };
    }
  }

  // 2. Standard Delimiter-Based Parsing with Sub-segment N-gram Fallback
  let normalized = text
    .replace(/[\u2022\u00B7\u25AA\u25FE*•|]/g, ', ') // bullets
    .replace(/;\s*/g, ', ')
    .replace(/\r?\n+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const rawParts = normalized.split(',').map((p) => p.trim()).filter(Boolean);

  let idxCounter = 0;

  for (let rawPart of rawParts) {
    const part = rawPart
      .replace(/__COMMA__/g, ',')
      .replace(/^[0-9]+\.\s+/, '') // Remove leading numbered list (e.g. 1. Aqua)
      .replace(/[.]+$/, '')        // Remove trailing dots
      .trim();

    // Ignore tiny fragments or noise tokens
    if (part.length < 2 || /^[0-9\W]+$/.test(part)) {
      continue;
    }

    // Ignore disclaimer fragments
    if (/^(may contain|warning|caution|for external use|keep out|batch|lot|made in|dermatologist)/i.test(part)) {
      continue;
    }

    // Direct match attempt
    const match = findBestIngredientMatch(part);

    // If part matched well, add directly
    if (match.similarity >= 0.82) {
      const key = match.matchedName.toLowerCase();
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        items.push({
          id: `item_${idxCounter++}_${Date.now()}`,
          originalText: part,
          suggestedName: match.matchedName,
          confidence: Math.round(match.similarity * 100) / 100,
          isSuspectedError: part.toLowerCase() !== match.matchedName.toLowerCase(),
          userCorrection: undefined,
        });
      }
      continue;
    }

    // If segment contains multiple words without commas (e.g. "Aqua Glycerin Niacinamide")
    const wordsInPart = part.split(/\s+/).filter(w => w.length > 1);
    if (wordsInPart.length >= 2) {
      const subTokens = tokenizeByDictionaryNgrams(part);
      if (subTokens.length > 0) {
        subTokens.forEach((tok) => {
          const key = tok.matched.toLowerCase();
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            items.push({
              id: `item_${idxCounter++}_${Date.now()}`,
              originalText: tok.original,
              suggestedName: tok.matched,
              confidence: tok.confidence,
              isSuspectedError: tok.original.toLowerCase() !== tok.matched.toLowerCase(),
              userCorrection: undefined,
            });
          }
        });
        continue;
      }
    }

    // Unmatched item: capitalize and add with lower confidence
    const key = part.toLowerCase();
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      items.push({
        id: `item_${idxCounter++}_${Date.now()}`,
        originalText: part,
        suggestedName: formatIngredientCasing(part),
        confidence: 0.72,
        isSuspectedError: true,
        userCorrection: undefined,
      });
    }
  }

  const overallConfidence =
    items.length > 0
      ? items.reduce((acc, i) => acc + i.confidence, 0) / items.length
      : 0.85;

  return {
    extractedItems: items,
    cleanedText: normalized.replace(/__COMMA__/g, ','),
    overallConfidence: Math.round(overallConfidence * 100) / 100,
  };
}
