import {
  customerApi,
  quoteApi,
  invoiceApi,
  businessConfigApi,
  statsApi
} from '../../services/api';
import { UseBusinessDataState } from './types';

export async function fetchCustomersData(
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
) {
  updateState({ customersLoading: true, customersError: null });
  try {
    const result = await customerApi.getCustomers();
    updateState({
      customers: result.data || result,
      customersLoading: false
    });
  } catch (error) {
    const errorMessage = handleError(error, 'khách hàng');
    updateState({
      customersError: errorMessage,
      customersLoading: false
    });
  }
}

export async function fetchQuotesData(
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
) {
  updateState({ quotesLoading: true, quotesError: null });
  try {
    const result = await quoteApi.getQuotes();
    updateState({
      quotes: result.data || result,
      quotesLoading: false
    });
  } catch (error) {
    const errorMessage = handleError(error, 'báo giá');
    updateState({
      quotesError: errorMessage,
      quotesLoading: false
    });
  }
}

export async function fetchInvoicesData(
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
) {
  updateState({ invoicesLoading: true, invoicesError: null });
  try {
    const result = await invoiceApi.getInvoices();
    updateState({
      invoices: result.data || result,
      invoicesLoading: false
    });
  } catch (error) {
    const errorMessage = handleError(error, 'hóa đơn');
    updateState({
      invoicesError: errorMessage,
      invoicesLoading: false
    });
  }
}

export async function fetchConfigData(
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
) {
  updateState({ configLoading: true, configError: null });
  try {
    const config = await businessConfigApi.getConfig();
    updateState({
      config,
      configLoading: false
    });
  } catch (error) {
    const errorMessage = handleError(error, 'cấu hình');
    updateState({
      configError: errorMessage,
      configLoading: false
    });
  }
}

export async function fetchStatsData(
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
) {
  updateState({ statsLoading: true, statsError: null });
  try {
    const stats = await statsApi.getBusinessStats();
    updateState({
      stats,
      statsLoading: false
    });
  } catch (error) {
    const errorMessage = handleError(error, 'thống kê');
    updateState({
      statsError: errorMessage,
      statsLoading: false
    });
  }
}
