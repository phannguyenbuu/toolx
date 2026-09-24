import { quoteApi } from '../../services/api';
import { Quote, Invoice, QuoteStatus } from '../../types/business';
import { UseBusinessDataState } from './types';

export async function createQuoteAction(
  data: {
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
  },
  currentQuotes: Quote[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Quote> {
  try {
    const newQuote = await quoteApi.createQuote(data);
    updateState({
      quotes: [newQuote, ...currentQuotes]
    });
    return newQuote;
  } catch (error) {
    const errorMessage = handleError(error, 'tạo báo giá');
    throw new Error(errorMessage);
  }
}

export async function updateQuoteAction(
  id: string,
  data: Partial<Quote>,
  currentQuotes: Quote[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Quote> {
  try {
    const updatedQuote = await quoteApi.updateQuote(id, data);
    updateState({
      quotes: currentQuotes.map((q) => (q.id === id ? updatedQuote : q))
    });
    return updatedQuote;
  } catch (error) {
    const errorMessage = handleError(error, 'cập nhật báo giá');
    throw new Error(errorMessage);
  }
}

export async function updateQuoteStatusAction(
  id: string,
  status: QuoteStatus,
  currentQuotes: Quote[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Quote> {
  try {
    const updatedQuote = await quoteApi.updateQuoteStatus(id, status);
    updateState({
      quotes: currentQuotes.map((q) => (q.id === id ? updatedQuote : q))
    });
    return updatedQuote;
  } catch (error) {
    const errorMessage = handleError(error, 'cập nhật trạng thái báo giá');
    throw new Error(errorMessage);
  }
}

export async function deleteQuoteAction(
  id: string,
  currentQuotes: Quote[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<void> {
  try {
    await quoteApi.deleteQuote(id);
    updateState({
      quotes: currentQuotes.filter((q) => q.id !== id)
    });
  } catch (error) {
    const errorMessage = handleError(error, 'xóa báo giá');
    throw new Error(errorMessage);
  }
}

export async function convertQuoteToInvoiceAction(
  id: string,
  currentQuotes: Quote[],
  currentInvoices: Invoice[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Invoice> {
  try {
    const newInvoice = await quoteApi.convertToInvoice(id);
    updateState({
      invoices: [newInvoice, ...currentInvoices],
      quotes: currentQuotes.map((q) =>
        q.id === id
          ? { ...q, invoiceId: newInvoice.id, status: 'ACCEPTED' as QuoteStatus }
          : q
      )
    });
    return newInvoice;
  } catch (error) {
    const errorMessage = handleError(error, 'chuyển báo giá thành hóa đơn');
    throw new Error(errorMessage);
  }
}
