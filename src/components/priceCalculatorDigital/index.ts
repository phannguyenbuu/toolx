export type {
  Order,
  DefaultFinishing,
  ColumnMapping,
  ImportState,
  PriceCalculatorDigitalProps,
  OffsetComparisonResult
} from './types';

export {
  formatVND,
  formatMM,
  copyToClipboard,
  FINISHING_TYPES,
  ALL_CUT_PATTERNS,
  getQuoteText
} from './helpers';

export { useDigitalCalculations } from './hooks/useDigitalCalculations';
export { useMachineConfigForm } from './hooks/useMachineConfigForm';

export { DigitalCalcHeader } from './components/DigitalCalcHeader';
export { PaperSelectionSection } from './components/PaperSelectionSection';
export { ExtraFinishingsInput } from './components/ExtraFinishingsInput';
export { DigitalInputPanel } from './components/DigitalInputPanel';
export { DigitalResultsPanel } from './components/DigitalResultsPanel';
export { DigitalOptionCard } from './components/DigitalOptionCard';
export { DigitalGeneralConfig } from './components/DigitalGeneralConfig';
export { DigitalPreferredPapersConfig } from './components/DigitalPreferredPapersConfig';
export { DigitalMachinesConfig } from './components/DigitalMachinesConfig';

export { CutAnimationModal } from './modals/CutAnimationModal';
export { PaperImportModal } from './modals/PaperImportModal';
export { CreateOrderModal } from './modals/CreateOrderModal';
