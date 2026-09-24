import { PDF_SCRIPTS, PDF_WORKER_SRC } from '../constants';

export async function loadPdfProcessorScripts(): Promise<void> {
  for (const script of PDF_SCRIPTS) {
    if (!document.getElementById(script.id)) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = script.src;
        s.id = script.id;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load ${script.src}`));
        document.head.appendChild(s);
      });
    }
  }

  // Set PDF.js worker
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
  }
}
