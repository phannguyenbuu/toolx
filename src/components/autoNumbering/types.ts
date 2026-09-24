export type NumberingMode = 'standard' | 'alpha' | 'repeat';

export interface StandardConfig {
  startValue: number;
  totalQuantity: number;
  step: number;
  padding: number;
}

export interface AlphaConfig {
  startValue: number;
  totalQuantity: number;
  startLetter: string;
  numbersPerLetter: number;
}

export interface RepeatConfig {
  startValue: number;
  totalQuantity: number;
  copiesPerSet: number;
}

export interface CommonConfig {
  prefix: string;
  suffix: string;
}

export interface GeneratedRow {
  index: number;
  value: string;
  formula?: string;
}

export interface AutoNumberingModuleProps {
  onApply?: (data: GeneratedRow[], formula: string) => void;
  onClose?: () => void;
}
