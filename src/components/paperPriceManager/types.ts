import { Paper } from '../../utils/calculatorTypes';

export interface Supplier {
  id: string;
  email: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  enabled: boolean;
  lastSync: Date | null;
  papers: Paper[];
}

export interface MySupplierProfile {
  name: string;
  code: string;
  phone: string;
  address: string;
  email: string;
}

export interface PaperManagerConfig {
  autoSyncInterval: number;
  notifyPriceChange: boolean;
  autoApplyCheapest: boolean;
}

export type PaperActiveTab = 'prices' | 'suppliers' | 'config';

export type PaperSortCol = 'type' | 'gsm' | 'size' | 'price';

export const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
