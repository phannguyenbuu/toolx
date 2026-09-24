import { Quote, QuoteItem, QuoteStatus, Customer } from '../../../types/business';

export interface QuotesPageProps {
  onClose?: () => void;
}

export interface QuoteModalConfig {
  header: string;
  footer: string;
  defaultVatPercent: number;
  defaultValidityDays: number;
}

export interface InitialQuoteItem {
  description: string;
  specifications: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface QuoteFormSaveData {
  customerId: string;
  items: Omit<QuoteItem, 'id'>[];
  discountPercent?: number;
  vatPercent?: number;
  validUntil?: string;
  notes?: string;
}

export interface QuotesStatsData {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  totalValue: number;
}
