export const RENDER_SCALE = 1.5;

export const FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Roboto",
  "Open Sans",
  "Oswald",
  "Tahoma",
  "Courier New"
];

export const PDF_SCRIPTS = [
  { src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', id: 'pdfjs' },
  { src: 'https://unpkg.com/fabric@5.3.0/dist/fabric.min.js', id: 'fabric' },
  { src: 'https://unpkg.com/pdf-lib/dist/pdf-lib.min.js', id: 'pdflib' },
  { src: 'https://unpkg.com/@pdf-lib/fontkit/dist/fontkit.umd.min.js', id: 'fontkit' }
];

export const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
