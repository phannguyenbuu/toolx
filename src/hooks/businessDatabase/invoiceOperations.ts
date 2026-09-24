import React from 'react';
import {
  Customer,
  Quote,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  InvoiceStatus,
  QuoteStatus,
  BusinessConfig,
  generateId
} from '../../types/business';

export function generateInvoiceNumberHelper(
  config: BusinessConfig,
  setConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>
): string {
  const year = new Date().getFullYear();
  const number = String(config.invoice.nextNumber).padStart(4, '0');
  setConfig((prev) => ({
    ...prev,
    invoice: { ...prev.invoice, nextNumber: prev.invoice.nextNumber + 1 }
  }));
  return `${config.invoice.numberPrefix}-${year}-${number}`;
}

export function addInvoiceRecord(
  data: {
    customerId: string;
    items: Omit<InvoiceItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    dueDate?: string;
    notes?: string;
    quoteId?: string;
    quoteNumber?: string;
  },
  customers: Customer[],
  config: BusinessConfig,
  generateInvoiceNumber: () => string,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>
): Invoice {
  const customer = customers.find((c) => c.id === data.customerId);
  if (!customer) throw new Error('Customer not found');

  const now = new Date().toISOString();
  const items: InvoiceItem[] = data.items.map((item) => ({
    ...item,
    id: generateId(),
    total: item.quantity * item.unitPrice
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountPercent = data.discountPercent || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatPercent = data.vatPercent ?? config.invoice.defaultVatPercent;
  const vatAmount = (afterDiscount * vatPercent) / 100;
  const total = afterDiscount + vatAmount;

  const dueDate =
    data.dueDate ||
    new Date(
      Date.now() + config.invoice.defaultPaymentDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];

  const newInvoice: Invoice = {
    id: generateId(),
    invoiceNumber: generateInvoiceNumber(),
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    customerTaxCode: customer.taxCode,
    items,
    subtotal,
    discountPercent,
    discountAmount,
    vatPercent,
    vatAmount,
    total,
    payments: [],
    paidAmount: 0,
    remainingAmount: total,
    status: 'UNPAID',
    createdAt: now,
    dueDate,
    notes: data.notes,
    quoteId: data.quoteId,
    quoteNumber: data.quoteNumber
  };

  setInvoices((prev) => [newInvoice, ...prev]);

  if (data.quoteId) {
    setQuotes((prev) =>
      prev.map((q) =>
        q.id === data.quoteId
          ? { ...q, invoiceId: newInvoice.id, status: 'ACCEPTED' as QuoteStatus }
          : q
      )
    );
  }

  return newInvoice;
}

export function updateInvoiceRecord(
  id: string,
  data: Partial<Invoice>,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
): void {
  setInvoices((prev) =>
    prev.map((inv) => {
      if (inv.id !== id) return inv;

      let updated = { ...inv, ...data };
      if (data.items) {
        const items = data.items.map((item) => ({
          ...item,
          total: item.quantity * item.unitPrice
        }));
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const discountAmount = (subtotal * updated.discountPercent) / 100;
        const afterDiscount = subtotal - discountAmount;
        const vatAmount = (afterDiscount * updated.vatPercent) / 100;
        const total = afterDiscount + vatAmount;
        const remainingAmount = total - updated.paidAmount;
        updated = {
          ...updated,
          items,
          subtotal,
          discountAmount,
          vatAmount,
          total,
          remainingAmount
        };
      }
      return updated;
    })
  );
}

export function addPaymentRecord(
  invoiceId: string,
  payment: Omit<InvoicePayment, 'id'>,
  customers: Customer[],
  updateCustomerStats: (customerId: string, orderAmount: number) => void,
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>
): void {
  setInvoices((prev) =>
    prev.map((inv) => {
      if (inv.id !== invoiceId) return inv;

      const newPayment: InvoicePayment = {
        ...payment,
        id: generateId()
      };

      const payments = [...inv.payments, newPayment];
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = inv.total - paidAmount;

      let status: InvoiceStatus = inv.status;
      if (paidAmount >= inv.total) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      }

      const updates: Partial<Invoice> = {
        payments,
        paidAmount,
        remainingAmount,
        status
      };

      if (status === 'PAID') {
        updates.paidAt = new Date().toISOString();
        const customer = customers.find((c) => c.id === inv.customerId);
        if (customer) {
          updateCustomerStats(inv.customerId, inv.total);
        }
      }

      return { ...inv, ...updates };
    })
  );
}

export function convertQuoteToInvoiceRecord(
  quoteId: string,
  quotes: Quote[],
  addInvoice: (data: any) => Invoice
): Invoice | null {
  const quote = quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  if (quote.invoiceId) return null; // Already converted

  const invoiceItems: Omit<InvoiceItem, 'id'>[] = quote.items.map((item) => ({
    description: item.description,
    specifications: item.specifications,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total,
    notes: item.notes
  }));

  return addInvoice({
    customerId: quote.customerId,
    items: invoiceItems,
    discountPercent: quote.discountPercent,
    vatPercent: quote.vatPercent,
    notes: quote.notes,
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber
  });
}
