import { Customer } from '../../../types/business';

export interface CustomersPageProps {
  onClose?: () => void;
}

export type CustomerFormSaveData = Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>;

export interface CustomersStatsData {
  total: number;
  totalOrders: number;
  totalSpent: number;
  vip: number;
}

export interface CustomerQuoteSummary {
  id: string;
  quoteNumber: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface CustomerInvoiceSummary {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  createdAt: string;
}
