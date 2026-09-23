import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePriceCalculator } from '../hooks/usePriceCalculator';
import {
  Paper,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption
} from '../utils/calculatorTypes';
import { RefreshCw } from 'lucide-react';
import {
  usePrintConfig,
  DEFAULT_CONFIG,
  DEFAULT_DIGITAL_CONFIG,
  DEFAULT_DIGITAL_MACHINES,
  DEFAULT_PAPER_DATABASE
} from '../contexts/PrintConfigContext';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useBusinessDatabase } from '../hooks/useBusinessDatabaseApi';
import type {
  PriceCalculatorDigitalProps,
  ImportState
} from './priceCalculatorDigital/types';
import {
  getQuoteText,
  useDigitalCalculations,
  useMachineConfigForm,
  DigitalCalcHeader,
  DigitalInputPanel,
  DigitalResultsPanel,
  DigitalGeneralConfig,
  DigitalPreferredPapersConfig,
  DigitalMachinesConfig,
  CutAnimationModal,
  PaperImportModal,
  CreateOrderModal
} from './priceCalculatorDigital/index';

export function PriceCalculatorDigital({
  onClose: _onClose,
  initialTab = 'calc'
}: PriceCalculatorDigitalProps) {
  const printConfig = usePrintConfig();
  const { setCurrentPage } = useAppNavigation();
  const { customers } = useBusinessDatabase();
  const [activeTab, setActiveTab] = useState<'calc' | 'machines'>(initialTab);

  const machines = printConfig.digitalMachines;
  const setMachines = printConfig.setDigitalMachines;
  const paperDatabase = printConfig.paperDatabase;
  const setPaperDatabase = printConfig.setPaperDatabase;
  const config = printConfig.config;
  const setConfig = printConfig.setConfig;
  const digitalConfig = printConfig.digitalConfig;
  const setDigitalConfig = printConfig.setDigitalConfig;
  const offsetMachines = printConfig.offsetMachines;

  // Import paper database state
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

  // Machine form management hook
  const {
    editingMachineId,
    machineForm,
    setMachineForm,
    resetMachineForm,
    addClickRow,
    removeClickRow,
    updateClickRow,
    handleEditMachine,
    handleSaveMachine,
    handleDeleteMachine
  } = useMachineConfigForm({
    machines,
    setMachines,
    digitalConfig
  });

  // Main input parameters
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
    gripperMargin: 0
  });

  // Local state for numeric inputs (debounced 400ms)
  const [localInputs, setLocalInputs] = useState({
    width: '210',
    height: '297',
    quantity: '1000'
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setInputs((prev) => {
        if (
          prev.width === localInputs.width &&
          prev.height === localInputs.height &&
          prev.quantity === localInputs.quantity
        ) {
          return prev;
        }
        return {
          ...prev,
          width: localInputs.width,
          height: localInputs.height,
          quantity: localInputs.quantity
        };
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [localInputs.width, localInputs.height, localInputs.quantity]);

  // Paper & Extra finishings state
  const [isCustomPaper, setIsCustomPaper] = useState(false);
  const [customPaper, setCustomPaper] = useState<CustomPaper>({
    name: 'Giấy riêng',
    width: '650',
    height: '860',
    price: '5000',
    gsm: '200'
  });
  const [extraFinishings, setExtraFinishings] = useState<FinishingItem[]>([]);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ paperW: 0, paperH: 0, cutX: 1, cutY: 1 });
  const [forcePreferred, setForcePreferred] = useState(false);
  const [preferredSizeMode, setPreferredSizeMode] = useState<string>('auto');
  const [preferredAutoSet, setPreferredAutoSet] = useState(false);
  const [createOrderOpt, setCreateOrderOpt] = useState<CalcOption | null>(null);

  // Calculation worker hook
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

  // Digital calculations hook
  const {
    digitalOptions,
    preferredConditionsMet,
    finalOptions,
    offsetComparison
  } = useDigitalCalculations({
    topOptions,
    inputs,
    machines,
    digitalConfig,
    config,
    paperDatabase,
    extraFinishings,
    offsetMachines,
    forcePreferred,
    preferredSizeMode
  });

  // Paper types and available GSM lists
  const paperTypes = useMemo(
    () => Array.from(new Set(paperDatabase.map((p: Paper) => p.type))),
    [paperDatabase]
  );
  const availableGSMs = useMemo(() => {
    const papers = paperDatabase.filter((p: Paper) => p.type === inputs.selectedPaperType);
    return Array.from(new Set(papers.map((p: Paper) => p.gsm))).sort((a: number, b: number) => a - b);
  }, [inputs.selectedPaperType, paperDatabase]);

  // Auto-tick preferred checkbox when conditions met
  useEffect(() => {
    if (preferredConditionsMet && !forcePreferred) {
      setForcePreferred(true);
      setPreferredAutoSet(true);
    } else if (!preferredConditionsMet && preferredAutoSet) {
      setForcePreferred(false);
      setPreferredAutoSet(false);
    }
  }, [preferredConditionsMet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!availableGSMs.includes(inputs.selectedGSM)) {
      setInputs((prev) => ({ ...prev, selectedGSM: availableGSMs[0] || 0 }));
    }
  }, [availableGSMs, inputs.selectedGSM]);

  // Numeric change handler
  const handleNumChange = useCallback((field: keyof InputState, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (field === 'width' || field === 'height' || field === 'quantity') {
        setLocalInputs((prev) => ({ ...prev, [field]: value }));
      } else {
        setInputs((prev) => ({ ...prev, [field]: value }));
      }
    }
  }, []);

  // Finishing handlers
  const handleAddFinishing = useCallback(() => {
    const defaultType = 'Bế Demi';
    const defaultFinishing = config.defaultFinishings.find((f) => f.type === defaultType);
    setExtraFinishings((prev) => [
      ...prev,
      {
        id: Date.now(),
        type: defaultType,
        name: '',
        unit: defaultFinishing?.unit || 'bộ',
        overrideVal: '',
        price: defaultFinishing?.defaultPrice?.toString() || ''
      }
    ]);
  }, [config.defaultFinishings]);

  const updateFinishing = useCallback(
    (id: number, field: string, value: string) => {
      setExtraFinishings((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (field === 'type') {
            const defaultFinishing = config.defaultFinishings.find((f) => f.type === value);
            return {
              ...item,
              type: value,
              unit: defaultFinishing?.unit || item.unit,
              price: defaultFinishing?.defaultPrice?.toString() || item.price
            };
          }
          return { ...item, [field]: value };
        })
      );
    },
    [config.defaultFinishings]
  );

  const removeFinishing = useCallback((id: number) => {
    setExtraFinishings((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // Order creation handler
  const handleCreateOrder = useCallback(
    (opt: CalcOption, customerName = '') => {
      const qty = parseInt(inputs.quantity) || 1;
      const unitPrice = qty > 0 ? Math.round(opt.costs.total / qty) : 0;
      const orderId = `DH-${Date.now().toString(36).toUpperCase()}`;
      const entry = {
        id: Date.now(),
        orderId,
        timestamp: new Date().toLocaleString('vi-VN'),
        type: 'digital' as const,
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
    },
    [inputs, isCustomPaper, customPaper, extraFinishings, printConfig, setCurrentPage]
  );

  return (
    <div className="h-full bg-slate-100 font-sans text-slate-800 flex flex-col overflow-hidden">
      {/* Cut Animation Modal */}
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

      {/* Create Order Dialog */}
      <CreateOrderModal
        orderOpt={createOrderOpt}
        onClose={() => setCreateOrderOpt(null)}
        onConfirm={(customerName) => {
          if (createOrderOpt) handleCreateOrder(createOrderOpt, customerName);
          setCreateOrderOpt(null);
        }}
        customers={customers}
      />

      {/* Paper Import Modal */}
      <PaperImportModal
        importState={importState}
        setImportState={setImportState}
        onImport={(papers) => {
          setPaperDatabase(papers);
          if (papers.length > 0) {
            const firstType = papers[0].type;
            const firstGsm = papers.find((p) => p.type === firstType)?.gsm || 0;
            setInputs((prev) => ({ ...prev, selectedPaperType: firstType, selectedGSM: firstGsm }));
          }
        }}
      />

      {/* Header */}
      <DigitalCalcHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNavigateToOrders={() => setCurrentPage('orders')}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'calc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Input Panel */}
              <DigitalInputPanel
                inputs={inputs}
                setInputs={setInputs}
                localInputs={localInputs}
                handleNumChange={handleNumChange}
                isCalculatingSuggestion={isCalculatingSuggestion}
                suggestion={suggestion}
                paperDatabase={paperDatabase}
                paperTypes={paperTypes}
                availableGSMs={availableGSMs}
                isCustomPaper={isCustomPaper}
                setIsCustomPaper={setIsCustomPaper}
                customPaper={customPaper}
                setCustomPaper={setCustomPaper}
                digitalConfig={digitalConfig}
                forcePreferred={forcePreferred}
                setForcePreferred={setForcePreferred}
                preferredConditionsMet={preferredConditionsMet}
                setPreferredAutoSet={setPreferredAutoSet}
                preferredSizeMode={preferredSizeMode}
                setPreferredSizeMode={setPreferredSizeMode}
                machines={machines}
                config={config}
                extraFinishings={extraFinishings}
                handleAddFinishing={handleAddFinishing}
                updateFinishing={updateFinishing}
                removeFinishing={removeFinishing}
                digitalOptions={digitalOptions}
                finalOptions={finalOptions}
              />

              {/* Results Panel */}
              <DigitalResultsPanel
                offsetComparison={offsetComparison}
                isCalculating={isCalculating}
                finalOptions={finalOptions}
                inputs={inputs}
                extraFinishings={extraFinishings}
                onOpenCutModal={(data) => {
                  setModalData(data);
                  setModalOpen(true);
                }}
                onCreateOrder={(opt) => setCreateOrderOpt(opt)}
              />
            </div>
          )}

          {activeTab === 'machines' && (
            <div className="space-y-6">
              {/* General Configuration */}
              <DigitalGeneralConfig config={config} setConfig={setConfig} inputs={inputs} />

              {/* Preferred Papers Configuration */}
              <DigitalPreferredPapersConfig
                digitalConfig={digitalConfig}
                setDigitalConfig={setDigitalConfig}
                paperDatabase={paperDatabase}
              />

              {/* Reset Config */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reset toàn bộ cấu hình về mặc định? Dữ liệu hiện tại sẽ bị mất.'
                      )
                    ) {
                      setConfig(DEFAULT_CONFIG);
                      setDigitalConfig(DEFAULT_DIGITAL_CONFIG);
                      setMachines(DEFAULT_DIGITAL_MACHINES);
                      setPaperDatabase(DEFAULT_PAPER_DATABASE);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-600 px-3 py-2 rounded border border-red-200 hover:bg-red-50 flex items-center gap-1 cursor-pointer transition"
                >
                  <RefreshCw size={12} /> Reset về mặc định
                </button>
              </div>

              {/* Machines with Click Config */}
              <DigitalMachinesConfig
                machines={machines}
                digitalConfig={digitalConfig}
                editingMachineId={editingMachineId}
                machineForm={machineForm}
                setMachineForm={setMachineForm}
                handleEditMachine={handleEditMachine}
                handleDeleteMachine={handleDeleteMachine}
                resetMachineForm={resetMachineForm}
                handleSaveMachine={handleSaveMachine}
                addClickRow={addClickRow}
                removeClickRow={removeClickRow}
                updateClickRow={updateClickRow}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PriceCalculatorDigital;
