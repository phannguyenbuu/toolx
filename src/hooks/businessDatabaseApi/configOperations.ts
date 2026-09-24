import React from 'react';
import { BusinessConfig } from '../../types/business';
import { businessConfigApi } from '../../services/businessApi';
import { transformBackendToFrontend } from './configTransformer';

export async function updateConfigRecord(
  data: Partial<BusinessConfig>,
  setConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedConfig = await businessConfigApi.update(data);
    setConfig(updatedConfig);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update config');
    throw err;
  }
}

export async function updateCompanyInfoRecord(
  data: Partial<BusinessConfig['company']>,
  currentCompany: BusinessConfig['company'],
  setConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    const updatedConfig = await businessConfigApi.update({
      company: { ...currentCompany, ...data }
    });
    setConfig(updatedConfig);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update company info');
    throw err;
  }
}

export async function updateQuoteConfigRecord(
  data: Partial<BusinessConfig['quote']>,
  setConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    // Transform to backend format
    const backendData: any = {};
    if (data.header !== undefined) backendData.quoteHeader = data.header;
    if (data.footer !== undefined) backendData.quoteFooter = data.footer;
    if (data.defaultVatPercent !== undefined) backendData.defaultVatPercent = data.defaultVatPercent;
    if (data.defaultValidityDays !== undefined) backendData.defaultValidityDays = data.defaultValidityDays;
    if (data.defaultPaymentDays !== undefined) backendData.defaultPaymentDays = data.defaultPaymentDays;
    if (data.numberPrefix !== undefined) backendData.quoteNumberPrefix = data.numberPrefix;
    if (data.nextNumber !== undefined) backendData.quoteNextNumber = data.nextNumber;
    
    const updatedConfig = await businessConfigApi.update(backendData);
    
    // Transform back to frontend format
    const frontendConfig = transformBackendToFrontend(updatedConfig);
    setConfig(frontendConfig);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update quote config');
    throw err;
  }
}

export async function updateInvoiceConfigRecord(
  data: Partial<BusinessConfig['invoice']>,
  setConfig: React.Dispatch<React.SetStateAction<BusinessConfig>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    // Transform to backend format
    const backendData: any = {};
    if (data.header !== undefined) backendData.invoiceHeader = data.header;
    if (data.footer !== undefined) backendData.invoiceFooter = data.footer;
    if (data.defaultVatPercent !== undefined) backendData.defaultVatPercent = data.defaultVatPercent;
    if (data.defaultValidityDays !== undefined) backendData.defaultValidityDays = data.defaultValidityDays;
    if (data.defaultPaymentDays !== undefined) backendData.defaultPaymentDays = data.defaultPaymentDays;
    if (data.numberPrefix !== undefined) backendData.invoiceNumberPrefix = data.numberPrefix;
    if (data.nextNumber !== undefined) backendData.invoiceNextNumber = data.nextNumber;
    
    const updatedConfig = await businessConfigApi.update(backendData);
    
    // Transform back to frontend format
    const frontendConfig = transformBackendToFrontend(updatedConfig);
    setConfig(frontendConfig);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to update invoice config');
    throw err;
  }
}
