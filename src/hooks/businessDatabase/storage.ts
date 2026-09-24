import { BusinessConfig, DEFAULT_BUSINESS_CONFIG } from '../../types/business';

export const STORAGE_KEYS = {
  CUSTOMERS: 'business_customers',
  QUOTES: 'business_quotes',
  INVOICES: 'business_invoices',
  CONFIG: 'business_config'
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
  }
  return defaultValue;
};

export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key}:`, e);
  }
};

export const loadInitialBusinessConfig = (): BusinessConfig => {
  let loadedConfig = loadFromStorage(STORAGE_KEYS.CONFIG, DEFAULT_BUSINESS_CONFIG);
  try {
    const accountBusinessInfo = localStorage.getItem('businessInfo');
    if (accountBusinessInfo) {
      const info = JSON.parse(accountBusinessInfo);
      loadedConfig = {
        ...loadedConfig,
        company: {
          ...loadedConfig.company,
          name: info.name || loadedConfig.company.name,
          address: info.address || loadedConfig.company.address,
          phone: info.phone || loadedConfig.company.phone,
          email: info.email || loadedConfig.company.email,
          website: info.website,
          taxCode: info.taxCode,
          bankAccount: info.bankAccount,
          bankName: info.bankName,
          bankBranch: info.bankBranch,
          logo: info.logo
        }
      };
    }
  } catch (e) {
    console.error('Error loading account business info:', e);
  }
  return loadedConfig;
};
