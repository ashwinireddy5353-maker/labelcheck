import { request, delay } from './apiClient';
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

function getStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

// -------------------------------------------------------------
// AUTH & USER SERVICES
// -------------------------------------------------------------
export const authApi = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    try {
      return await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch {
      await delay(600);
      let user = getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
      // Support admin login toggle demo
      if (email.includes('admin')) {
        user = { ...user, role: 'admin', fullName: 'Dr. Elena Vance (Admin)' };
      }
      setStorage(STORAGE_KEYS.USER, user);
      localStorage.setItem('labelcheck_token', 'mock_jwt_token_12345');
      return { token: 'mock_jwt_token_12345', user };
    }
  },

  async register(data: { fullName: string; email: string; password: string }): Promise<{ token: string; user: User }> {
    try {
      return await request<{ token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      await delay(800);
      const newUser: User = {
        id: `user_${Date.now()}`,
        fullName: data.fullName,
        email: data.email,
        role: 'user',
        createdAt: new Date().toISOString(),
        profile: {
          allergies: [],
          skinSensitivities: [],
          avoidIngredients: [],
          dietaryRestrictions: [],
          fragranceSensitivity: false,
          preferredCategories: [],
          isOnboardingCompleted: false,
        },
      };
      setStorage(STORAGE_KEYS.USER, newUser);
      localStorage.setItem('labelcheck_token', `mock_jwt_token_${Date.now()}`);
      return { token: `mock_jwt_token_${Date.now()}`, user: newUser };
    }
  },

  async getCurrentUser(): Promise<User> {
    try {
      return await request<User>('/auth/me');
    } catch {
      await delay(300);
      return getStorage<User>(STORAGE_KEYS.USER, initialMockUser);
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('labelcheck_token');
  },
};

// -------------------------------------------------------------
// PROFILE SERVICE
// -------------------------------------------------------------
export const profileApi = {
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

  async updatePassword(_data: { oldPassword: string; newPassword: string }): Promise<{ success: boolean }> {
    await delay(500);
    return { success: true };
  },

  async deleteAccount(): Promise<{ success: boolean }> {
    await delay(600);
    localStorage.clear();
    return { success: true };
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
      const token = localStorage.getItem('labelcheck_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/scan/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
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
      return found || sampleSafetyReport;
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
