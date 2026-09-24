import React from 'react';
import { Quote, QuoteItem, QuoteStatus, BusinessConfig } from '../../types/business';
import { quoteApi } from '../../services/businessApi';

export interface CreateQuoteData {
  customerId: string;
  items: Omit<QuoteItem, 'id'>[];
  discountPercent?: number;
  vatPercent?: number;
  validUntil?: string;
  notes?: string;
}

export async function createQuote(
  data: CreateQuoteData,
  quoteConfig: BusinessConfig['quote'],
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<Quote> {
  try {
    const items = data.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const discountPercent = data.discountPercent || 0;
    const discountAmount = subtotal * discountPercent / 100;
    const afterDiscount = subtotal - discountAmount;
    const vatPercent = data.vatPercent ?? quoteConfig.defaultVatPercent;
    const vatAmount = afterDiscount * vatPercent / 100;
    const total = afterDiscount + vatAmount;

    const validUntil = data.validUntil ? new Date(data.validUntil) : 
      new Date(Date.now() + quoteConfig.defaultValidityDays * 24 * 60 * 60 * 1000);

    const newQuote = await quoteApi.create({
      customerId: data.customerId,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      vatPercent,
      vatAmount,
      total,
      validUntil,
      notes: data.notes,
    });

    setQuotes(prev => [newQuote, ...prev]);
    return newQuote;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to create quote');
    throw err;
  }
}

export async function updateQuoteRecord(
  id: string,
  data: Partial<Quote>,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedQuote = await quoteApi.update(id, data);
    setQuotes(prev => prev.map(q => q.id === id ? updatedQuote : q));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update quote');
    throw err;
  }
}

export async function updateQuoteStatusRecord(
  id: string,
  status: QuoteStatus,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedQuote = await quoteApi.updateStatus(id, status);
    setQuotes(prev => prev.map(q => q.id === id ? updatedQuote : q));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update quote status');
    throw err;
  }
}

export async function deleteQuoteRecord(
  id: string,
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    await quoteApi.delete(id);
    setQuotes(prev => prev.filter(q => q.id !== id));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete quote');
    throw err;
  }
}
