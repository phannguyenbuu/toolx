import { businessConfigApi as _bca, customerApi as _ca, quoteApi as _qa, invoiceApi as _ia, statsApi as _sa } from './api';

export const businessConfigApi = {
  ..._bca,
  get: _bca.getConfig,
  update: _bca.updateConfig,
};

export const customerApi = {
  ..._ca,
  getAll: (params?: any) => _ca.getCustomers(params).then(r => r.data),
  create: _ca.createCustomer,
  update: _ca.updateCustomer,
  delete: _ca.deleteCustomer,
};

export const quoteApi = {
  ..._qa,
  getAll: (params?: any) => _qa.getQuotes(params).then(r => r.data),
  create: _qa.createQuote,
  update: _qa.updateQuote,
  updateStatus: _qa.updateQuoteStatus,
  delete: _qa.deleteQuote,
  convertToInvoice: _qa.convertToInvoice,
};

export const invoiceApi = {
  ..._ia,
  getAll: (params?: any) => _ia.getInvoices(params).then(r => r.data),
  create: _ia.createInvoice,
  update: _ia.updateInvoice,
  addPayment: _ia.addPayment,
  delete: _ia.deleteInvoice,
};

export const statsApi = {
  ..._sa,
  get: _sa.getBusinessStats,
};
