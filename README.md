# LabelCheck – AI-Based Ingredient Hazard & Allergen Analyzer

> **Tagline:** *"Know What’s Inside. Choose What’s Safer."*

LabelCheck is a modern, responsive React frontend application for a college minor project. It provides an AI-powered ingredient label analyzer designed to help users upload or capture packaged product labels (cosmetics, skincare, food), extract ingredients using Optical Character Recognition (OCR), detect allergens, irritants, and chemical hazards, and generate a personalized safety score from 0–100 based on individual skin sensitivities and allergy profiles.

---

## 🌟 Key Features

### User Persona Features
- **Public Landing Page (`/`)**: Hero section, OCR visual demo, 4-step workflow, feature highlights, and medical risk disclaimers.
- **Authentication (`/login`, `/register`, `/forgot-password`)**: Form validations using React Hook Form + Zod, password strength meter, remember me, and Google OAuth UI mockup.
- **Onboarding Workflow (`/onboarding`)**: Interactive step-by-step wizard collecting allergies, skin type (sensitive, dry, oily, etc.), skin sensitivities, ingredients to avoid, and product categories.
- **Personal Profile (`/profile`)**: Manage personal details, update allergy watchlists, change password, and delete account.
- **Main Dashboard (`/dashboard`)**: Summary metric cards, recent scans list with risk badges, Recharts scan trend analytics, quick scan shortcuts, and safer alternatives preview.
- **Product Scanning Workspace (`/scan`)**: Multi-method scanner supporting:
  - **Upload Image**: Drag & drop file dropzone for JPG, PNG, JPEG, and WebP (up to 10MB) with format checks and file size validation.
  - **Live Camera Capture**: WebRTC camera stream with viewfinder overlay, snapshot shutter, and retake controls.
  - **Manual Text Input**: Character-counted text area with sample ingredient loader.
- **OCR Review & Verification (`/scan/review/:scanId`)**: Interactive ingredient chip editor displaying extraction confidence ratings, suspected OCR typos ("Did you mean?"), add/remove actions, and re-analysis triggers.
- **AI Safety Report (`/report/:scanId`)**:
  - 0–100 circular score visualization color-coded by risk severity.
  - Risk summary cards for Allergens, Irritants, Chemical Hazards, Review Items, and Clean ingredients.
  - Searchable, filterable ingredient table with detail drawer integration (CAS numbers, EWG hazard scores, toxicological summaries).
  - Personalized profile sensitivity warning triggers.
  - Safer clean product recommendations.
  - PDF export simulation, report bookmarking, link sharing, and OCR mistake reporting.
- **Scan History (`/history`)**: Searchable scan archive with date filtering, score range filter, sort order, list/grid views, and delete confirmation dialogs.
- **Saved Products (`/saved`)**: Category filterable bookmarks with multi-product comparison selector.
- **Product Comparison (`/compare`)**: Side-by-side comparison matrix evaluating safety scores, detected concerns, shared ingredients, and formulation differences.
- **Notifications (`/notifications`)**: Read/unread alert list for scan completion, safer alternative discoveries, and ingredient database updates.

### Admin Persona Features
- **Admin Overview Dashboard (`/admin/dashboard`)**: Total users, total scans, indexed ingredients, chemical hazards count, Recharts top flagged chemicals chart, and system audit log.
- **User Management (`/admin/users`)**: User directory table with role toggles (`User` ↔ `Admin`).
- **Ingredient Dictionary (`/admin/ingredients`)**: Master CRUD interface for chemical names, CAS numbers, EWG hazard scores, and risk classifications.
- **Allergen Registry (`/admin/allergens`)**: Severity classifications and common product trigger lists.
- **Chemical Hazards Registry (`/admin/hazards`)**: Restricted chemical carcinogens, endocrine disruptors, and regulatory statuses.
- **Safer Alternatives Mapping (`/admin/alternatives`)**: Recommendation engine mapping management.
- **Dataset Sync (`/admin/datasets`)**: CSV/JSON dataset importer for EU CosIng and EWG database updates.
- **Audit Logs & OCR Errors (`/admin/audit-logs`)**: Immutable system action log and user-reported OCR corrections.

---

## 🛠️ Technology Stack

- **Framework**: React.js 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Server State & Caching**: TanStack Query (React Query v5)
- **Data Visualization**: Recharts
- **Form Management**: React Hook Form + Zod validation
- **HTTP Client**: Centralized API Client layer with `localStorage` mock fallback persistence

---

## 📁 Project Architecture

```
minor project/
├── public/
│   └── favicon.svg
├── src/
│   ├── api/
│   │   ├── apiClient.ts      # Centralized HTTP request wrapper with bearer token support
│   │   ├── mockData.ts       # Comprehensive domain dataset (Ingredients, Allergens, Reports)
│   │   └── services.ts       # Exported API modules (authApi, scanApi, adminApi, etc.)
│   ├── components/
│   │   ├── layout/           # Navbar, Sidebar, Footer, AppLayout, AdminLayout, ProtectedRoute
│   │   ├── report/           # IngredientTable, IngredientDetailModal, ProductCard
│   │   ├── scan/             # FileUpload, CameraCapture, ScanProgress
│   │   └── ui/               # Logo, Button, Input, SafetyScoreCircle, RiskBadge, IngredientChip, Modal, Drawer, Toast
│   ├── context/
│   │   ├── AuthContext.tsx   # User authentication & Dev role switching state
│   │   └── ToastContext.tsx  # Global toast notifications
│   ├── pages/
│   │   ├── admin/            # Admin Dashboard, Users, Ingredients, Allergens, Hazards, Datasets, Audit Logs
│   │   ├── auth/             # LoginPage, RegisterPage, ForgotPasswordPage
│   │   ├── DashboardPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── OCRReviewPage.tsx
│   │   ├── OnboardingPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SafetyReportPage.tsx
│   │   └── SavedProductsPage.tsx
│   ├── types/
│   │   └── index.ts          # Complete domain TypeScript interfaces
│   ├── utils/
│   │   └── cn.ts             # Tailwind classnames merger utility
│   ├── App.tsx               # Master route definitions
│   ├── index.css             # Tailwind base directives & custom scrollbars
│   └── main.tsx              # Application entry point
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### 1. Installation
Clone or navigate to the project root directory and install dependencies:

```bash
npm install
```

### 2. Development Server
Start the Vite local development server:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### 3. Production Build & Verification
Compile TypeScript and bundle for production:

```bash
npm run build
```

---

## 🔌 Python Backend Integration Guide

LabelCheck comes pre-configured with a centralized API layer in `src/api/apiClient.ts` and `src/api/services.ts`.

To connect this React frontend to a live Python backend (FastAPI / Flask):

1. Create a `.env` file in the project root:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```
2. Ensure your Python backend implements the expected REST endpoints detailed in `src/api/services.ts`:
   - `POST /api/auth/login`
   - `POST /api/auth/register`
   - `GET /api/auth/me`
   - `POST /api/scan/upload`
   - `POST /api/scan/:id/ocr`
   - `POST /api/scan/:id/analyze`
   - `GET /api/reports/:id`
   - `GET /api/admin/stats`

*Note: In the absence of an active backend server, the application operates out-of-the-box using local storage persistence!*

---

## 💡 Developer Persona Switcher

During development, you can test both **User** and **Admin** roles without re-authenticating. Click the **Role: User / Admin** toggle pill located in the navbar header to instantly preview role-protected pages.

---

## 📜 Medical & Informational Disclaimer

LabelCheck is built as an educational ingredient hazard analysis tool for college project submission. Safety scores (0–100) are computer-generated risk estimations and do not constitute certified medical diagnosis, clinical allergy testing, or formal regulatory product approval.
