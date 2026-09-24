import { useState, useEffect, useCallback } from 'react';
import { useGlobalAddressData } from '../../../../hooks/useGlobalAddressData';
import { useBusinessDatabase } from '../../../../hooks/useBusinessDatabaseApi';
import { businessConfigApi } from '../../../../services/businessApi';
import { BusinessInfo, DocumentConfig, DisplaySettings, defaultDisplaySettings, SingleDocConfig } from '../types';

interface UseBusinessTabParams {
  businessInfo: BusinessInfo;
  onSave: (info: BusinessInfo) => void;
}

export const useBusinessTab = ({ businessInfo, onSave }: UseBusinessTabParams) => {
  const addressData = useGlobalAddressData();
  const { config: dbConfig, updateQuoteConfig, updateInvoiceConfig } = useBusinessDatabase();

  const [editData, setEditData] = useState<BusinessInfo>({
    ...businessInfo,
    equipment: businessInfo.equipment || [],
    taxPercent: businessInfo.taxPercent || 10,
  });

  const [selectedCountry, setSelectedCountry] = useState<string>('VN');
  const [selectedState, setSelectedState] = useState<string>('');
  const [documentConfig, setDocumentConfig] = useState<DocumentConfig>({
    quote: { header: '', footer: '', headerImage: undefined, footerImage: undefined },
    invoice: { header: '', footer: '', headerImage: undefined, footerImage: undefined },
  });
  const [newEquipment, setNewEquipment] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<'info' | 'document'>('info');
  const [previewType, setPreviewType] = useState<'quote' | 'invoice'>('quote');
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(defaultDisplaySettings);
  const [editMode, setEditMode] = useState<'visual' | 'html'>('visual');

  const currentDocConfig = documentConfig[previewType];

  // Load document config from database
  useEffect(() => {
    if (dbConfig) {
      setDocumentConfig({
        quote: {
          header: dbConfig.quote?.header || '',
          footer: dbConfig.quote?.footer || '',
          headerImage: undefined,
          footerImage: undefined,
        },
        invoice: {
          header: dbConfig.invoice?.header || '',
          footer: dbConfig.invoice?.footer || '',
          headerImage: undefined,
          footerImage: undefined,
        },
      });
    }
  }, [dbConfig]);

  useEffect(() => {
    setEditData({
      ...businessInfo,
      equipment: businessInfo.equipment || [],
      taxPercent: businessInfo.taxPercent || 10,
    });
  }, [businessInfo]);

  // Load business info from database config
  useEffect(() => {
    if (dbConfig && dbConfig.company) {
      setEditData(prev => ({
        ...prev,
        name: dbConfig.company.name || prev.name,
        address: dbConfig.company.address?.split(',')[0]?.trim() || prev.address,
        phone: dbConfig.company.phone || prev.phone,
        email: dbConfig.company.email || prev.email,
        taxCode: dbConfig.company.taxCode || prev.taxCode,
        website: dbConfig.company.website || prev.website,
        bankAccount: dbConfig.company.bankAccount || prev.bankAccount,
        bankName: dbConfig.company.bankName || prev.bankName,
        bankBranch: dbConfig.company.bankBranch || prev.bankBranch,
        logo: dbConfig.company.logo || prev.logo,
        taxPercent: dbConfig.quote?.defaultVatPercent || prev.taxPercent || 10,
      }));
    }
  }, [dbConfig]);

  // Handle image upload
  const handleImageUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'logo' | 'headerImage' | 'footerImage'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Ảnh không được vượt quá 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'logo') {
          setEditData(prev => ({ ...prev, logo: reader.result as string }));
        } else {
          setDocumentConfig(prev => ({
            ...prev,
            [previewType]: { ...prev[previewType], [type]: reader.result as string }
          }));
        }
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  }, [previewType]);

  const removeImage = useCallback((type: 'logo' | 'headerImage' | 'footerImage') => {
    if (type === 'logo') {
      setEditData(prev => ({ ...prev, logo: undefined }));
    } else {
      setDocumentConfig(prev => ({
        ...prev,
        [previewType]: { ...prev[previewType], [type]: undefined }
      }));
    }
    setHasChanges(true);
  }, [previewType]);

  const addEquipment = useCallback(() => {
    if (newEquipment.trim()) {
      setEditData(prev => ({ ...prev, equipment: [...(prev.equipment || []), newEquipment.trim()] }));
      setNewEquipment('');
      setHasChanges(true);
    }
  }, [newEquipment]);

  const removeEquipment = useCallback((idx: number) => {
    setEditData(prev => ({ ...prev, equipment: (prev.equipment || []).filter((_, i) => i !== idx) }));
    setHasChanges(true);
  }, []);

  const handleFieldChange = useCallback((field: keyof BusinessInfo, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleDocumentChange = useCallback((field: keyof SingleDocConfig, value: string) => {
    setDocumentConfig(prev => ({
      ...prev,
      [previewType]: { ...prev[previewType], [field]: value }
    }));
    setHasChanges(true);
  }, [previewType]);

  const handleDisplaySettingChange = useCallback((field: keyof DisplaySettings) => {
    setDisplaySettings(prev => ({ ...prev, [field]: !prev[field] }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await Promise.all([
        businessConfigApi.update({
          businessName: editData.name,
          businessAddress: `${editData.address}, ${editData.commune}, ${editData.province}`,
          businessPhone: editData.phone,
          businessEmail: editData.email,
          businessTaxCode: editData.taxCode,
          businessWebsite: editData.website,
          bankAccount: editData.bankAccount,
          bankName: editData.bankName,
          bankBranch: editData.bankBranch,
          equipment: editData.equipment,
          defaultVatPercent: editData.taxPercent,
        } as any),
        updateQuoteConfig({
          header: documentConfig.quote.header,
          footer: documentConfig.quote.footer,
          defaultVatPercent: editData.taxPercent,
        }),
        updateInvoiceConfig({
          header: documentConfig.invoice.header,
          footer: documentConfig.invoice.footer,
          defaultVatPercent: editData.taxPercent,
        }),
      ]);

      onSave(editData);
      setHasChanges(false);
      alert('Đã lưu thông tin thành công!');
    } catch (e) {
      console.error('Error saving:', e);
      alert('Có lỗi xảy ra khi lưu thông tin!');
    }
  }, [editData, documentConfig, updateQuoteConfig, updateInvoiceConfig, onSave]);

  return {
    addressData,
    editData,
    selectedCountry,
    setSelectedCountry,
    selectedState,
    setSelectedState,
    documentConfig,
    currentDocConfig,
    newEquipment,
    setNewEquipment,
    hasChanges,
    activeSection,
    setActiveSection,
    previewType,
    setPreviewType,
    displaySettings,
    editMode,
    setEditMode,
    handleImageUpload,
    removeImage,
    addEquipment,
    removeEquipment,
    handleFieldChange,
    handleDocumentChange,
    handleDisplaySettingChange,
    handleSave,
  };
};
