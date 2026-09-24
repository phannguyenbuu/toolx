import { useState, useEffect, useCallback, useRef } from 'react';
import { businessConfigApi } from '../../services/api';
import {
  Customer,
  Quote,
  Invoice,
  BusinessConfig,
  QuoteStatus
} from '../../types/business';
import { useSupabaseAuth as useAuth } from '../../components/auth/SupabaseAuthContext';
import { UseBusinessDataState, UseBusinessDataReturn } from './types';
import {
  fetchCustomersData,
  fetchQuotesData,
  fetchInvoicesData,
  fetchConfigData,
  fetchStatsData
} from './loaders';
import {
  createCustomerAction,
  updateCustomerAction,
  deleteCustomerAction
} from './customerActions';
import {
  createQuoteAction,
  updateQuoteAction,
  updateQuoteStatusAction,
  deleteQuoteAction,
  convertQuoteToInvoiceAction
} from './quoteActions';
import {
  createInvoiceAction,
  updateInvoiceAction,
  addPaymentAction,
  deleteInvoiceAction
} from './invoiceActions';

export const useBusinessData = (): UseBusinessDataReturn => {
  const { isAuthenticated, user } = useAuth();
  const mountedRef = useRef(true);

  // State
  const [state, setState] = useState<UseBusinessDataState>({
    customers: [],
    quotes: [],
    invoices: [],
    config: null,
    stats: null,

    isLoading: false,
    customersLoading: false,
    quotesLoading: false,
    invoicesLoading: false,
    configLoading: false,
    statsLoading: false,

    error: null,
    customersError: null,
    quotesError: null,
    invoicesError: null,
    configError: null,
    statsError: null,

    isLoaded: false
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Helper function to update state safely
  const updateState = useCallback((updates: Partial<UseBusinessDataState>) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  // Helper function to handle errors
  const handleError = useCallback((error: any, type: string) => {
    const errorMessage = error?.message || `Lỗi khi tải ${type}`;
    console.error(`Business Data Error (${type}):`, error);
    return errorMessage;
  }, []);

  // Data loading functions
  const loadCustomers = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await fetchCustomersData(updateState, handleError);
  }, [isAuthenticated, user, updateState, handleError]);

  const loadQuotes = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await fetchQuotesData(updateState, handleError);
  }, [isAuthenticated, user, updateState, handleError]);

  const loadInvoices = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await fetchInvoicesData(updateState, handleError);
  }, [isAuthenticated, user, updateState, handleError]);

  const loadConfig = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await fetchConfigData(updateState, handleError);
  }, [isAuthenticated, user, updateState, handleError]);

  const loadStats = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    await fetchStatsData(updateState, handleError);
  }, [isAuthenticated, user, updateState, handleError]);

  // Refresh functions
  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user) {
      updateState({
        customers: [],
        quotes: [],
        invoices: [],
        config: null,
        stats: null,
        isLoaded: false,
        error: null
      });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      await Promise.all([
        loadCustomers(),
        loadQuotes(),
        loadInvoices(),
        loadConfig(),
        loadStats()
      ]);
      updateState({ isLoaded: true });
    } catch (error) {
      const errorMessage = handleError(error, 'dữ liệu');
      updateState({ error: errorMessage });
    } finally {
      updateState({ isLoading: false });
    }
  }, [
    isAuthenticated,
    user,
    loadCustomers,
    loadQuotes,
    loadInvoices,
    loadConfig,
    loadStats,
    updateState,
    handleError
  ]);

  const refreshCustomers = useCallback(async () => {
    await loadCustomers();
  }, [loadCustomers]);

  const refreshQuotes = useCallback(async () => {
    await loadQuotes();
  }, [loadQuotes]);

  const refreshInvoices = useCallback(async () => {
    await loadInvoices();
  }, [loadInvoices]);

  const refreshConfig = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  // Customer actions
  const createCustomer = useCallback(
    async (
      data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>
    ) => {
      return createCustomerAction(data, state.customers, updateState, handleError);
    },
    [updateState, handleError, state.customers]
  );

  const updateCustomer = useCallback(
    async (id: string, data: Partial<Customer>) => {
      return updateCustomerAction(id, data, state.customers, updateState, handleError);
    },
    [updateState, handleError, state.customers]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      return deleteCustomerAction(id, state.customers, updateState, handleError);
    },
    [updateState, handleError, state.customers]
  );

  // Quote actions
  const createQuote = useCallback(
    async (data: {
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
    }) => {
      return createQuoteAction(data, state.quotes, updateState, handleError);
    },
    [updateState, handleError, state.quotes]
  );

  const updateQuote = useCallback(
    async (id: string, data: Partial<Quote>) => {
      return updateQuoteAction(id, data, state.quotes, updateState, handleError);
    },
    [updateState, handleError, state.quotes]
  );

  const updateQuoteStatus = useCallback(
    async (id: string, status: QuoteStatus) => {
      return updateQuoteStatusAction(id, status, state.quotes, updateState, handleError);
    },
    [updateState, handleError, state.quotes]
  );

  const deleteQuote = useCallback(
    async (id: string) => {
      return deleteQuoteAction(id, state.quotes, updateState, handleError);
    },
    [updateState, handleError, state.quotes]
  );

  const convertQuoteToInvoice = useCallback(
    async (id: string) => {
      return convertQuoteToInvoiceAction(
        id,
        state.quotes,
        state.invoices,
        updateState,
        handleError
      );
    },
    [updateState, handleError, state.invoices, state.quotes]
  );

  // Invoice actions
  const createInvoice = useCallback(
    async (data: {
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
    }) => {
      return createInvoiceAction(data, state.invoices, updateState, handleError);
    },
    [updateState, handleError, state.invoices]
  );

  const updateInvoice = useCallback(
    async (id: string, data: Partial<Invoice>) => {
      return updateInvoiceAction(id, data, state.invoices, updateState, handleError);
    },
    [updateState, handleError, state.invoices]
  );

  const addPayment = useCallback(
    async (
      invoiceId: string,
      paymentData: {
        amount: number;
        method: string;
        reference?: string;
        notes?: string;
        paidAt: Date;
      }
    ) => {
      return addPaymentAction(
        invoiceId,
        paymentData,
        state.invoices,
        refreshCustomers,
        updateState,
        handleError
      );
    },
    [updateState, handleError, refreshCustomers, state.invoices]
  );

  const deleteInvoice = useCallback(
    async (id: string) => {
      return deleteInvoiceAction(id, state.invoices, updateState, handleError);
    },
    [updateState, handleError, state.invoices]
  );

  // Config actions
  const updateConfig = useCallback(
    async (data: Partial<BusinessConfig>) => {
      try {
        const updatedConfig = await businessConfigApi.updateConfig(data);
        updateState({ config: updatedConfig });
        return updatedConfig;
      } catch (error) {
        const errorMessage = handleError(error, 'cập nhật cấu hình');
        throw new Error(errorMessage);
      }
    },
    [updateState, handleError]
  );

  // Auto load data when authenticated
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return {
    ...state,
    refreshAll,
    refreshCustomers,
    refreshQuotes,
    refreshInvoices,
    refreshConfig,
    refreshStats,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    convertQuoteToInvoice,
    createInvoice,
    updateInvoice,
    addPayment,
    deleteInvoice,
    updateConfig
  };
};

export default useBusinessData;
