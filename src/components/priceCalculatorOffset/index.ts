export type {
  Order,
  DefaultFinishing,
  ColumnMapping,
  ImportState,
  ClickTableEntry,
  DigitalConfig,
  PriceCalculatorOffsetProps,
  DigitalComparisonResult,
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption,
  Suggestion,
  LayoutItem
} from './types';

export {
  formatVND,
  formatMM,
  copyToClipboard,
  getQuoteText
} from './helpers';

export { useOffsetCalculations } from './hooks/useOffsetCalculations';
export { useOffsetMachineForm } from './hooks/useOffsetMachineForm';

export { OffsetCalcHeader } from './components/OffsetCalcHeader';
export { OffsetPaperSelection } from './components/OffsetPaperSelection';
export { OffsetInputPanel } from './components/OffsetInputPanel';
export { OffsetOptionCard } from './components/OffsetOptionCard';
export { OffsetResultsPanel } from './components/OffsetResultsPanel';
export { OffsetGeneralConfig } from './components/OffsetGeneralConfig';
export { OffsetMachinesConfig } from './components/OffsetMachinesConfig';

export { CutAnimationModal } from './modals/CutAnimationModal';
export { PaperImportModal } from './modals/PaperImportModal';
export { CreateOrderModal } from './modals/CreateOrderModal';
