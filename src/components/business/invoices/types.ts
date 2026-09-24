import { Invoice, InvoiceItem, InvoiceStatus, InvoicePayment, Customer } from '../../../types/business';

export interface InvoicesPageProps {
  onClose?: () => void;
}

export interface InvoiceModalConfig {
  header: string;
  footer: string;
  defaultVatPercent: number;
  defaultPaymentDays: number;
}

export interface InvoiceFormSaveData {
  customerId: string;
  items: Omit<InvoiceItem, 'id'>[];
  discountPercent?: number;
  vatPercent?: number;
  dueDate?: string;
  notes?: string;
}

export interface InvoicesStatsData {
  total: number;
  revenue: number;
  pending: number;
  paid: number;
  unpaid: number;
}
