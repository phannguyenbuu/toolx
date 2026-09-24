import { ImpositionConfig } from './types';

export const API_BASE = '/api';

export const PDF_WORKER_SRC = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export const PAPER_PRESETS = [
  { label: '330x480 Fuji', value: '330x480' },
  { label: '320x470 Konica', value: '320x470' },
  { label: 'A4', value: '210x297' },
  { label: 'A3', value: '297x420' },
];

export const DEFAULT_IMPOSITION_CONFIG: ImpositionConfig = {
  shape: 'rect',
  itemW: 100,
  itemH: 120,
  padding: 0,
  cornerRadius: 0,
  pageW: 330,
  pageH: 480,
  printW: 310,
  printH: 450,
  totalOrder: 1000,
  useCrop: false,
  cropLen: 10,
  cropDist: 10,
  cropThick: 0.5,
  cropColor: '#000000',
  fitMode: 'stretch',
  colorMode: 'original',
  dpi: 300,
  autoRotate: true,
  processMode: 'vector',
  cutBleed: 0,
  useAdvancedColor: false,
  sourceIcc: 'original',
  icc1: '',
  iccOutput: ''
};
