import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  QuoteStatus
} from '../../types/business';

export interface BusinessStats {
  totalCustomers: number;
  totalQuotes: number;
  totalInvoices: number;
  quotesByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
  totalRevenue: number;
  pendingAmount: number;
}

export interface UseBusinessDataState {
  // Data
  customers: Customer[];
  quotes: Quote[];
  invoices: Invoice[];
  config: BusinessConfig | null;
  stats: BusinessStats | null;

  // Loading states
  isLoading: boolean;
  customersLoading: boolean;
  quotesLoading: boolean;
  invoicesLoading: boolean;
  configLoading: boolean;
  statsLoading: boolean;

  // Error states
  error: string | null;
  customersError: string | null;
  quotesError: string | null;
  invoicesError: string | null;
  configError: string | null;
  statsError: string | null;

  // Success flags
  isLoaded: boolean;
}

export interface UseBusinessDataActions {
  // Refresh functions
  refreshAll: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshQuotes: () => Promise<void>;
  refreshInvoices: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  refreshStats: () => Promise<void>;

  // Customer actions
  createCustomer: (
    data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>
  ) => Promise<Customer>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  // Quote actions
  createQuote: (data: {
    customerId: string;
    items: any[];
    subtotal: number;
    discountPercent?: number;
    discountAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    total: number;
    validUntil?: Date;
    notes?: string;
  }) => Promise<Quote>;
  updateQuote: (id: string, data: Partial<Quote>) => Promise<Quote>;
  updateQuoteStatus: (id: string, status: QuoteStatus) => Promise<Quote>;
  deleteQuote: (id: string) => Promise<void>;
  convertQuoteToInvoice: (id: string) => Promise<Invoice>;

  // Invoice actions
  createInvoice: (data: {
    customerId: string;
    items: any[];
    subtotal: number;
    discountPercent?: number;
    discountAmount?: number;
    vatPercent?: number;
    vatAmount?: number;
    total: number;
    dueDate?: Date;
    notes?: string;
    quoteId?: string;
    quoteNumber?: string;
  }) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice>;
  addPayment: (
    invoiceId: string,
    paymentData: {
      amount: number;
      method: string;
      reference?: string;
      notes?: string;
      paidAt: Date;
    }
  ) => Promise<Invoice>;
  deleteInvoice: (id: string) => Promise<void>;

  // Config actions
  updateConfig: (data: Partial<BusinessConfig>) => Promise<BusinessConfig>;
}

export type UseBusinessDataReturn = UseBusinessDataState & UseBusinessDataActions;
