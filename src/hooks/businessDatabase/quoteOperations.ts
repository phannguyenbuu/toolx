import React from 'react';
import {
  Customer,
  Quote,
  QuoteItem,
  QuoteStatus,
  BusinessConfig,
  generateId
} from '../../types/business';

export function generateQuoteNumberHelper(
  config: BusinessConfig,
  setConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>
): string {
  const year = new Date().getFullYear();
  const number = String(config.quote.nextNumber).padStart(4, '0');
  setConfig((prev) => ({
    ...prev,
    quote: { ...prev.quote, nextNumber: prev.quote.nextNumber + 1 }
  }));
  return `${config.quote.numberPrefix}-${year}-${number}`;
}

export function addQuoteRecord(
  data: {
    customerId: string;
    items: Omit<QuoteItem, 'id'>[];
    discountPercent?: number;
    vatPercent?: number;
    validUntil?: string;
    notes?: string;
  },
  customers: Customer[],
  config: BusinessConfig,
  generateQuoteNumber: () => string,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>
): Quote {
  const customer = customers.find((c) => c.id === data.customerId);
  if (!customer) throw new Error('Customer not found');

  const now = new Date().toISOString();
  const items: QuoteItem[] = data.items.map((item) => ({
    ...item,
    id: generateId(),
    total: item.quantity * item.unitPrice
  }));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountPercent = data.discountPercent || 0;
  const discountAmount = (subtotal * discountPercent) / 100;
  const afterDiscount = subtotal - discountAmount;
  const vatPercent = data.vatPercent ?? config.quote.defaultVatPercent;
  const vatAmount = (afterDiscount * vatPercent) / 100;
  const total = afterDiscount + vatAmount;

  const validUntil =
    data.validUntil ||
    new Date(
      Date.now() + config.quote.defaultValidityDays * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .split('T')[0];

  const newQuote: Quote = {
    id: generateId(),
    quoteNumber: generateQuoteNumber(),
    customerId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    items,
    subtotal,
    discountPercent,
    discountAmount,
    vatPercent,
    vatAmount,
    total,
    status: 'DRAFT',
    createdAt: now,
    validUntil,
    notes: data.notes
  };

  setQuotes((prev) => [newQuote, ...prev]);
  return newQuote;
}

export function updateQuoteRecord(
  id: string,
  data: Partial<Quote>,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>
): void {
  setQuotes((prev) =>
    prev.map((q) => {
      if (q.id !== id) return q;

      let updated = { ...q, ...data };
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
        updated = { ...updated, items, subtotal, discountAmount, vatAmount, total };
      }
      return updated;
    })
  );
}

export function updateQuoteStatusRecord(
  id: string,
  status: QuoteStatus,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>
): void {
  const now = new Date().toISOString();
  setQuotes((prev) =>
    prev.map((q) => {
      if (q.id !== id) return q;
      const updates: Partial<Quote> = { status };
      if (status === 'SENT') updates.sentAt = now;
      if (status === 'ACCEPTED') updates.acceptedAt = now;
      return { ...q, ...updates };
    })
  );
}

export function deleteQuoteRecord(
  id: string,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>
): void {
  setQuotes((prev) => prev.filter((q) => q.id !== id));
}
