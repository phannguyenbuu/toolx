import React from 'react';
import { DEFAULT_PAPER_DATABASE } from '../../contexts/PrintConfigContext';
import { usePaperPriceManagerState } from './usePaperPriceManagerState';
import { PaperPriceHeader } from './components/PaperPriceHeader';
import { PaperPricesTab } from './components/tabs/PaperPricesTab';
import { PaperSuppliersTab } from './components/tabs/PaperSuppliersTab';
import { PaperConfigTab } from './components/tabs/PaperConfigTab';

export function PaperPriceManager() {
  const {
    paperDatabase,
    setPaperDatabase,
    activeTab,
    setActiveTab,
    filterType,
    setFilterType,
    sortCol,
    handleSort,
    displayPapers,
    paperTypes,
    editingRow,
    setEditingRow,
    editForm,
    setEditForm,
    saveEdit,
    deletePaper,
    showAddPaper,
    setShowAddPaper,
    addForm,
    setAddForm,
    addPaper,
    showImport,
    setShowImport,
    importMode,
    setImportMode,
    sheetUrl,
    setSheetUrl,
    importLoading,
    handleFileImport,
    handleSheetImport,
    suppliers,
    showAddSupplier,
    setShowAddSupplier,
    supplierInput,
    setSupplierInput,
    syncingId,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    syncSupplier,
    persistSuppliers,
    managerConfig,
    updateConfig,
    myProfile,
    updateProfile
  } = usePaperPriceManagerState();

  const handleResetPaperDatabase = () => {
    if (window.confirm('Reset bảng giá về mặc định?')) {
      setPaperDatabase(DEFAULT_PAPER_DATABASE);
    }
  };

  const handleClearAllSuppliers = () => {
    if (window.confirm('Xóa tất cả NCC?')) {
      persistSuppliers([]);
    }
  };

  return (
    <div className="h-full bg-slate-100 font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <PaperPriceHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        suppliers={suppliers}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* TAB 1: BẢNG GIÁ */}
          {activeTab === 'prices' && (
            <PaperPricesTab
              paperDatabase={paperDatabase}
              paperTypes={paperTypes}
              filterType={filterType}
              setFilterType={setFilterType}
              displayPapers={displayPapers}
              sortCol={sortCol}
              handleSort={handleSort}
              editingRow={editingRow}
              setEditingRow={setEditingRow}
              editForm={editForm}
              setEditForm={setEditForm}
              saveEdit={saveEdit}
              deletePaper={deletePaper}
              onReset={handleResetPaperDatabase}
              showAddPaper={showAddPaper}
              setShowAddPaper={setShowAddPaper}
              addForm={addForm}
              setAddForm={setAddForm}
              addPaper={addPaper}
              showImport={showImport}
              setShowImport={setShowImport}
              importMode={importMode}
              setImportMode={setImportMode}
              sheetUrl={sheetUrl}
              setSheetUrl={setSheetUrl}
              importLoading={importLoading}
              handleFileImport={handleFileImport}
              handleSheetImport={handleSheetImport}
            />
          )}

          {/* TAB 2: NHÀ CUNG CẤP */}
          {activeTab === 'suppliers' && (
            <PaperSuppliersTab
              suppliers={suppliers}
              showAddSupplier={showAddSupplier}
              setShowAddSupplier={setShowAddSupplier}
              supplierInput={supplierInput}
              setSupplierInput={setSupplierInput}
              syncingId={syncingId}
              addSupplier={addSupplier}
              updateSupplier={updateSupplier}
              deleteSupplier={deleteSupplier}
              syncSupplier={syncSupplier}
            />
          )}

          {/* TAB 3: CẤU HÌNH */}
          {activeTab === 'config' && (
            <PaperConfigTab
              myProfile={myProfile}
              updateProfile={updateProfile}
              managerConfig={managerConfig}
              updateConfig={updateConfig}
              paperDatabaseLength={paperDatabase.length}
              suppliersCount={suppliers.length}
              supplierPaperPricesCount={suppliers.reduce((s, sup) => s + sup.papers.length, 0)}
              paperGroupsCount={paperTypes.length}
              onResetDatabase={handleResetPaperDatabase}
              onClearSuppliers={handleClearAllSuppliers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default PaperPriceManager;
