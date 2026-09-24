import React from 'react';
import { Invoice, InvoiceItem, InvoicePayment, InvoiceStatus, Quote, QuoteStatus, Customer, BusinessConfig } from '../../types/business';
import { invoiceApi, quoteApi, customerApi } from '../../services/businessApi';

export interface CreateInvoiceData {
  customerId: string;
  items: Omit<InvoiceItem, 'id'>[];
  discountPercent?: number;
  vatPercent?: number;
  dueDate?: string;
  notes?: string;
  quoteId?: string;
  quoteNumber?: string;
}

export async function createInvoice(
  data: CreateInvoiceData,
  invoiceConfig: BusinessConfig['invoice'],
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<Invoice> {
  try {
    const items = data.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = data.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatPercent = data.vatPercent ?? invoiceConfig.defaultVatPercent;
    const vatAmount = afterDiscount * vatPercent / 100;
    const total = afterDiscount + vatAmount;

    const dueDate = data.dueDate ? new Date(data.dueDate) : 
      new Date(Date.now() + invoiceConfig.defaultPaymentDays * 24 * 60 * 60 * 1000);

    const newInvoice = await invoiceApi.create({
      customerId: data.customerId,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      vatPercent,
      vatAmount,
      total,
      dueDate,
      notes: data.notes,
      quoteId: data.quoteId,
      quoteNumber: data.quoteNumber,
    });

    setInvoices(prev => [newInvoice, ...prev]);
    
    // If created from quote, update quotes list
    if (data.quoteId) {
      setQuotes(prev => prev.map(q => 
        q.id === data.quoteId 
          ? { ...q, invoiceId: newInvoice.id, status: 'ACCEPTED' as QuoteStatus }
          : q
      ));
    }

    return newInvoice;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to create invoice');
    throw err;
  }
}

export async function updateInvoiceRecord(
  id: string,
  data: Partial<Invoice>,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedInvoice = await invoiceApi.update(id, data);
    setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update invoice');
    throw err;
  }
}

export async function addInvoicePaymentRecord(
  invoiceId: string,
  payment: Omit<InvoicePayment, 'id'>,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedInvoice = await invoiceApi.addPayment(invoiceId, {
      amount: payment.amount,
      method: payment.method,
      notes: payment.notes,
      paidAt: new Date(payment.date),
    });
    
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));
    
    // Reload customers to update stats
    const customersData = await customerApi.getAll();
    setCustomers(customersData);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to add payment');
    throw err;
  }
}

export async function updateInvoiceStatusRecord(
  id: string,
  status: InvoiceStatus,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedInvoice = await invoiceApi.update(id, { status });
    setInvoices(prev => prev.map(inv => inv.id === id ? updatedInvoice : inv));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update invoice status');
    throw err;
  }
}

export async function deleteInvoiceRecord(
  id: string,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    await invoiceApi.delete(id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete invoice');
    throw err;
  }
}

export async function convertQuoteToInvoiceRecord(
  quoteId: string,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<Invoice | null> {
  try {
    const newInvoice = await quoteApi.convertToInvoice(quoteId);
    
    // Update local state
    setInvoices(prev => [newInvoice, ...prev]);
    setQuotes(prev => prev.map(q => 
      q.id === quoteId 
        ? { ...q, invoiceId: newInvoice.id, status: 'accepted' as QuoteStatus }
        : q
    ));
    
    return newInvoice;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to convert quote to invoice');
    return null;
  }
}
