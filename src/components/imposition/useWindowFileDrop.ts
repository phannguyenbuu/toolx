import { useState, useEffect } from 'react';

/**
 * Hook lắng nghe kéo thả tệp từ OS vào cửa sổ trình duyệt
 */
export function useWindowFileDrop(onDropFiles: (files: FileList) => void): boolean {
  const [isWindowDragging, setIsWindowDragging] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleWindowDragEnter = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter++;
        setIsWindowDragging(true);
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        dragCounter--;
        if (dragCounter <= 0) {
          dragCounter = 0;
          setIsWindowDragging(false);
        }
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        dragCounter = 0;
        setIsWindowDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onDropFiles(e.dataTransfer.files);
        }
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [onDropFiles]);

  return isWindowDragging;
}
