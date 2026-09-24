import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption,
  Suggestion,
  LayoutItem,
} from '../../utils/calculatorTypes';

export interface Order {
  id: number;
  orderId?: string;
  timestamp: string;
  type?: 'offset' | 'digital';
  inputs: InputState;
  customPaper: CustomPaper | null;
  isCustomPaper: boolean;
  result: CalcOption;
  finishings: FinishingItem[];
  quoteText: string;
  status: 'quoting' | 'processing' | 'completed';
  unitPrice?: number;
  customerName?: string;
  notes?: string;
}

export interface DefaultFinishing {
  type: string;
  defaultPrice: number;
  unit: string;
}

export interface ColumnMapping {
  type: string;
  size: string;
  gsm: string;
  price: string;
}

export interface ImportState {
  isOpen: boolean;
  step: 'input' | 'mapping' | 'preview';
  source: 'file' | 'url' | null;
  rawData: string[][];
  headers: string[];
  mapping: ColumnMapping;
  googleSheetUrl: string;
  isLoading: boolean;
  error: string;
}

export interface ClickTableEntry {
  maxLength: number;
  clicks: number;
}

export interface DigitalConfig {
  clickPrice: number;
  clickTable: ClickTableEntry[];
}

export interface PriceCalculatorOffsetProps {
  onClose?: () => void;
  initialTab?: 'calc' | 'machines';
}

export interface DigitalComparisonResult {
  isDigitalCheaper?: boolean;
  digitalTotal: number;
  offsetTotal: number;
  savings: number;
  savingsPercent: number;
  clicks?: number;
}

export type {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption,
  Suggestion,
  LayoutItem,
};
