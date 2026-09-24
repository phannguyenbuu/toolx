import React, { useState } from 'react';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import { usePrintConfig } from '../contexts/PrintConfigContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useBusinessDatabase } from '../hooks/useBusinessDatabaseApi';

import {
  PriceCalculatorOffsetProps,
  InputState,
  CustomPaper,
  FinishingItem,
  CalcOption,
  ImportState
} from './priceCalculatorOffset/types';
import { getQuoteText } from './priceCalculatorOffset/helpers';
import { useOffsetCalculations } from './priceCalculatorOffset/hooks/useOffsetCalculations';
import { useOffsetMachineForm } from './priceCalculatorOffset/hooks/useOffsetMachineForm';

import { OffsetCalcHeader } from './priceCalculatorOffset/components/OffsetCalcHeader';
import { OffsetInputPanel } from './priceCalculatorOffset/components/OffsetInputPanel';
import { OffsetResultsPanel } from './priceCalculatorOffset/components/OffsetResultsPanel';
import { OffsetGeneralConfig } from './priceCalculatorOffset/components/OffsetGeneralConfig';
import { OffsetMachinesConfig } from './priceCalculatorOffset/components/OffsetMachinesConfig';

import { CutAnimationModal } from './priceCalculatorOffset/modals/CutAnimationModal';
import { PaperImportModal } from './priceCalculatorOffset/modals/PaperImportModal';
import { CreateOrderModal } from './priceCalculatorOffset/modals/CreateOrderModal';

export function PriceCalculatorOffset({
  onClose: _onClose,
  initialTab = 'calc'
}: PriceCalculatorOffsetProps) {
  const printConfig = usePrintConfig();
  const { setCurrentPage } = useAppNavigation();
  const { customers } = useBusinessDatabase();

  const [activeTab, setActiveTab] = useState<'calc' | 'machines'>(initialTab);
  const machines = printConfig.offsetMachines;
  const setMachines = printConfig.setOffsetMachines;
  const paperDatabase = printConfig.paperDatabase;
  const setPaperDatabase = printConfig.setPaperDatabase;
  const config = printConfig.config;
  const setConfig = printConfig.setConfig;
  const digitalConfig = printConfig.digitalConfig;

  const [createOrderOpt, setCreateOrderOpt] = useState<CalcOption | null>(null);
  const [orderCustomerName, setOrderCustomerName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ paperW: 0, paperH: 0, cutX: 1, cutY: 1 });

  const [importState, setImportState] = useState<ImportState>({
    isOpen: false,
    step: 'input',
    source: null,
    rawData: [],
    headers: [],
    mapping: { type: '', size: '', gsm: '', price: '' },
    googleSheetUrl: '',
    isLoading: false,
    error: ''
  });

  const [inputs, setInputs] = useState<InputState>({
    width: '210',
    height: '297',
    quantity: '1000',
    printColors: 'auto',
    printSides: 1,
    symmetryMode: 'auto',
    lamination: 'none',
    selectedMachine: 'auto',
    selectedPaperType: 'Couche',
    selectedGSM: 150,
    useBleed: false,
    bleedMargin: '2',
    gripperMargin: 15
  });

  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customPaper, setCustomPaper] = useState<CustomPaper>({
    name: 'Giấy riêng',
    width: '650',
    height: '860',
    price: '5000',
    gsm: '200'
  });
  const [extraFinishings, setExtraFinishings] = useState<FinishingItem[]>([]);

  // Calculation Web Worker
  const {
    options: topOptions,
    suggestion,
    isCalculating,
    isCalculatingSuggestion
  } = usePriceCalculator({
    width: parseFloat(inputs.width) || 0,
    height: parseFloat(inputs.height) || 0,
    quantity: parseFloat(inputs.quantity) || 0,
    inputs,
    machines,
    paperDatabase,
    config,
    extraFinishings,
    isCustomPaper,
    customPaper: isCustomPaper ? customPaper : null
  });

  // Offset Calculations Hook (debounce, paperTypes, availableGSMs, digital comparison)
  const {
    localInputs,
    handleNumChange,
    paperTypes,
    availableGSMs,
    digitalComparison
  } = useOffsetCalculations({
    paperDatabase,
    inputs,
    setInputs,
    digitalConfig,
    topOptions
  });

  // Machine Form Hook
  const {
    editingMachineId,
    machineForm,
    setMachineForm,
    resetMachineForm,
    addColorPricing,
    removeColorPricing,
    updateColorPricing,
    handleEditMachine,
    handleSaveMachine,
    handleDeleteMachine
  } = useOffsetMachineForm(machines, setMachines);

  // Order creation
  const handleCreateOrder = (opt: CalcOption, customerName = '') => {
    const qty = parseInt(inputs.quantity) || 1;
    const unitPrice = qty > 0 ? Math.round(opt.costs.total / qty) : 0;
    const orderId = `DH-${Date.now().toString(36).toUpperCase()}`;
    const entry = {
      id: Date.now(),
      orderId,
      timestamp: new Date().toLocaleString('vi-VN'),
      type: 'offset' as const,
      inputs: { ...inputs },
      customPaper: isCustomPaper ? { ...customPaper } : null,
      isCustomPaper,
      result: opt,
      finishings: [...extraFinishings],
      quoteText: `[${orderId}]\n${getQuoteText(opt, inputs, extraFinishings)}`,
      status: 'quoting' as const,
      unitPrice,
      customerName,
      notes: ''
    };
    printConfig.addOrder(entry);
    setCurrentPage('orders');
  };

  return (
    <div className="h-full bg-slate-100 font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* Modals */}
      <CutAnimationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        paperW={modalData.paperW}
        paperH={modalData.paperH}
        cutX={modalData.cutX}
        cutY={modalData.cutY}
        maxCutWidth={config.maxCutWidth}
        onUpdateMaxCutWidth={(val) => setConfig({ ...config, maxCutWidth: val })}
      />

      <CreateOrderModal
        createOrderOpt={createOrderOpt}
        onClose={() => {
          setCreateOrderOpt(null);
          setOrderCustomerName('');
        }}
        orderCustomerName={orderCustomerName}
        setOrderCustomerName={setOrderCustomerName}
        customers={customers}
        onConfirm={(opt, customer) => {
          handleCreateOrder(opt, customer);
          setCreateOrderOpt(null);
          setOrderCustomerName('');
        }}
      />

      <PaperImportModal
        importState={importState}
        setImportState={setImportState}
        onImport={(papers) => {
          setPaperDatabase(papers);
          setImportState((prev) => ({ ...prev, isOpen: false, step: 'input' }));
        }}
      />

      {/* Header */}
      <OffsetCalcHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ordersCount={printConfig.orders.length}
        onNavigateOrders={() => setCurrentPage('orders')}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'calc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* INPUTS (4 cols) */}
              <OffsetInputPanel
                inputs={inputs}
                setInputs={setInputs}
                localInputs={localInputs}
                handleNumChange={handleNumChange}
                isCustomPaper={isCustomPaper}
                setIsCustomPaper={setIsCustomPaper}
                customPaper={customPaper}
                setCustomPaper={setCustomPaper}
                paperTypes={paperTypes}
                availableGSMs={availableGSMs}
                machines={machines}
                config={config}
                extraFinishings={extraFinishings}
                setExtraFinishings={setExtraFinishings}
                isCalculatingSuggestion={isCalculatingSuggestion}
                suggestion={suggestion}
              />

              {/* RESULTS (8 cols) */}
              <OffsetResultsPanel
                isCalculating={isCalculating}
                topOptions={topOptions}
                digitalComparison={digitalComparison}
                inputs={inputs}
                extraFinishings={extraFinishings}
                onOpenCutAnimation={(data) => {
                  setModalData(data);
                  setModalOpen(true);
                }}
                onOpenCreateOrder={(opt) => setCreateOrderOpt(opt)}
              />
            </div>
          )}

          {activeTab === 'machines' && (
            <div className="space-y-6">
              <OffsetGeneralConfig
                config={config}
                setConfig={setConfig}
                inputs={inputs}
              />

              <OffsetMachinesConfig
                machines={machines}
                editingMachineId={editingMachineId}
                machineForm={machineForm}
                setMachineForm={setMachineForm}
                onEditMachine={handleEditMachine}
                onDeleteMachine={handleDeleteMachine}
                onSaveMachine={handleSaveMachine}
                onResetMachineForm={resetMachineForm}
                onAddColorPricing={addColorPricing}
                onRemoveColorPricing={removeColorPricing}
                onUpdateColorPricing={updateColorPricing}
                onOpenPaperImport={() =>
                  setImportState((prev) => ({ ...prev, isOpen: true, step: 'input', error: '' }))
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PriceCalculatorOffset;
