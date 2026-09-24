import React from 'react';
import { Customer } from '../../types/business';
import { customerApi } from '../../services/businessApi';

export async function createCustomer(
  data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<Customer> {
  try {
    const newCustomer = await customerApi.create(data);
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to create customer');
    throw err;
  }
}

export async function updateCustomerRecord(
  id: string,
  data: Partial<Customer>,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedCustomer = await customerApi.update(id, data);
    setCustomers(prev => prev.map(c => c.id === id ? updatedCustomer : c));
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update customer');
    throw err;
  }
}

export async function deleteCustomerRecord(
  id: string,
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<boolean> {
  try {
    await customerApi.delete(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
    return true;
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to delete customer');
    return false;
  }
}
