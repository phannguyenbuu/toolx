import { BusinessConfig, DEFAULT_BUSINESS_CONFIG } from '../../types/business';

// Helper function to transform backend config to frontend format
export const transformBackendToFrontend = (backendConfig: any): BusinessConfig => {
  return {
    company: {
      name: backendConfig.businessName || DEFAULT_BUSINESS_CONFIG.company.name,
      address: backendConfig.businessAddress || DEFAULT_BUSINESS_CONFIG.company.address,
      phone: backendConfig.businessPhone || DEFAULT_BUSINESS_CONFIG.company.phone,
      email: backendConfig.businessEmail || DEFAULT_BUSINESS_CONFIG.company.email,
      website: backendConfig.businessWebsite || '',
      taxCode: backendConfig.businessTaxCode || '',
      bankAccount: backendConfig.bankAccount || '',
      bankName: backendConfig.bankName || '',
      bankBranch: backendConfig.bankBranch || '',
      logo: backendConfig.businessLogoUrl || '',
    },
    quote: {
      header: backendConfig.quoteHeader || DEFAULT_BUSINESS_CONFIG.quote.header,
      footer: backendConfig.quoteFooter || DEFAULT_BUSINESS_CONFIG.quote.footer,
      defaultVatPercent: backendConfig.defaultVatPercent || DEFAULT_BUSINESS_CONFIG.quote.defaultVatPercent,
      defaultValidityDays: backendConfig.defaultValidityDays || DEFAULT_BUSINESS_CONFIG.quote.defaultValidityDays,
      defaultPaymentDays: backendConfig.defaultPaymentDays || DEFAULT_BUSINESS_CONFIG.quote.defaultPaymentDays,
      numberPrefix: backendConfig.quoteNumberPrefix || DEFAULT_BUSINESS_CONFIG.quote.numberPrefix,
      nextNumber: backendConfig.quoteNextNumber || DEFAULT_BUSINESS_CONFIG.quote.nextNumber,
    },
    invoice: {
      header: backendConfig.invoiceHeader || DEFAULT_BUSINESS_CONFIG.invoice.header,
      footer: backendConfig.invoiceFooter || DEFAULT_BUSINESS_CONFIG.invoice.footer,
      defaultVatPercent: backendConfig.defaultVatPercent || DEFAULT_BUSINESS_CONFIG.invoice.defaultVatPercent,
      defaultValidityDays: backendConfig.defaultValidityDays || DEFAULT_BUSINESS_CONFIG.invoice.defaultValidityDays,
      defaultPaymentDays: backendConfig.defaultPaymentDays || DEFAULT_BUSINESS_CONFIG.invoice.defaultPaymentDays,
      numberPrefix: backendConfig.invoiceNumberPrefix || DEFAULT_BUSINESS_CONFIG.invoice.numberPrefix,
      nextNumber: backendConfig.invoiceNextNumber || DEFAULT_BUSINESS_CONFIG.invoice.nextNumber,
    },
  };
};
