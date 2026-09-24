import { useState, useEffect, useCallback } from 'react';
import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  DEFAULT_BUSINESS_CONFIG,
  QuoteItem,
  InvoiceItem,
  InvoicePayment,
  QuoteStatus,
  InvoiceStatus
} from '../../types/business';
import {
  STORAGE_KEYS,
  loadFromStorage,
  saveToStorage,
  loadInitialBusinessConfig
} from './storage';
import {
  addCustomerRecord,
  updateCustomerRecord,
  deleteCustomerRecord,
  updateCustomerStatsRecord
} from './customerOperations';
import {
  generateQuoteNumberHelper,
  addQuoteRecord,
  updateQuoteRecord,
  updateQuoteStatusRecord,
  deleteQuoteRecord
} from './quoteOperations';
import {
  generateInvoiceNumberHelper,
  addInvoiceRecord,
  updateInvoiceRecord,
  addPaymentRecord,
  convertQuoteToInvoiceRecord
} from './invoiceOperations';
import { calculateBusinessDatabaseStats } from './configAndStats';

export const useBusinessDatabase = () => {
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [config, setConfig] = useState<BusinessConfig>(DEFAULT_BUSINESS_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    setCustomers(loadFromStorage(STORAGE_KEYS.CUSTOMERS, []));
    setQuotes(loadFromStorage(STORAGE_KEYS.QUOTES, []));
    setInvoices(loadFromStorage(STORAGE_KEYS.INVOICES, []));
    setConfig(loadInitialBusinessConfig());
    setIsLoaded(true);
  }, []);

  // Auto-save when data changes
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }, [customers, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.QUOTES, quotes);
    }
  }, [quotes, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.INVOICES, invoices);
    }
  }, [invoices, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      saveToStorage(STORAGE_KEYS.CONFIG, config);
    }
  }, [config, isLoaded]);

  // ============================================
  // CUSTOMER OPERATIONS
  // ============================================
  const addCustomer = useCallback(
    (
      data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>
    ): Customer => {
      return addCustomerRecord(data, setCustomers);
    },
    []
  );

  const updateCustomer = useCallback(
    (id: string, data: Partial<Customer>): void => {
      updateCustomerRecord(id, data, setCustomers);
    },
    []
  );

  const deleteCustomer = useCallback(
    (id: string): boolean => {
      return deleteCustomerRecord(id, quotes, invoices, setCustomers);
    },
    [quotes, invoices]
  );

  const getCustomer = useCallback(
    (id: string): Customer | undefined => {
      return customers.find((c) => c.id === id);
    },
    [customers]
  );

  const updateCustomerStats = useCallback(
    (customerId: string, orderAmount: number): void => {
      updateCustomerStatsRecord(customerId, orderAmount, setCustomers);
    },
    []
  );

  // ============================================
  // QUOTE OPERATIONS
  // ============================================
  const generateQuoteNumber = useCallback((): string => {
    return generateQuoteNumberHelper(config, setConfig);
  }, [config]);

  const addQuote = useCallback(
    (data: {
      customerId: string;
      items: Omit<QuoteItem, 'id'>[];
      discountPercent?: number;
      vatPercent?: number;
      validUntil?: string;
      notes?: string;
    }): Quote => {
      return addQuoteRecord(data, customers, config, generateQuoteNumber, setQuotes);
    },
    [customers, config, generateQuoteNumber]
  );

  const updateQuote = useCallback(
    (id: string, data: Partial<Quote>): void => {
      updateQuoteRecord(id, data, setQuotes);
    },
    []
  );

  const updateQuoteStatus = useCallback(
    (id: string, status: QuoteStatus): void => {
      updateQuoteStatusRecord(id, status, setQuotes);
    },
    []
  );

  const deleteQuote = useCallback((id: string): void => {
    deleteQuoteRecord(id, setQuotes);
  }, []);

  const getQuote = useCallback(
    (id: string): Quote | undefined => {
      return quotes.find((q) => q.id === id);
    },
    [quotes]
  );

  // ============================================
  // INVOICE OPERATIONS
  // ============================================
  const generateInvoiceNumber = useCallback((): string => {
    return generateInvoiceNumberHelper(config, setConfig);
  }, [config]);

  const addInvoice = useCallback(
    (data: {
      customerId: string;
      items: Omit<InvoiceItem, 'id'>[];
      discountPercent?: number;
      vatPercent?: number;
      dueDate?: string;
      notes?: string;
      quoteId?: string;
      quoteNumber?: string;
    }): Invoice => {
      return addInvoiceRecord(
        data,
        customers,
        config,
        generateInvoiceNumber,
        setInvoices,
        setQuotes
      );
    },
    [customers, config, generateInvoiceNumber]
  );

  const updateInvoice = useCallback(
    (id: string, data: Partial<Invoice>): void => {
      updateInvoiceRecord(id, data, setInvoices);
    },
    []
  );

  const addPayment = useCallback(
    (invoiceId: string, payment: Omit<InvoicePayment, 'id'>): void => {
      addPaymentRecord(
        invoiceId,
        payment,
        customers,
        updateCustomerStats,
        setInvoices
      );
    },
    [customers, updateCustomerStats]
  );

  const updateInvoiceStatus = useCallback(
    (id: string, status: InvoiceStatus): void => {
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status } : inv))
      );
    },
    []
  );

  const deleteInvoice = useCallback((id: string): void => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }, []);

  const getInvoice = useCallback(
    (id: string): Invoice | undefined => {
      return invoices.find((inv) => inv.id === id);
    },
    [invoices]
  );

  // ============================================
  // QUOTE TO INVOICE CONVERSION
  // ============================================
  const convertQuoteToInvoice = useCallback(
    (quoteId: string): Invoice | null => {
      return convertQuoteToInvoiceRecord(quoteId, quotes, addInvoice);
    },
    [quotes, addInvoice]
  );

  // ============================================
  // CONFIG OPERATIONS
  // ============================================
  const updateConfig = useCallback((data: Partial<BusinessConfig>): void => {
    setConfig((prev) => ({ ...prev, ...data }));
  }, []);

  const updateCompanyInfo = useCallback(
    (data: Partial<BusinessConfig['company']>): void => {
      setConfig((prev) => ({ ...prev, company: { ...prev.company, ...data } }));
    },
    []
  );

  const updateQuoteConfig = useCallback(
    (data: Partial<BusinessConfig['quote']>): void => {
      setConfig((prev) => ({ ...prev, quote: { ...prev.quote, ...data } }));
    },
    []
  );

  const updateInvoiceConfig = useCallback(
    (data: Partial<BusinessConfig['invoice']>): void => {
      setConfig((prev) => ({ ...prev, invoice: { ...prev.invoice, ...data } }));
    },
    []
  );

  // ============================================
  // STATISTICS
  // ============================================
  const getStats = useCallback(() => {
    return calculateBusinessDatabaseStats(customers, quotes, invoices);
  }, [customers, quotes, invoices]);

  return {
    // Data
    customers,
    quotes,
    invoices,
    config,
    isLoaded,

    // Customer operations
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,

    // Quote operations
    addQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    getQuote,

    // Invoice operations
    addInvoice,
    updateInvoice,
    addPayment,
    updateInvoiceStatus,
    deleteInvoice,
    getInvoice,

    // Conversion
    convertQuoteToInvoice,

    // Config operations
    updateConfig,
    updateCompanyInfo,
    updateQuoteConfig,
    updateInvoiceConfig,

    // Stats
    getStats
  };
};

export default useBusinessDatabase;
