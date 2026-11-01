import { request, requestBlob, delay } from './apiClient';
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

  async performOCR(scanId: string, manualText?: string): Promise<OCRResult> {
    try {
      return await request<OCRResult>(`/scan/${scanId}/ocr`, {
        method: 'POST',
        body: JSON.stringify({ manualText }),
      });
    } catch {
      await delay(1200);
      const textToParse = manualText || 
        'Aqua, Glycerin, Parfum / Fragrance, Sodium Lauryl Sulfate, DMDM Hydantoin, Methylparaben, Tocopheryl Acetate, Botanical Ext 402X';

      const ingredientsList = textToParse.split(',').map((item) => item.trim()).filter(Boolean);

      const items = ingredientsList.map((ing, idx) => {
        const isError = ing.toLowerCase().includes('402x') || ing.toLowerCase().includes('parfum');
        return {
          id: `item_${idx}`,
          originalText: ing,
          suggestedName: ing.replace('402X', 'Extract').replace('Parfum', 'Fragrance / Parfum'),
          confidence: isError ? 0.62 : 0.96,
          isSuspectedError: isError,
          userCorrection: undefined,
        };
      });

      return {
        scanId,
        rawText: textToParse,
        overallConfidence: 0.91,
        extractedItems: items,
      };
    }
  },

  async generateSafetyReport(
    scanId: string,
    confirmedIngredients: string[],
    productName: string = 'Scanned Product',
    category: string = 'Cosmetic'
  ): Promise<SafetyReport> {
    try {
      return await request<SafetyReport>(`/scan/${scanId}/analyze`, {
        method: 'POST',
        body: JSON.stringify({ ingredients: confirmedIngredients, productName, category }),
      });
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

      // Persist report and scan in history
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
    try {
      return await request<SafetyReport>(`/reports/${reportId}`);
    } catch {
      await delay(300);
      const reports = getStorage<SafetyReport[]>(STORAGE_KEYS.REPORTS, [sampleSafetyReport]);
      const found = reports.find(r => r.id === reportId || r.scanId === reportId);
      if (!found) throw new Error('Report not found');
      return found;
    }
  },
};

// -------------------------------------------------------------
// HISTORY & SAVED PRODUCTS
// -------------------------------------------------------------
export const historyApi = {
  async getScans(): Promise<Scan[]> {
    try {
      return await request<Scan[]>('/scans');
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