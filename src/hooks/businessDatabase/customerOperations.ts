import React from 'react';
import { Customer, Quote, Invoice, generateId } from '../../types/business';

export function addCustomerRecord(
  data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
): Customer {
  const now = new Date().toISOString();
  const newCustomer: Customer = {
    ...data,
    id: generateId(),
    totalOrders: 0,
    totalSpent: 0,
    createdAt: now,
    updatedAt: now
  };
  setCustomers((prev) => [newCustomer, ...prev]);
  return newCustomer;
}

export function updateCustomerRecord(
  id: string,
  data: Partial<Customer>,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
): void {
  setCustomers((prev) =>
    prev.map((c) =>
      c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
    )
  );
}

export function deleteCustomerRecord(
  id: string,
  quotes: Quote[],
  invoices: Invoice[],
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
): boolean {
  const hasQuotes = quotes.some((q) => q.customerId === id);
  const hasInvoices = invoices.some((i) => i.customerId === id);
  if (hasQuotes || hasInvoices) {
    return false; // Cannot delete
  }
  setCustomers((prev) => prev.filter((c) => c.id !== id));
  return true;
}

export function updateCustomerStatsRecord(
  customerId: string,
  orderAmount: number,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
): void {
  setCustomers((prev) =>
    prev.map((c) =>
      c.id === customerId
        ? {
            ...c,
            totalOrders: c.totalOrders + 1,
            totalSpent: c.totalSpent + orderAmount,
            updatedAt: new Date().toISOString()
          }
        : c
    )
  );
}
