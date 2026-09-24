import { invoiceApi } from '../../services/api';
import { Invoice } from '../../types/business';
import { UseBusinessDataState } from './types';

export async function createInvoiceAction(
  data: {
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
  },
  currentInvoices: Invoice[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Invoice> {
  try {
    const newInvoice = await invoiceApi.createInvoice(data);
    updateState({
      invoices: [newInvoice, ...currentInvoices]
    });
    return newInvoice;
  } catch (error) {
    const errorMessage = handleError(error, 'tạo hóa đơn');
    throw new Error(errorMessage);
  }
}

export async function updateInvoiceAction(
  id: string,
  data: Partial<Invoice>,
  currentInvoices: Invoice[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Invoice> {
  try {
    const updatedInvoice = await invoiceApi.updateInvoice(id, data);
    updateState({
      invoices: currentInvoices.map((inv) => (inv.id === id ? updatedInvoice : inv))
    });
    return updatedInvoice;
  } catch (error) {
    const errorMessage = handleError(error, 'cập nhật hóa đơn');
    throw new Error(errorMessage);
  }
}

export async function addPaymentAction(
  invoiceId: string,
  paymentData: {
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    paidAt: Date;
  },
  currentInvoices: Invoice[],
  refreshCustomers: () => Promise<void>,
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Invoice> {
  try {
    const updatedInvoice = await invoiceApi.addPayment(invoiceId, paymentData);
    updateState({
      invoices: currentInvoices.map((inv) => (inv.id === invoiceId ? updatedInvoice : inv))
    });

    // Refresh customers to update stats
    await refreshCustomers();

    return updatedInvoice;
  } catch (error) {
    const errorMessage = handleError(error, 'thêm thanh toán');
    throw new Error(errorMessage);
  }
}

export async function deleteInvoiceAction(
  id: string,
  currentInvoices: Invoice[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<void> {
  try {
    await invoiceApi.deleteInvoice(id);
    updateState({
      invoices: currentInvoices.filter((inv) => inv.id !== id)
    });
  } catch (error) {
    const errorMessage = handleError(error, 'xóa hóa đơn');
    throw new Error(errorMessage);
  }
}
