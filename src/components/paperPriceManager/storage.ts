import { Supplier, MySupplierProfile, PaperManagerConfig } from './types';

const STORAGE_KEY = 'txp-suppliers';
const CONFIG_KEY = 'txp-paper-manager-config';
const PROFILE_KEY = 'txp-supplier-profile';

export function loadSuppliers(): Supplier[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function saveSuppliers(s: Supplier[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export function loadConfig(): PaperManagerConfig {
  try {
    const s = localStorage.getItem(CONFIG_KEY);
    return s
      ? JSON.parse(s)
      : { autoSyncInterval: 0, notifyPriceChange: true, autoApplyCheapest: false };
  } catch {
    return { autoSyncInterval: 0, notifyPriceChange: true, autoApplyCheapest: false };
  }
}

export function saveConfig(c: PaperManagerConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
  } catch {}
}

export function loadProfile(): MySupplierProfile {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    return s ? JSON.parse(s) : { name: '', code: '', phone: '', address: '', email: '' };
  } catch {
    return { name: '', code: '', phone: '', address: '', email: '' };
  }
}

export function saveProfile(p: MySupplierProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}
