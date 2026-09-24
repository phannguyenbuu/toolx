import { Customer, Quote, Invoice } from '../../types/business';

export function calculateBusinessDatabaseStats(
  customers: Customer[],
  quotes: Quote[],
  invoices: Invoice[]
) {
  const totalCustomers = customers.length;
  const totalQuotes = quotes.length;
  const totalInvoices = invoices.length;

  const quotesByStatus = {
    draft: quotes.filter((q) => q.status === 'DRAFT').length,
    sent: quotes.filter((q) => q.status === 'SENT').length,
    accepted: quotes.filter((q) => q.status === 'ACCEPTED').length,
    rejected: quotes.filter((q) => q.status === 'REJECTED').length
  };

  const invoicesByStatus = {
    unpaid: invoices.filter((i) => i.status === 'UNPAID').length,
    partial: invoices.filter((i) => i.status === 'PARTIAL').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    overdue: invoices.filter((i) => i.status === 'OVERDUE').length
  };

  const totalRevenue = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((sum, i) => sum + i.total, 0);

  const pendingAmount = invoices
    .filter((i) => ['unpaid', 'partial'].includes(i.status))
    .reduce((sum, i) => sum + i.remainingAmount, 0);

  return {
    totalCustomers,
    totalQuotes,
    totalInvoices,
    quotesByStatus,
    invoicesByStatus,
    totalRevenue,
    pendingAmount
  };
}
