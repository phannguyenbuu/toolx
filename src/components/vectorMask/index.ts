export type {
  VectorKnot,
  VectorMaskResult,
  VectorMaskEditorModalProps,
  PresetShapeType,
  ToolMode,
  PreviewMode,
  ActiveSidebarTab
} from './types';

export {
  uid,
  generatePresetKnots
} from './helpers/shapePresets';

export {
  generatePathData,
  generateExportSvg,
  parseSvgToKnots
} from './helpers/svgGenerators';

export {
  findNearestSegment,
  flipKnots,
  rotateKnots,
  centerAlignKnots,
  offsetMarginKnots
} from './helpers/transformUtils';

export { useVectorMaskState } from './hooks/useVectorMaskState';
export { useVectorMaskCanvas } from './hooks/useVectorMaskCanvas';

export { VectorMaskHeader } from './components/VectorMaskHeader';
export { VectorMaskCanvasArea } from './components/VectorMaskCanvasArea';
export { VectorMaskSidebar } from './components/VectorMaskSidebar';
export { VectorMaskFooter } from './components/VectorMaskFooter';
