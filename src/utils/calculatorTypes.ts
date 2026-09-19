// Shared types between main thread and Web Worker

export interface ColorPricing {
  colors: number;
  basePrice: number;
  excessPrice: number;
}

export interface ClickTableEntry {
  maxLength: number;
  clicks: number;
}

export interface Machine {
  id: string;
  name: string;
  maxWidth: number;
  maxHeight: number;
  baseQty: number;
  maxColors: number;
  colorPricing: ColorPricing[];
  // Digital-specific
  clickPrice?: number;
  clickTable?: ClickTableEntry[];
}

export interface Paper {
  type: string;
  gsm: number;
  size: string;
  width: number;
  height: number;
  price: number;
  name?: string;
}

export interface LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate?: boolean;
}

export interface CalcOption {
  id: string;
  machineName: string;
  machineColors: number;
  paperDisplay: string;
  paperSize: string;
  paperWidth: number;
  paperHeight: number;
  cutX: number;
  cutY: number;
  printSize: { w: number; h: number };
  layoutItems: LayoutItem[];
  ups: number;
  totalBigSheets: number;
  totalImpressions: number;
  printMethod: string;
  cutItems: LayoutItem[];
  splitType: string;
  cols?: number;
  rows?: number;
  contentCenterY?: number;
  contentCenterX?: number;
  costs: {
    paper: number;
    print: number;
    lamination: number;
    extra: number;
    total: number;
  };
}

export interface FinishingItem {
  id: number;
  type: string;
  name: string;
  unit: string;
  overrideVal: string;
  price: string;
}

export interface InputState {
  width: string;
  height: string;
  quantity: string;
  printColors: string;
  printSides: number;
  symmetryMode: string;
  lamination: string;
  selectedMachine: string;
  selectedPaperType: string;
  selectedGSM: number;
  useBleed: boolean;
  bleedMargin: string;
  gripperMargin: number;
}

export interface CustomPaper {
  name: string;
  width: string;
  height: string;
  price: string;
  gsm: string;
}

export interface ConfigState {
  laminationPrice: number;
  profitMargin: number;
  maxCutWidth: number;
  minPrintSize: number;
  wasteBase: number;
  wastePercent1Side: number;
  wastePercent2Side: number;
  defaultFinishings: { type: string; defaultPrice: number; unit: string }[];
}

export interface Suggestion {
  w: number;
  h: number;
  diff: number;
  ups: number;
  machine: string;
  paper: string;
}

// Worker message types
export interface WorkerInput {
  type: 'calculate';
  payload: {
    width: number;
    height: number;
    quantity: number;
    inputs: InputState;
    machines: Machine[];
    papers: Paper[];
    config: ConfigState;
    extraFinishings: FinishingItem[];
    isCustomPaper: boolean;
    customPaper: CustomPaper | null;
  };
}

export interface WorkerMainResult {
  type: 'main_result';
  payload: {
    options: CalcOption[];
  };
}

export interface WorkerSuggestionResult {
  type: 'suggestion_result';
  payload: {
    suggestion: Suggestion | null;
  };
}

export interface WorkerError {
  type: 'error';
  payload: {
    message: string;
  };
}

export type WorkerOutput = WorkerMainResult | WorkerSuggestionResult | WorkerError;

// Cache key generator
export function getCacheKey(
  paperSize: string,
  cutPattern: string,
  productW: number,
  productH: number,
  quantity: number,
  printSides: number
): string {
  return `${paperSize}-${cutPattern}-${productW}x${productH}-${quantity}-${printSides}`;
}

export function getImpositionCacheKey(
  sheetW: number,
  sheetH: number,
  prodW: number,
  prodH: number,
  symmetryMode: string,
  printSides: number,
  gripperMargin: number,
  useBleed: boolean,
  bleedMargin: number
): string {
  return `${sheetW}-${sheetH}-${prodW}-${prodH}-${symmetryMode}-${printSides}-${gripperMargin}-${useBleed}-${bleedMargin}`;
}
