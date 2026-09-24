import React from 'react';
import { Save } from 'lucide-react';
import { BusinessTabProps } from './types';
import { useBusinessTab } from './hooks/useBusinessTab';
import { BusinessLogoCard } from './components/BusinessLogoCard';
import { BusinessBasicInfoCard } from './components/BusinessBasicInfoCard';
import { BusinessBankCard } from './components/BusinessBankCard';
import { BusinessCapacityCard } from './components/BusinessCapacityCard';
import { DocumentEditorPanel } from './components/DocumentEditorPanel';
import { DocumentPreviewPanel } from './components/DocumentPreviewPanel';

export const BusinessTab: React.FC<BusinessTabProps> = ({ businessInfo, onSave }) => {
  const {
    addressData,
    editData,
    selectedCountry,
    setSelectedCountry,
    selectedState,
    setSelectedState,
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
  } = useBusinessTab({ businessInfo, onSave });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Thông tin xưởng in</h2>
          <p className="text-sm text-gray-500">Quản lý thông tin doanh nghiệp và mẫu báo giá/hóa đơn</p>
        </div>
        {hasChanges && (
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Save size={18} />
            Lưu thay đổi
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveSection('info')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeSection === 'info'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Thông tin cơ bản
        </button>
        <button
          onClick={() => setActiveSection('document')}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            activeSection === 'document'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Header & Footer (Báo giá/Hóa đơn)
        </button>
      </div>

      {/* Content */}
      {activeSection === 'info' && (
        <div className="space-y-6">
          <BusinessLogoCard
            logo={editData.logo}
            onUpload={handleImageUpload}
            onRemove={removeImage}
          />

          <BusinessBasicInfoCard
            editData={editData}
            selectedCountry={selectedCountry}
            selectedState={selectedState}
            addressData={addressData}
            onCountryChange={(code) => {
              setSelectedCountry(code);
              setSelectedState('');
              handleFieldChange('province', '');
              handleFieldChange('commune', '');
            }}
            onStateChange={(code, name) => {
              setSelectedState(code);
              handleFieldChange('province', name);
              handleFieldChange('commune', '');
            }}
            onChange={handleFieldChange}
          />

          <BusinessBankCard
            bankAccount={editData.bankAccount}
            bankName={editData.bankName}
            bankBranch={editData.bankBranch}
            onChange={handleFieldChange}
          />

          <BusinessCapacityCard
            printingCapacity={editData.printingCapacity}
            equipment={editData.equipment}
            newEquipment={newEquipment}
            setNewEquipment={setNewEquipment}
            addEquipment={addEquipment}
            removeEquipment={removeEquipment}
            onCapacityChange={(val) => handleFieldChange('printingCapacity', val)}
          />
        </div>
      )}

      {activeSection === 'document' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentEditorPanel
            previewType={previewType}
            setPreviewType={setPreviewType}
            currentDocConfig={currentDocConfig}
            editMode={editMode}
            setEditMode={setEditMode}
            displaySettings={displaySettings}
            onImageUpload={handleImageUpload}
            onRemoveImage={removeImage}
            onDocumentChange={handleDocumentChange}
            onDisplaySettingChange={handleDisplaySettingChange}
          />

          <DocumentPreviewPanel
            previewType={previewType}
            setPreviewType={setPreviewType}
            editData={editData}
            currentDocConfig={currentDocConfig}
            displaySettings={displaySettings}
          />
        </div>
      )}

      {/* Save Button (sticky) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <button 
            onClick={handleSave}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg"
          >
            <Save size={20} />
            Lưu tất cả thay đổi
          </button>
        </div>
      )}
    </div>
  );
};
