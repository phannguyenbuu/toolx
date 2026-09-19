// ============================================
// API TYPES - SYNC WITH BACKEND PRISMA SCHEMA
// ============================================

// --- ENUMS (sync with Prisma) ---
export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED';
export type SubscriptionStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type TransactionType = 'TOPUP' | 'PURCHASE' | 'REFUND' | 'SUBSCRIPTION' | 'BONUS';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ProjectStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type AiJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type FileType = 'PDF' | 'IMAGE' | 'FONT' | 'PROJECT' | 'OTHER';
export type WorkerStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
export type WorkerJobStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// --- USER ---
export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- DESIGN SESSION ---
export interface DesignSession {
  id: string;
  userId: string;
  name: string;
  elements: any[]; // JSON
  pageConfig: any; // JSON
  dataRows: any[]; // JSON
  headers: any[]; // JSON
  customerSettings: any; // JSON
  customerNotes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- PLAN ---
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number; // Decimal as number
  priceYearly: number; // Decimal as number
  features: any[]; // JSON array
  limits: any; // JSON object
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

// --- SUBSCRIPTION ---
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  plan?: Plan;
}

// --- WALLET ---
export interface Wallet {
  id: string;
  userId: string;
  balance: number; // Decimal as number
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// --- TRANSACTION ---
export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // Decimal as number
  balanceBefore: number | null; // Decimal as number
  balanceAfter: number | null; // Decimal as number
  description: string | null;
  metadata: any; // JSON
  status: TransactionStatus;
  createdAt: string;
}

// --- PROJECT ---
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  designData: any; // JSON
  isTemplate: boolean;
  isPublic: boolean;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

// --- AI JOB ---
export interface AiJob {
  id: string;
  userId: string;
  jobType: string;
  inputData: any | null; // JSON
  outputData: any | null; // JSON
  status: AiJobStatus;
  creditsUsed: number;
  processingTimeMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

// --- FILE STORAGE ---
export interface FileStorage {
  id: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileType: FileType;
  path: string;
  expiresAt: string;
  createdAt: string;
}

// --- BUSINESS CONFIG ---
export interface BusinessConfig {
  id: string;
  userId: string;
  // Business Info
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
  businessTaxCode: string | null;
  businessWebsite: string | null;
  businessLogoUrl: string | null;
  // Bank Info
  bankName: string | null;
  bankAccount: string | null;
  bankBranch: string | null;
  // Equipment & Tax
  equipment: any[]; // JSON array
  taxPercent: number; // % thuế mặc định
  // Document Config
  quoteHeader: string | null;
  quoteHeaderImageUrl: string | null;
  quoteFooter: string | null;
  quoteFooterImageUrl: string | null;
  invoiceHeader: string | null;
  invoiceHeaderImageUrl: string | null;
  invoiceFooter: string | null;
  invoiceFooterImageUrl: string | null;
  displaySettings: any; // JSON
  // Settings
  defaultVatPercent: number; // Decimal as number
  defaultPaymentDays: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// --- WORKER ---
export interface Worker {
  id: string;
  name: string;
  url: string;
  secret: string;
  status: WorkerStatus;
  capabilities: string[];
  // System info
  cpuCount: number | null;
  ramTotalGb: number | null; // Decimal as number
  diskTotalGb: number | null; // Decimal as number
  // Real-time metrics
  cpuPercent: number | null; // Decimal as number
  ramPercent: number | null; // Decimal as number
  currentJobs: number;
  lastHeartbeat: string | null;
  // Settings
  targetCpu: number | null;
  targetRam: number | null;
  maxConcurrentJobs: number | null;
  isEnabled: boolean;
  // Stats
  totalJobsCompleted: number;
  totalJobsFailed: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// --- WORKER JOB ---
export interface WorkerJob {
  id: string;
  workerId: string;
  userId: string | null;
  jobType: string;
  status: WorkerJobStatus;
  // Input/Output
  inputData: any | null; // JSON
  inputFileKey: string | null;
  outputData: any | null; // JSON
  outputFileKey: string | null;
  // Progress
  progress: number; // 0-100
  errorMessage: string | null;
  // Timing
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// --- SYSTEM CONFIG ---
export interface SystemConfig {
  id: string;
  key: string;
  value: string; // JSON string
  description: string | null;
  category: string;
  updatedAt: string;
  updatedBy: string | null;
}

// --- ACTIVITY LOG ---
export interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: any; // JSON
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// --- API RESPONSE WRAPPERS ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// --- COMMON API TYPES ---
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  wallet: Wallet;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface FileUploadResponse {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
}