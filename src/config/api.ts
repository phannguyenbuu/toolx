// ============================================
// API CONFIGURATION
// ============================================

import { ENV_CONFIG } from './environment';

// Environment variables with fallback to environment config
export const API_CONFIG = {
  // Base URL for API calls
  BASE_URL: process.env.REACT_APP_API_URL || ENV_CONFIG.BASE_URL,
  
  // Python AI Service URL
  PYTHON_API_URL: process.env.REACT_APP_PYTHON_API_URL || ENV_CONFIG.PYTHON_API_URL,
  
  // Socket.IO URL
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || ENV_CONFIG.SOCKET_URL,
  
  // Admin Panel URL
  ADMIN_URL: process.env.REACT_APP_ADMIN_URL || ENV_CONFIG.ADMIN_URL,
  
  // Request timeout (milliseconds)
  TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000'),
  
  // Enable request/response logging in development
  ENABLE_LOGGING: process.env.NODE_ENV === 'development',
  
  // API version
  VERSION: process.env.REACT_APP_API_VERSION || 'v1',
  
  // File upload limits
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '10485760'), // 10MB
  MAX_FILES_COUNT: parseInt(process.env.REACT_APP_MAX_FILES_COUNT || '10'),
  
  // Pagination defaults
  DEFAULT_PAGE_SIZE: parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE || '20'),
  MAX_PAGE_SIZE: parseInt(process.env.REACT_APP_MAX_PAGE_SIZE || '100'),
  
  // Cache settings
  CACHE_DURATION: parseInt(process.env.REACT_APP_CACHE_DURATION || '300000'), // 5 minutes
  
  // Retry settings
  MAX_RETRIES: parseInt(process.env.REACT_APP_MAX_RETRIES || '3'),
  RETRY_DELAY: parseInt(process.env.REACT_APP_RETRY_DELAY || '1000'), // 1 second
};

// API endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
  },
  
  // User management
  USER: {
    PROFILE: '/api/user/profile',
    AVATAR: '/api/user/avatar',
    OVERVIEW: '/api/user/overview',
    PASSWORD: '/api/user/password',
    SETTINGS: '/api/user/settings',
    DEACTIVATE: '/api/user/deactivate',
    SUBSCRIPTION: '/api/user/subscription',
    WALLET: '/api/user/wallet',
    TRANSACTIONS: '/api/user/transactions',
    ACTIVITY: '/api/user/activity',
    TEAM: '/api/user/team',
  },
  
  // Business management
  BUSINESS: {
    CONFIG: '/api/business/config',
    CUSTOMERS: '/api/business/customers',
    QUOTES: '/api/business/quotes',
    INVOICES: '/api/business/invoices',
    STATS: '/api/business/stats',
  },
  
  // Subscription plans
  PLANS: '/api/subscription-plans',
  
  // File management
  FILES: {
    UPLOAD: '/api/files/upload',
    UPLOAD_MULTIPLE: '/api/files/upload-multiple',
    DELETE: '/api/files',
  },
  
  // Health check
  HEALTH: '/health',
  
  // Python AI Service endpoints
  PYTHON: {
    HEALTH: '/api/health',
    GENERATE_PDF: '/api/generate-pdf-async',
    RENDER_PREVIEW: '/api/render-preview',
    VALIDATE_FILE: '/api/validate-file',
    TASK_STATUS: '/api/task',
    INPAINT: '/api/inpaint',
    OUTPAINT: '/api/outpaint',
  },
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền truy cập tính năng này.',
  NOT_FOUND: 'Không tìm thấy dữ liệu yêu cầu.',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ.',
  SERVER_ERROR: 'Lỗi máy chủ. Vui lòng thử lại sau.',
  TIMEOUT_ERROR: 'Yêu cầu quá thời gian chờ. Vui lòng thử lại.',
  UNKNOWN_ERROR: 'Có lỗi xảy ra. Vui lòng thử lại.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Đăng nhập thành công!',
  REGISTER_SUCCESS: 'Đăng ký tài khoản thành công!',
  LOGOUT_SUCCESS: 'Đăng xuất thành công!',
  PROFILE_UPDATED: 'Cập nhật thông tin thành công!',
  PASSWORD_CHANGED: 'Đổi mật khẩu thành công!',
  FILE_UPLOADED: 'Tải file lên thành công!',
  DATA_SAVED: 'Lưu dữ liệu thành công!',
  DATA_DELETED: 'Xóa dữ liệu thành công!',
} as const;

// Export legacy API_URL for backward compatibility
export const API_URL = API_CONFIG.BASE_URL;

// Utility functions
export const buildUrl = (endpoint: string, params?: Record<string, any>): string => {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  return url;
};

export const buildPythonUrl = (endpoint: string): string => {
  return `${API_CONFIG.PYTHON_API_URL}${endpoint}`;
};

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};