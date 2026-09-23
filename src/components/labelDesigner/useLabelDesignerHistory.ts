import { useState, useCallback } from 'react';
import { ElementData } from './types';

export function useLabelDesignerHistory(
  elements: ElementData[],
  setElements: React.Dispatch<React.SetStateAction<ElementData[]>>
) {
  const [history, setHistory] = useState<ElementData[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);

  const saveToHistory = useCallback((newElements: ElementData[]) => {
    setHistory(prev => {
      const updated = prev.slice(0, historyStep + 1);
      updated.push(newElements);
      return updated;
    });
    setHistoryStep(prev => prev + 1);
  }, [historyStep]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      const prevStep = historyStep - 1;
      setHistoryStep(prevStep);
      setElements(history[prevStep]);
    }
  }, [history, historyStep, setElements]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextStep = historyStep + 1;
      setHistoryStep(nextStep);
      setElements(history[nextStep]);
    }
  }, [history, historyStep, setElements]);

  const resetHistory = useCallback((initialElements: ElementData[] = []) => {
    setHistory([initialElements]);
    setHistoryStep(0);
  }, []);

  return {
    history,
    historyStep,
    saveToHistory,
    handleUndo,
    handleRedo,
    resetHistory,
    canUndo: historyStep > 0,
    canRedo: historyStep < history.length - 1
  };
}
