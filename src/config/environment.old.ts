// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

// Detect current environment
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Get current host dynamically
const getCurrentHost = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.hostname;
  }
  return 'localhost';
};

// Get current protocol
const getCurrentProtocol = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.protocol;
  }
  return 'http:';
};

// Base configuration
const BASE_CONFIG = {
  // Development URLs (local development)
  DEVELOPMENT: {
    HOST: '103.82.193.18', // Use VPS IP for development too
    PROTOCOL: 'http:',
    PORTS: {
      FRONTEND: 3000,
      BACKEND: 3001,
      ADMIN: 3002,
      SOCKET: 3003,
      PYTHON: 3005,
    }
  },
  
  // Production URLs (VPS deployment)
  PRODUCTION: {
    HOST: '103.82.193.18', // VPS IP
    PROTOCOL: 'http:',
    PORTS: {
      FRONTEND: 3000,
      BACKEND: 3001,
      ADMIN: 3002,
      SOCKET: 3003,
      PYTHON: 3005,
    }
  }
};

// Get current environment config
const getCurrentConfig = () => {
  if (isProduction) {
    return BASE_CONFIG.PRODUCTION;
  }
  return BASE_CONFIG.DEVELOPMENT;
};

// Build URL helper
const buildServiceUrl = (service: keyof typeof BASE_CONFIG.DEVELOPMENT.PORTS): string => {
  const config = getCurrentConfig();
  return `${config.PROTOCOL}//${config.HOST}:${config.PORTS[service]}`;
};

// Export environment configuration
export const ENV_CONFIG = {
  // Environment flags
  IS_PRODUCTION: isProduction,
  IS_DEVELOPMENT: isDevelopment,
  
  // Current environment config
  CURRENT: getCurrentConfig(),
  
  // Service URLs
  URLS: {
    FRONTEND: buildServiceUrl('FRONTEND'),
    BACKEND: buildServiceUrl('BACKEND'),
    ADMIN: buildServiceUrl('ADMIN'),
    SOCKET: buildServiceUrl('SOCKET'),
    PYTHON: buildServiceUrl('PYTHON'),
  },
  
  // Legacy support - these will be used by existing code
  BASE_URL: buildServiceUrl('BACKEND'),
  PYTHON_API_URL: buildServiceUrl('PYTHON'),
  SOCKET_URL: buildServiceUrl('SOCKET'),
  ADMIN_URL: buildServiceUrl('ADMIN'),
  
  // QR Code base URL (for menu QR codes)
  QR_BASE_URL: buildServiceUrl('FRONTEND'),
};

// Export individual URLs for convenience

export const FRONTEND_URL = ENV_CONFIG.URLS.FRONTEND;
export const BACKEND_URL = ENV_CONFIG.URLS.BACKEND;
export const ADMIN_URL = ENV_CONFIG.URLS.ADMIN;
export const SOCKET_URL = ENV_CONFIG.URLS.SOCKET;
export const PYTHON_URL = ENV_CONFIG.URLS.PYTHON;


// Export helper functions
export { getCurrentHost, getCurrentProtocol, buildServiceUrl };

// Console log in development
if (isDevelopment) {
  console.log('🔧 Environment Configuration:', ENV_CONFIG);
}