import { customerApi } from '../../services/api';
import { Customer } from '../../types/business';
import { UseBusinessDataState } from './types';

export async function createCustomerAction(
  data: Omit<Customer, 'id' | 'totalOrders' | 'totalSpent' | 'createdAt' | 'updatedAt'>,
  currentCustomers: Customer[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Customer> {
  try {
    const newCustomer = await customerApi.createCustomer(data);
    updateState({
      customers: [newCustomer, ...currentCustomers]
    });
    return newCustomer;
  } catch (error) {
    const errorMessage = handleError(error, 'tạo khách hàng');
    throw new Error(errorMessage);
  }
}

export async function updateCustomerAction(
  id: string,
  data: Partial<Customer>,
  currentCustomers: Customer[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<Customer> {
  try {
    const updatedCustomer = await customerApi.updateCustomer(id, data);
    updateState({
      customers: currentCustomers.map((c) => (c.id === id ? updatedCustomer : c))
    });
    return updatedCustomer;
  } catch (error) {
    const errorMessage = handleError(error, 'cập nhật khách hàng');
    throw new Error(errorMessage);
  }
}

export async function deleteCustomerAction(
  id: string,
  currentCustomers: Customer[],
  updateState: (updates: Partial<UseBusinessDataState>) => void,
  handleError: (error: any, type: string) => string
): Promise<void> {
  try {
    await customerApi.deleteCustomer(id);
    updateState({
      customers: currentCustomers.filter((c) => c.id !== id)
    });
  } catch (error) {
    const errorMessage = handleError(error, 'xóa khách hàng');
    throw new Error(errorMessage);
  }
}
