export type UserRole = 'user' | 'admin';

export interface UserProfile {
  ageGroup?: string;
  allergies: string[];
  skinType?: 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive';
  skinSensitivities: string[];
  avoidIngredients: string[];
  dietaryRestrictions: string[];
  fragranceSensitivity: boolean;
  preferredCategories: string[];
  isOnboardingCompleted: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  profile: UserProfile;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'hazardous' | 'unknown';

export interface OCRItem {
  id: string;
  originalText: string;
  suggestedName: string;
  confidence: number;
  isSuspectedError: boolean;
  userCorrection?: string;
  category?: string;
}

export interface OCRResult {
  scanId: string;
  rawText: string;
  overallConfidence: number;
  extractedItems: OCRItem[];
  imageUrl?: string;
}

export interface IngredientAnalysis {
  id: string;
  rawName: string;
  matchedName: string;
  casNumber?: string;
  category: string;
  riskLevel: RiskLevel;
  isAllergen: boolean;
  isIrritant: boolean;
  isHazardous: boolean;
  hazardDetails?: string;
  allergenDetails?: string;
  irritantDetails?: string;
  confidence: number;
  personalizedMatch: boolean;
  userAvoidMatch: boolean;
  whyFlagged?: string;
  datasetReference?: string;
  alternativeNames?: string[];
}

export interface AlternativeProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  imageUrl: string;
  safetyScore: number;
  reasonSuggested: string;
  avoidedConcerns: string[];
  rating?: number;
}

export interface SafetyReport {
  id: string;
  scanId: string;
  productName: string;
  brand: string;
  category: string;
  imageUrl: string;
  scanDate: string;
  score: number; // 0 - 100
  riskLabel: 'Lower Detected Risk' | 'Moderate Detected Risk' | 'Higher Detected Risk' | 'Significant Detected Concerns';
  riskExplanation: string;
  summaryCounts: {
    total: number;
    allergens: number;
    irritants: number;
    hazards: number;
    reviewNeeded: number;
    unknown: number;
  };
  ingredients: IngredientAnalysis[];
  personalizedWarnings: string[];
  saferAlternatives: AlternativeProduct[];
  userNotes?: string;
  isFavorite?: boolean;
}

export interface Scan {
  id: string;
  userId: string;
  productName: string;
  brand: string;
  category: string;
  imageUrl: string;
  scanDate: string;
  score: number;
  riskLabel: string;
  allergensCount: number;
  hazardsCount: number;
  status: 'processing' | 'review_required' | 'completed' | 'failed';
  reportId?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  createdAt: string;
  read: boolean;
  link?: string;
}

export interface MasterIngredient {
  id: string;
  name: string;
  casNumber?: string;
  category: string;
  riskLevel: RiskLevel;
  description: string;
  isAllergen: boolean;
  isIrritant: boolean;
  isHazardous: boolean;
  ewgScore?: number;
  synonyms: string[];
  updatedAt: string;
}

export interface MasterAllergen {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  commonProducts: string[];
  description: string;
}

export interface MasterHazard {
  id: string;
  chemicalName: string;
  casNumber: string;
  hazardCategory: string; // e.g. Carcinogen, Endocrine Disruptor, Neurotoxin
  regulatoryStatus: string;
  summary: string;
}

export interface AdminStats {
  totalUsers: number;
  totalScans: number;
  totalIngredients: number;
  flaggedIngredientsCount: number;
  recentScansTrend: { date: string; scans: number; hazardsDetected: number }[];
  topFlaggedChemicals: { name: string; count: number }[];
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  role: UserRole;
  timestamp: string;
  details: string;
}

export interface DatasetImport {
  id: string;
  filename: string;
  recordCount: number;
  status: 'completed' | 'processing' | 'failed';
  importedAt: string;
}
