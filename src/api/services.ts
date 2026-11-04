import { request, requestBlob, delay } from './apiClient';
import { recognizeIngredientsFromImage } from '../utils/ocrEngine';
import { parseAndCorrectIngredients } from '../utils/ingredientMatcher';
import {
  initialMockUser,
  initialMasterIngredients,
  initialMasterAllergens,
  initialMasterHazards,
  initialAlternatives,
  sampleScans,
  sampleSafetyReport,
  initialNotifications,
  initialAdminStats,
  initialAuditLogs,
  initialDatasetImports,
} from './mockData';
import {
  User,
  UserRole,
  UserProfile,
  Scan,
  OCRResult,
  SafetyReport,
  AlternativeProduct,
  NotificationItem,
  MasterIngredient,
  MasterAllergen,
  MasterHazard,
  AdminStats,
  AuditLog,
  DatasetImport,
  IngredientAnalysis,
} from '../types';

// Storage Key Helpers for Mock Persistence
const STORAGE_KEYS = {
  USER: 'labelcheck_user',
  SCANS: 'labelcheck_scans',
  REPORTS: 'labelcheck_reports',
  SAVED: 'labelcheck_saved',
  NOTIFS: 'labelcheck_notifications',
  INGREDIENTS: 'labelcheck_master_ingredients',
  ALLERGENS: 'labelcheck_master_allergens',
  HAZARDS: 'labelcheck_master_hazards',
  ALTERNATIVES: 'labelcheck_master_alternatives',
  LOGS: 'labelcheck_audit_logs',
  DATASETS: 'labelcheck_datasets',
};

const USER_SCOPED_KEYS = new Set([
  STORAGE_KEYS.USER,
  STORAGE_KEYS.SCANS,
  STORAGE_KEYS.REPORTS,
  STORAGE_KEYS.SAVED,
  STORAGE_KEYS.NOTIFS,
]);

const USER_DATA_KEYS = new Set([
  STORAGE_KEYS.SCANS,
  STORAGE_KEYS.REPORTS,
  STORAGE_KEYS.SAVED,
  STORAGE_KEYS.NOTIFS,
]);

function getStorageKey(key: string): string {
  const userId = localStorage.getItem('labelcheck_user_id');
  return userId && USER_SCOPED_KEYS.has(key) ? `${key}:${userId}` : key;
}

function getStorage<T>(key: string, fallback: T): T {
  try {
    const userId = localStorage.getItem('labelcheck_user_id');
    const data = localStorage.getItem(getStorageKey(key));
    if (data) return JSON.parse(data);
    if (userId && userId !== initialMockUser.id && USER_DATA_KEYS.has(key) && Array.isArray(fallback)) {
      return [] as T;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

// -------------------------------------------------------------
// AUTH & USER SERVICES
// -------------------------------------------------------------
export const authApi = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  },

  async register(data: { fullName: string; email: string; password: string }): Promise<{ token: string; user: User }> {
    return request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }),
    });
  },

  async getCurrentUser(): Promise<User> {
    return request<User>('/auth/me');
  },

  async logout(token?: string | null): Promise<void> {
    if (!token) return;
    try {
      await request<{ success: boolean }>('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Ignore network errors during logout
    }
  },
};

// -------------------------------------------------------------
// PROFILE SERVICE
// -------------------------------------------------------------
export const profileApi = {
  async updateAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);
    return request<User>('/profile/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  async getAvatar(avatarUrl: string, signal?: AbortSignal): Promise<Blob> {
    return requestBlob(avatarUrl.replace(/^\/api/, ''), { signal });
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<User> {
    try {
      return await request<User>('/profile', {
        method: 'PUT',
        body: JSON.stringify(profile),
      });
    } catch {
      await delay(400);
      const user = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
      const updatedUser: User = {
        ...user,
        profile: {
          ...user.profile,
          ...profile,
        },
      };
      setStorage(STORAGE_KEYS.USER, updatedUser);
      return updatedUser;
    }
  },

  async updatePassword(data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean }> {
    return request<{ success: boolean }>('/profile/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAccount(): Promise<{ success: boolean }> {
    const res = await request<{ success: boolean }>('/profile', {
      method: 'DELETE',
    });
    localStorage.clear();
    return res;
  },
};

// -------------------------------------------------------------
// SCAN & OCR SERVICES
// -------------------------------------------------------------
export const scanApi = {
  async uploadScanImage(file: File): Promise<{ scanId: string; imageUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      return await request<{ scanId: string; imageUrl: string }>('/scan/upload', {
        method: 'POST',
        body: formData,
      });
    } catch {
      await delay(1000);
      const tempId = `scan_${Date.now()}`;
      const imageUrl = URL.createObjectURL(file);
      return { scanId: tempId, imageUrl };
    }
  },

  async performOCR(
    scanId: string,
    input?: string | { file?: File | Blob | null; manualText?: string; onProgress?: (msg: string, pct: number) => void }
  ): Promise<OCRResult> {
    let file: File | Blob | null | undefined = undefined;
    let manualText: string | undefined = undefined;
    let onProgress: ((msg: string, pct: number) => void) | undefined = undefined;

    if (typeof input === 'string') {
      manualText = input;
    } else if (input && typeof input === 'object') {
      file = input.file;
      manualText = input.manualText;
      onProgress = input.onProgress;
    }

    // 1. If an image was captured from camera or uploaded, execute the client-side Deblurring + Tesseract OCR engine
    if (file) {
      try {
        const ocrResult = await recognizeIngredientsFromImage(file, { scanId, onProgress });
        if (ocrResult.extractedItems && ocrResult.extractedItems.length > 0) {
          // Sync with backend scan session in background
          request<OCRResult>(`/scan/${scanId}/ocr`, {
            method: 'POST',
            body: JSON.stringify({
              rawText: ocrResult.rawText,
              extractedItems: ocrResult.extractedItems,
              overallConfidence: ocrResult.overallConfidence,
            }),
          }).catch(() => {});
          return ocrResult;
        }
      } catch (err) {
        console.warn('Client OCR encountered error, attempting backend vision fallback:', err);
      }
    }

    // 2. If manual text was entered, clean, parse, and fuzzy-match against canonical ingredients dictionary
    if (manualText && manualText.trim()) {
      const parsed = parseAndCorrectIngredients(manualText);
      const res: OCRResult = {
        scanId,
        rawText: manualText,
        overallConfidence: parsed.overallConfidence,
        extractedItems: parsed.extractedItems,
      };
      request<OCRResult>(`/scan/${scanId}/ocr`, {
        method: 'POST',
        body: JSON.stringify({ manualText, extractedItems: parsed.extractedItems }),
      }).catch(() => {});
      return res;
    }

    // 3. Fallback to backend OCR
    try {
      return await request<OCRResult>(`/scan/${scanId}/ocr`, {
        method: 'POST',
        body: JSON.stringify({ manualText }),
      });
    } catch {
      await delay(800);
      return {
        scanId,
        rawText: 'No readable text detected.',
        overallConfidence: 0.85,
        extractedItems: [],
      };
    }
  },

  async generateSafetyReport(
    scanId: string,
    confirmedIngredients: string[],
    productName: string = 'Scanned Product',
    category: string = 'Cosmetic'
  ): Promise<SafetyReport> {
    const user = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
    const userProfile = user?.profile;

    try {
      const backendReport = await request<SafetyReport>(`/scan/${scanId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          ingredients: confirmedIngredients,
          productName,
          category,
          userProfile: {
            allergies: userProfile?.allergies || [],
            avoidIngredients: userProfile?.avoidIngredients || [],
            skinSensitivities: userProfile?.skinSensitivities || [],
            fragranceSensitivity: !!userProfile?.fragranceSensitivity,
            skinType: userProfile?.skinType || 'normal',
          },
        }),
      });

      // Ensure report has valid IDs
      const finalReport: SafetyReport = {
        ...backendReport,
        id: backendReport.id || `rep_${scanId}`,
        scanId: backendReport.scanId || scanId,
        productName: backendReport.productName || productName,
        category: backendReport.category || category,
      };

      // Cache report in sessionStorage for fast direct access
      sessionStorage.setItem(`labelcheck_report_${finalReport.id}`, JSON.stringify(finalReport));
      sessionStorage.setItem(`labelcheck_report_${finalReport.scanId}`, JSON.stringify(finalReport));
      sessionStorage.setItem(`labelcheck_report_${scanId}`, JSON.stringify(finalReport));

      // Persist in localStorage so it survives page reloads
      const existingReports = getStorage<SafetyReport[]>(STORAGE_KEYS.REPORTS, []);
      const filteredReports = existingReports.filter(r => r.id !== finalReport.id && r.scanId !== finalReport.scanId);
      setStorage(STORAGE_KEYS.REPORTS, [finalReport, ...filteredReports]);

      const user = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
      const newScan: Scan = {
        id: finalReport.scanId || scanId,
        userId: user.id,
        productName: finalReport.productName,
        brand: finalReport.brand,
        category: finalReport.category,
        imageUrl: finalReport.imageUrl,
        scanDate: finalReport.scanDate,
        score: finalReport.score,
        riskLabel: finalReport.riskLabel,
        allergensCount: finalReport.summaryCounts?.allergens ?? 0,
        hazardsCount: finalReport.summaryCounts?.hazards ?? 0,
        status: 'completed',
        reportId: finalReport.id,
      };

      const existingScans = getStorage<Scan[]>(STORAGE_KEYS.SCANS, []);
      const filteredScans = existingScans.filter(s => s.id !== newScan.id);
      setStorage(STORAGE_KEYS.SCANS, [newScan, ...filteredScans]);

      return finalReport;
    } catch {
      await delay(1500);

      const user = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
      const userAllergies = user.profile?.allergies || [];
      const userAvoids = user.profile?.avoidIngredients || [];

      let allergensCount = 0;
      let hazardsCount = 0;
      let irritantsCount = 0;
      let unknownCount = 0;
      let reviewCount = 0;

      const analyzedIngredients: IngredientAnalysis[] = confirmedIngredients.map((name, idx) => {
        const lowerName = name.toLowerCase();
        let riskLevel: 'low' | 'moderate' | 'high' | 'hazardous' | 'unknown' = 'low';
        let isAllergen = false;
        let isIrritant = false;
        let isHazardous = false;
        let whyFlagged: string | undefined = undefined;
        let hazardDetails: string | undefined = undefined;
        let allergenDetails: string | undefined = undefined;
        let irritantDetails: string | undefined = undefined;

        const isUserAllergen = userAllergies.some(a => lowerName.includes(a.toLowerCase()) || a.toLowerCase().includes(lowerName));
        const isUserAvoid = userAvoids.some(a => lowerName.includes(a.toLowerCase()) || a.toLowerCase().includes(lowerName));

        if (lowerName.includes('dmdm') || lowerName.includes('formaldehyde')) {
          riskLevel = 'hazardous';
          isHazardous = true;
          isAllergen = true;
          isIrritant = true;
          hazardsCount++;
          allergensCount++;
          hazardDetails = 'Formaldehyde releasing preservative linked to cellular toxicity.';
          whyFlagged = 'Potentially Hazardous Formaldehyde Releaser';
        } else if (lowerName.includes('fragrance') || lowerName.includes('parfum')) {
          riskLevel = 'high';
          isAllergen = true;
          isIrritant = true;
          allergensCount++;
          allergenDetails = 'Common contact allergen fragrance blend.';
          whyFlagged = 'Matches Allergy Profile: Fragrance / Parfums';
        } else if (lowerName.includes('sulfate') || lowerName.includes('sls')) {
          riskLevel = 'moderate';
          isIrritant = true;
          irritantsCount++;
          irritantDetails = 'Harsh detergent agent known to dry skin.';
          whyFlagged = 'Matches Avoid List: Sodium Lauryl Sulfate';
        } else if (lowerName.includes('paraben')) {
          riskLevel = 'moderate';
          isHazardous = true;
          isIrritant = true;
          hazardsCount++;
          hazardDetails = 'Synthetic preservative associated with weak hormonal activity.';
          whyFlagged = 'Matches Avoid List: Parabens';
        } else if (lowerName.includes('unknown') || lowerName.includes('402x')) {
          riskLevel = 'unknown';
          unknownCount++;
          reviewCount++;
          whyFlagged = 'Unrecognized OCR sequence. Manual review suggested.';
        }

        return {
          id: `ing_an_${idx}`,
          rawName: name,
          matchedName: name,
          category: riskLevel === 'hazardous' ? 'Formaldehyde Releaser' : riskLevel === 'high' ? 'Fragrance' : 'General',
          riskLevel,
          isAllergen,
          isIrritant,
          isHazardous,
          hazardDetails,
          allergenDetails,
          irritantDetails,
          confidence: riskLevel === 'unknown' ? 0.6 : 0.95,
          personalizedMatch: isUserAllergen || isUserAvoid,
          userAvoidMatch: isUserAvoid,
          whyFlagged,
          datasetReference: 'CosIng & EWG Hazard Registry 2026',
        };
      });

      // Calculate score based on findings
      let calculatedScore = 100 - (hazardsCount * 25) - (allergensCount * 15) - (irritantsCount * 10);
      calculatedScore = Math.max(15, Math.min(99, calculatedScore));

      let riskLabel: SafetyReport['riskLabel'] = 'Lower Detected Risk';
      if (calculatedScore < 30) riskLabel = 'Significant Detected Concerns';
      else if (calculatedScore < 60) riskLabel = 'Higher Detected Risk';
      else if (calculatedScore < 80) riskLabel = 'Moderate Detected Risk';

      const report: SafetyReport = {
        id: `rep_${scanId}`,
        scanId,
        productName: productName || 'Analyzed Packaged Label',
        brand: 'Scanned Brand',
        category: category || 'Personal Care',
        imageUrl: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?auto=format&fit=crop&w=600&q=80',
        scanDate: new Date().toISOString(),
        score: calculatedScore,
        riskLabel,
        riskExplanation: `Analysis detected ${allergensCount} allergens, ${irritantsCount} skin irritants, and ${hazardsCount} chemical concerns based on your saved sensitivities.`,
        summaryCounts: {
          total: confirmedIngredients.length,
          allergens: allergensCount,
          irritants: irritantsCount,
          hazards: hazardsCount,
          reviewNeeded: reviewCount,
          unknown: unknownCount,
        },
        personalizedWarnings: analyzedIngredients
          .filter(i => i.personalizedMatch)
          .map(i => `${i.rawName}: ${i.whyFlagged}`),
        ingredients: analyzedIngredients,
        saferAlternatives: initialAlternatives,
        isFavorite: false,
      };

      // Persist report and scan in history and session
      sessionStorage.setItem(`labelcheck_report_${report.id}`, JSON.stringify(report));
      sessionStorage.setItem(`labelcheck_report_${report.scanId}`, JSON.stringify(report));
      sessionStorage.setItem(`labelcheck_report_${scanId}`, JSON.stringify(report));

      const existingReports = getStorage<SafetyReport[]>(STORAGE_KEYS.REPORTS, [sampleSafetyReport]);
      setStorage(STORAGE_KEYS.REPORTS, [report, ...existingReports]);

      const newScan: Scan = {
        id: scanId,
        userId: user.id,
        productName: report.productName,
        brand: report.brand,
        category: report.category,
        imageUrl: report.imageUrl,
        scanDate: report.scanDate,
        score: report.score,
        riskLabel: report.riskLabel,
        allergensCount: report.summaryCounts.allergens,
        hazardsCount: report.summaryCounts.hazards,
        status: 'completed',
        reportId: report.id,
      };

      const existingScans = getStorage<Scan[]>(STORAGE_KEYS.SCANS, sampleScans);
      setStorage(STORAGE_KEYS.SCANS, [newScan, ...existingScans]);

      return report;
    }
  },

  async getReport(reportId: string): Promise<SafetyReport> {
    const cleanId = reportId.replace(/^rep_/, '');

    // 1. Check sessionStorage for instant fast retrieval
    for (const key of [`labelcheck_report_${reportId}`, `labelcheck_report_${cleanId}`, `labelcheck_report_rep_${cleanId}`]) {
      const cached = sessionStorage.getItem(key);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }

    // 2. Fetch from backend API
    try {
      let res: SafetyReport | null = null;
      try {
        res = await request<SafetyReport>(`/reports/${reportId}`);
      } catch {
        if (cleanId !== reportId) {
          res = await request<SafetyReport>(`/reports/${cleanId}`);
        }
      }

      if (res) {
        sessionStorage.setItem(`labelcheck_report_${res.id}`, JSON.stringify(res));
        sessionStorage.setItem(`labelcheck_report_${res.scanId}`, JSON.stringify(res));
        const reports = getStorage<SafetyReport[]>(STORAGE_KEYS.REPORTS, []);
        const filtered = reports.filter(r => r.id !== res!.id && r.scanId !== res!.scanId);
        setStorage(STORAGE_KEYS.REPORTS, [res, ...filtered]);
        return res;
      }
    } catch {
      // Backend request failed or report not found on backend, proceed to fallback
    }

    // 3. Fallback to localStorage
    const reports = getStorage<SafetyReport[]>(STORAGE_KEYS.REPORTS, [sampleSafetyReport]);
    const found = reports.find(
      r => r.id === reportId || r.scanId === reportId || r.id === cleanId || r.scanId === cleanId || r.id === `rep_${cleanId}`
    );
    if (found) {
      sessionStorage.setItem(`labelcheck_report_${reportId}`, JSON.stringify(found));
      return found;
    }

    // 4. Fallback: Check if OCR review session was saved for this scanId, and auto-generate report
    const ocrStored = sessionStorage.getItem(`labelcheck_ocr_${cleanId}`);
    if (ocrStored) {
      try {
        const parsed = JSON.parse(ocrStored);
        const ingredientNames = (parsed.ocrResult?.extractedItems || []).map((i: any) => i.suggestedName || i.originalText);
        if (ingredientNames.length > 0) {
          return await scanApi.generateSafetyReport(cleanId, ingredientNames, parsed.productName, parsed.category);
        }
      } catch {}
    }

    throw new Error(`Report not found for identifier ${reportId}`);
  },
};

// -------------------------------------------------------------
// HISTORY & SAVED PRODUCTS
// -------------------------------------------------------------
export const historyApi = {
  async getScans(): Promise<Scan[]> {
    try {
      const rawScans = await request<any[]>('/scans');
      const normalized = (rawScans || []).map((s: any) => ({
        id: s.id,
        userId: s.userId || '',
        productName: s.productName || 'Scanned Product',
        brand: s.brand || 'Scanned Brand',
        category: s.category || 'Personal Care',
        imageUrl: s.imageUrl || '',
        scanDate: s.scanDate || new Date().toISOString(),
        score: typeof s.score === 'number' ? s.score : 80,
        riskLabel: s.riskLabel || (s.score >= 80 ? 'Lower Detected Risk' : 'Moderate Detected Risk'),
        allergensCount: s.allergensCount ?? s.summaryCounts?.allergens ?? 0,
        hazardsCount: s.hazardsCount ?? s.summaryCounts?.hazards ?? 0,
        status: s.status || 'completed',
        reportId: s.reportId || s.id,
      }));

      // Cache normalized scans locally
      if (normalized.length > 0) {
        const existing = getStorage<Scan[]>(STORAGE_KEYS.SCANS, []);
        const map = new Map<string, Scan>();
        for (const scan of [...normalized, ...existing]) {
          if (!map.has(scan.id)) map.set(scan.id, scan);
        }
        setStorage(STORAGE_KEYS.SCANS, Array.from(map.values()));
      }

      return normalized;
    } catch {
      await delay(300);
      return getStorage<Scan[]>(STORAGE_KEYS.SCANS, sampleScans);
    }
  },

  async deleteScan(scanId: string): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/scans/${scanId}`, { method: 'DELETE' });
    } catch {
      await delay(300);
      const scans = getStorage<Scan[]>(STORAGE_KEYS.SCANS, sampleScans);
      setStorage(STORAGE_KEYS.SCANS, scans.filter(s => s.id !== scanId));
      return { success: true };
    }
  },
};

export const savedApi = {
  async getSavedProducts(): Promise<SafetyReport[]> {
    try {
      return await request<SafetyReport[]>('/saved');
    } catch {
      await delay(300);
      return getStorage<SafetyReport[]>(STORAGE_KEYS.SAVED, [sampleSafetyReport]);
    }
  },

  async toggleSaveProduct(report: SafetyReport): Promise<{ saved: boolean }> {
    try {
      return await request<{ saved: boolean }>(`/saved/${report.id}`, { method: 'POST' });
    } catch {
      await delay(200);
      const saved = getStorage<SafetyReport[]>(STORAGE_KEYS.SAVED, [sampleSafetyReport]);
      const isExisting = saved.some(s => s.id === report.id);
      if (isExisting) {
        setStorage(STORAGE_KEYS.SAVED, saved.filter(s => s.id !== report.id));
        return { saved: false };
      } else {
        setStorage(STORAGE_KEYS.SAVED, [...saved, { ...report, isFavorite: true }]);
        return { saved: true };
      }
    }
  },
};

// -------------------------------------------------------------
// NOTIFICATION SERVICES
// -------------------------------------------------------------
export const notificationApi = {
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      return await request<NotificationItem[]>('/notifications');
    } catch {
      await delay(200);
      return getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFS, initialNotifications);
    }
  },

  async markAsRead(id: string): Promise<void> {
    try {
      await request(`/notifications/${id}/read`, { method: 'PUT' });
    } catch {
      const notifs = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFS, initialNotifications);
      setStorage(STORAGE_KEYS.NOTIFS, notifs.map(n => n.id === id ? { ...n, read: true } : n));
    }
  },

  async deleteNotification(id: string): Promise<void> {
    try {
      await request(`/notifications/${id}`, { method: 'DELETE' });
    } catch {
      const notifs = getStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFS, initialNotifications);
      setStorage(STORAGE_KEYS.NOTIFS, notifs.filter(n => n.id !== id));
    }
  },
};

// -------------------------------------------------------------
// ADMIN SERVICES
// -------------------------------------------------------------
export const adminApi = {
  async getStats(): Promise<AdminStats> {
    try {
      return await request<AdminStats>('/admin/stats');
    } catch {
      await delay(300);
      return initialAdminStats;
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      return await request<User[]>('/admin/users');
    } catch {
      await delay(300);
      const mockUser = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
      return [
        mockUser,
        {
          id: 'user_102',
          fullName: 'Dr. Elena Vance',
          email: 'elena.vance@labelcheck.org',
          role: 'admin',
          createdAt: '2025-11-01T10:00:00Z',
          profile: { ...initialMockUser.profile, isOnboardingCompleted: true },
        },
        {
          id: 'user_103',
          fullName: 'Samantha Reed',
          email: 'samantha.reed@example.com',
          role: 'user',
          createdAt: '2026-02-14T15:30:00Z',
          profile: { ...initialMockUser.profile, isOnboardingCompleted: true },
        },
      ];
    }
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    try {
      return await request<User>(`/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
    } catch {
      await delay(300);
      const mockUser = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
      return { ...mockUser, id: userId, role };
    }
  },

  async getMasterIngredients(): Promise<MasterIngredient[]> {
    try {
      return await request<MasterIngredient[]>('/admin/ingredients');
    } catch {
      await delay(300);
      return getStorage<MasterIngredient[]>(STORAGE_KEYS.INGREDIENTS, initialMasterIngredients);
    }
  },

  async saveMasterIngredient(ing: Partial<MasterIngredient>): Promise<MasterIngredient> {
    try {
      return await request<MasterIngredient>('/admin/ingredients', { method: 'POST', body: JSON.stringify(ing) });
    } catch {
      await delay(400);
      const existing = getStorage<MasterIngredient[]>(STORAGE_KEYS.INGREDIENTS, initialMasterIngredients);
      const updatedItem: MasterIngredient = {
        id: ing.id || `ing_${Date.now()}`,
        name: ing.name || 'New Ingredient',
        casNumber: ing.casNumber || 'N/A',
        category: ing.category || 'General',
        riskLevel: ing.riskLevel || 'low',
        description: ing.description || 'Description pending.',
        isAllergen: !!ing.isAllergen,
        isIrritant: !!ing.isIrritant,
        isHazardous: !!ing.isHazardous,
        ewgScore: ing.ewgScore || 1,
        synonyms: ing.synonyms || [],
        updatedAt: new Date().toISOString(),
      };
      const filtered = existing.filter(i => i.id !== updatedItem.id);
      setStorage(STORAGE_KEYS.INGREDIENTS, [updatedItem, ...filtered]);
      return updatedItem;
    }
  },

  async deleteMasterIngredient(id: string): Promise<{ success: boolean }> {
    try {
      return await request<{ success: boolean }>(`/admin/ingredients/${id}`, { method: 'DELETE' });
    } catch {
      await delay(300);
      const existing = getStorage<MasterIngredient[]>(STORAGE_KEYS.INGREDIENTS, initialMasterIngredients);
      setStorage(STORAGE_KEYS.INGREDIENTS, existing.filter(i => i.id !== id));
      return { success: true };
    }
  },

  async getMasterAllergens(): Promise<MasterAllergen[]> {
    try {
      return await request<MasterAllergen[]>('/admin/allergens');
    } catch {
      await delay(200);
      return getStorage<MasterAllergen[]>(STORAGE_KEYS.ALLERGENS, initialMasterAllergens);
    }
  },

  async getMasterHazards(): Promise<MasterHazard[]> {
    try {
      return await request<MasterHazard[]>('/admin/hazards');
    } catch {
      await delay(200);
      return getStorage<MasterHazard[]>(STORAGE_KEYS.HAZARDS, initialMasterHazards);
    }
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      return await request<AuditLog[]>('/admin/audit-logs');
    } catch {
      await delay(200);
      return getStorage<AuditLog[]>(STORAGE_KEYS.LOGS, initialAuditLogs);
    }
  },

  async getDatasets(): Promise<DatasetImport[]> {
    try {
      return await request<DatasetImport[]>('/admin/datasets');
    } catch {
      await delay(200);
      return getStorage<DatasetImport[]>(STORAGE_KEYS.DATASETS, initialDatasetImports);
    }
  },

  async importDataset(filename: string, recordCount: number): Promise<DatasetImport> {
    await delay(1200);
    const newDs: DatasetImport = {
      id: `ds_${Date.now()}`,
      filename,
      recordCount,
      status: 'completed',
      importedAt: new Date().toISOString(),
    };
    const datasets = getStorage<DatasetImport[]>(STORAGE_KEYS.DATASETS, initialDatasetImports);
    setStorage(STORAGE_KEYS.DATASETS, [newDs, ...datasets]);
    return newDs;
  }
};