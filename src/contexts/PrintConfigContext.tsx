import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Machine, Paper, ConfigState, FinishingItem } from '../utils/calculatorTypes';

// Types
export interface ClickTableEntry { maxLength: number; clicks: number; }
export interface PreferredPaper { paperType: string; width: number; height: number; gsm?: number; customPrice?: number; }
export interface DigitalConfig {
  clickPrice: number;
  clickTable: ClickTableEntry[];
  preferredPapers: PreferredPaper[];
  maxSheetsForPreferred: number;
  maxPriceForPreferred: number;
}
export interface Order {
  id: number; timestamp: string; type: 'offset' | 'digital';
  inputs: any; customPaper: any; isCustomPaper: boolean;
  result: any; finishings: FinishingItem[];
  quoteText: string; status: 'quoting' | 'processing' | 'completed';
  customerName?: string; notes?: string; unitPrice: number;
}

// Defaults
export const DEFAULT_PAPER_DATABASE: Paper[] = [
  { type: 'Offset', gsm: 250, size: '650x860', width: 650, height: 860, price: 4610 },
  { type: 'Offset', gsm: 250, size: '790x1090', width: 790, height: 1090, price: 7100 },
  { type: 'Offset', gsm: 200, size: '650x860', width: 650, height: 860, price: 3680 },
  { type: 'Offset', gsm: 200, size: '790x1090', width: 790, height: 1090, price: 5850 },
  { type: 'Offset', gsm: 180, size: '650x860', width: 650, height: 860, price: 3320 },
  { type: 'Offset', gsm: 180, size: '790x1090', width: 790, height: 1090, price: 5110 },
  { type: 'Offset', gsm: 140, size: '650x860', width: 650, height: 860, price: 2340 },
  { type: 'Offset', gsm: 140, size: '790x1090', width: 790, height: 1090, price: 3610 },
  { type: 'Offset', gsm: 120, size: '650x860', width: 650, height: 860, price: 2010 },
  { type: 'Offset', gsm: 120, size: '790x1090', width: 790, height: 1090, price: 3090 },
  { type: 'Offset', gsm: 100, size: '650x860', width: 650, height: 860, price: 1670 },
  { type: 'Offset', gsm: 100, size: '790x1090', width: 790, height: 1090, price: 2580 },
  { type: 'Offset', gsm: 80, size: '650x860', width: 650, height: 860, price: 1340 },
  { type: 'Offset', gsm: 80, size: '790x1090', width: 790, height: 1090, price: 2060 },
  { type: 'Ivory', gsm: 210, size: '650x860', width: 650, height: 860, price: 3870 },
  { type: 'Ivory', gsm: 210, size: '790x1090', width: 790, height: 1090, price: 5960 },
  { type: 'Ivory', gsm: 250, size: '650x860', width: 650, height: 860, price: 4610 },
  { type: 'Ivory', gsm: 250, size: '790x1090', width: 790, height: 1090, price: 7100 },
  { type: 'Ivory', gsm: 300, size: '650x860', width: 650, height: 860, price: 5530 },
  { type: 'Ivory', gsm: 300, size: '790x1090', width: 790, height: 1090, price: 8520 },
  { type: 'Couche', gsm: 300, size: '650x860', width: 650, height: 860, price: 5030 },
  { type: 'Couche', gsm: 300, size: '790x1090', width: 790, height: 1090, price: 7740 },
  { type: 'Couche', gsm: 250, size: '650x860', width: 650, height: 860, price: 4190 },
  { type: 'Couche', gsm: 250, size: '790x1090', width: 790, height: 1090, price: 6450 },
  { type: 'Couche', gsm: 230, size: '650x860', width: 650, height: 860, price: 3850 },
  { type: 'Couche', gsm: 200, size: '650x860', width: 650, height: 860, price: 3350 },
  { type: 'Couche', gsm: 200, size: '790x1090', width: 790, height: 1090, price: 5160 },
  { type: 'Couche', gsm: 150, size: '650x860', width: 650, height: 860, price: 2510 },
  { type: 'Couche', gsm: 150, size: '790x1090', width: 790, height: 1090, price: 3870 },
  { type: 'Couche', gsm: 120, size: '650x860', width: 650, height: 860, price: 2010 },
  { type: 'Couche', gsm: 120, size: '790x1090', width: 790, height: 1090, price: 3090 },
  { type: 'Couche', gsm: 100, size: '650x860', width: 650, height: 860, price: 1670 },
  { type: 'Couche', gsm: 100, size: '790x1090', width: 790, height: 1090, price: 2580 },
  { type: 'Couche', gsm: 80, size: '650x860', width: 650, height: 860, price: 1430 },
  { type: 'Couche', gsm: 80, size: '790x1090', width: 790, height: 1090, price: 2200 },
  { type: 'Couche Pindo', gsm: 300, size: '650x860', width: 650, height: 860, price: 5860 },
  { type: 'Couche Pindo', gsm: 350, size: '650x860', width: 650, height: 860, price: 6840 },
];

export const DEFAULT_OFFSET_MACHINES: Machine[] = [
  { id: 'offset-1', name: 'Máy 32.5 x 43', maxWidth: 430, maxHeight: 325, baseQty: 1000, maxColors: 4,
    colorPricing: [
      { colors: 1, basePrice: 300000, excessPrice: 50 },
      { colors: 2, basePrice: 500000, excessPrice: 80 },
      { colors: 4, basePrice: 700000, excessPrice: 100 },
    ]
  },
  { id: 'offset-2', name: 'Máy 43 x 65', maxWidth: 650, maxHeight: 430, baseQty: 1000, maxColors: 4,
    colorPricing: [
      { colors: 1, basePrice: 450000, excessPrice: 80 },
      { colors: 2, basePrice: 750000, excessPrice: 120 },
      { colors: 4, basePrice: 1000000, excessPrice: 200 },
    ]
  }
];

export const DEFAULT_DIGITAL_MACHINES: Machine[] = [
  { id: 'digital-1', name: 'Máy Digital 33x48', maxWidth: 480, maxHeight: 330, baseQty: 1, maxColors: 4,
    colorPricing: [], clickPrice: 150,
    clickTable: [
      { maxLength: 330, clicks: 1 },
      { maxLength: 487, clicks: 2 },
    ]
  },
  { id: 'digital-2', name: 'Máy Digital 48x70', maxWidth: 700, maxHeight: 480, baseQty: 1, maxColors: 4,
    colorPricing: [], clickPrice: 150,
    clickTable: [
      { maxLength: 330, clicks: 1 },
      { maxLength: 487, clicks: 2 },
      { maxLength: 700, clicks: 3 },
    ]
  }
];

export const DEFAULT_CONFIG: ConfigState = {
  laminationPrice: 5000, profitMargin: 0, maxCutWidth: 0, minPrintSize: 250,
  wasteBase: 50, wastePercent1Side: 2, wastePercent2Side: 3,
  defaultFinishings: [
    { type: 'Bế Demi', defaultPrice: 0, unit: 'bộ' },
    { type: 'Cấn đường', defaultPrice: 0, unit: 'bộ' },
    { type: 'UV Định hình', defaultPrice: 0, unit: 'm²' },
    { type: 'Ép kim', defaultPrice: 0, unit: 'm²' },
    { type: 'Đóng cuốn', defaultPrice: 0, unit: 'bộ' },
    { type: 'Dán bao thư', defaultPrice: 0, unit: 'cái' },
    { type: 'Bồi carton', defaultPrice: 0, unit: 'm²' },
  ]
};

export const DEFAULT_DIGITAL_CONFIG: DigitalConfig = {
  clickPrice: 150,
  clickTable: [
    { maxLength: 330, clicks: 1 },
    { maxLength: 487, clicks: 2 },
    { maxLength: 700, clicks: 3 },
    { maxLength: 1200, clicks: 4 },
  ],
  preferredPapers: [{ paperType: 'Giấy Couche', width: 210, height: 297 }],
  maxSheetsForPreferred: 100,
  maxPriceForPreferred: 200000
};

// localStorage helpers
const STORAGE_KEYS = {
  config: 'txp-config',
  digitalConfig: 'txp-digital-config',
  offsetMachines: 'txp-offset-machines',
  digitalMachines: 'txp-digital-machines',
  papers: 'txp-papers',
  orders: 'txp-orders',
};

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch { return fallback; }
}

function saveJSON(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Context
interface PrintConfigContextType {
  config: ConfigState;
  setConfig: (c: ConfigState) => void;
  digitalConfig: DigitalConfig;
  setDigitalConfig: (c: DigitalConfig) => void;
  offsetMachines: Machine[];
  setOffsetMachines: (m: Machine[]) => void;
  digitalMachines: Machine[];
  setDigitalMachines: (m: Machine[]) => void;
  paperDatabase: Paper[];
  setPaperDatabase: (p: Paper[]) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  addOrder: (o: Order) => void;
}

const PrintConfigContext: React.Context<PrintConfigContextType | null> = typeof window !== 'undefined'
  ? ((window as any).__TOOLX_PRINT_CONFIG_CTX__ = (window as any).__TOOLX_PRINT_CONFIG_CTX__ || createContext<PrintConfigContextType | null>(null))
  : createContext<PrintConfigContextType | null>(null);

export function PrintConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigRaw] = useState<ConfigState>(() => loadJSON(STORAGE_KEYS.config, DEFAULT_CONFIG));
  const [digitalConfig, setDigitalConfigRaw] = useState<DigitalConfig>(() => loadJSON(STORAGE_KEYS.digitalConfig, DEFAULT_DIGITAL_CONFIG));
  const [offsetMachines, setOffsetMachinesRaw] = useState<Machine[]>(() => loadJSON(STORAGE_KEYS.offsetMachines, DEFAULT_OFFSET_MACHINES));
  const [digitalMachines, setDigitalMachinesRaw] = useState<Machine[]>(() => loadJSON(STORAGE_KEYS.digitalMachines, DEFAULT_DIGITAL_MACHINES));
  const [paperDatabase, setPaperDatabaseRaw] = useState<Paper[]>(() => loadJSON(STORAGE_KEYS.papers, DEFAULT_PAPER_DATABASE));
  const [orders, setOrdersRaw] = useState<Order[]>(() => loadJSON(STORAGE_KEYS.orders, []));

  // Persist on change
  const setConfig = useCallback((c: ConfigState) => { setConfigRaw(c); saveJSON(STORAGE_KEYS.config, c); }, []);
  const setDigitalConfig = useCallback((c: DigitalConfig) => { setDigitalConfigRaw(c); saveJSON(STORAGE_KEYS.digitalConfig, c); }, []);
  const setOffsetMachines = useCallback((m: Machine[]) => { setOffsetMachinesRaw(m); saveJSON(STORAGE_KEYS.offsetMachines, m); }, []);
  const setDigitalMachines = useCallback((m: Machine[]) => { setDigitalMachinesRaw(m); saveJSON(STORAGE_KEYS.digitalMachines, m); }, []);
  const setPaperDatabase = useCallback((p: Paper[]) => { setPaperDatabaseRaw(p); saveJSON(STORAGE_KEYS.papers, p); }, []);
  const setOrders = useCallback((o: Order[]) => { setOrdersRaw(o); saveJSON(STORAGE_KEYS.orders, o); }, []);
  const addOrder = useCallback((o: Order) => {
    setOrdersRaw(prev => { const next = [o, ...prev]; saveJSON(STORAGE_KEYS.orders, next); return next; });
  }, []);

  return (
    <PrintConfigContext.Provider value={{
      config, setConfig, digitalConfig, setDigitalConfig,
      offsetMachines, setOffsetMachines, digitalMachines, setDigitalMachines,
      paperDatabase, setPaperDatabase, orders, setOrders, addOrder,
    }}>
      {children}
    </PrintConfigContext.Provider>
  );
}

export function usePrintConfig() {
  const ctx = useContext(PrintConfigContext);
  if (!ctx) throw new Error('usePrintConfig must be used within PrintConfigProvider');
  return ctx;
}
