import type { BusinessInfo } from '../types';
export type { BusinessInfo };

export interface BusinessTabProps {
  businessInfo: BusinessInfo;
  onSave: (info: BusinessInfo) => void;
}

export interface SingleDocConfig {
  header: string;
  footer: string;
  headerImage?: string;
  footerImage?: string;
}

export interface DocumentConfig {
  quote: SingleDocConfig;
  invoice: SingleDocConfig;
}

export interface DisplaySettings {
  showCustomerName: boolean;
  showCustomerEmail: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showCustomerTaxCode: boolean;
  showDocumentNumber: boolean;
  showDocumentDate: boolean;
  showValidUntil: boolean;
  showPaymentInfo: boolean;
  showSignature: boolean;
}

export const defaultDisplaySettings: DisplaySettings = {
  showCustomerName: true,
  showCustomerEmail: true,
  showCustomerPhone: true,
  showCustomerAddress: true,
  showCustomerTaxCode: false,
  showDocumentNumber: true,
  showDocumentDate: true,
  showValidUntil: true,
  showPaymentInfo: true,
  showSignature: true,
};
