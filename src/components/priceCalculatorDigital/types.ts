import {
  InputState,
  CustomPaper,
  CalcOption,
  FinishingItem
} from '../../utils/calculatorTypes';

export interface Order {
  id: number;
  orderId?: string;
  timestamp: string;
  inputs: InputState;
  customPaper: CustomPaper | null;
  isCustomPaper: boolean;
  result: CalcOption;
  finishings: FinishingItem[];
  quoteText: string;
  status: 'quoting' | 'processing' | 'completed';
  customerName?: string;
  notes?: string;
  type?: 'digital' | 'offset';
  unitPrice?: number;
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

export interface PriceCalculatorDigitalProps {
  onClose?: () => void;
  initialTab?: 'calc' | 'machines';
}

export interface OffsetComparisonResult {
  isOffsetCheaper: boolean;
  offsetTotal: number;
  digitalTotal: number;
  savings: number;
  savingsPercent: number;
  offsetOption: CalcOption & { machineName: string };
}
