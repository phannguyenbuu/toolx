import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption,
  Suggestion,
  WorkerInput,
  WorkerOutput,
} from '../utils/calculatorTypes';

interface UsePriceCalculatorProps {
  width: number;
  height: number;
  quantity: number;
  inputs: InputState;
  machines: Machine[];
  paperDatabase: Paper[];
  config: ConfigState;
  extraFinishings: FinishingItem[];
  isCustomPaper: boolean;
  customPaper: CustomPaper | null;
}

interface UsePriceCalculatorResult {
  options: CalcOption[];
  suggestion: Suggestion | null;
  isCalculating: boolean;
  isCalculatingSuggestion: boolean;
  error: string | null;
}

// Fallback calculation for when Worker fails
function fallbackCalculate(
  props: UsePriceCalculatorProps
): { options: CalcOption[]; suggestion: Suggestion | null } {
  // Simplified fallback - just return empty results
  // The full calculation logic is in the worker
  console.warn('Worker failed, using fallback (no results)');
  return { options: [], suggestion: null };
}

export function usePriceCalculator(props: UsePriceCalculatorProps): UsePriceCalculatorResult {
  const {
    width, height, quantity, inputs, machines, paperDatabase,
    config, extraFinishings, isCustomPaper, customPaper
  } = props;

  const [options, setOptions] = useState<CalcOption[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCalculatingSuggestion, setIsCalculatingSuggestion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackUsedRef = useRef(false);

  // Initialize worker
  useEffect(() => {
    try {
      // Create worker using URL constructor for CRA compatibility
      const workerCode = `
        importScripts('${window.location.origin}/priceCalculator.worker.js');
      `;
      
      // Try to create worker from the public folder
      workerRef.current = new Worker(
        new URL('../workers/priceCalculator.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
        const { type, payload } = e.data;

        if (type === 'main_result') {
          setOptions(payload.options);
          setIsCalculating(false);
          setIsCalculatingSuggestion(true); // Now waiting for suggestion
        } else if (type === 'suggestion_result') {
          setSuggestion(payload.suggestion);
          setIsCalculatingSuggestion(false);
        } else if (type === 'error') {
          console.error('Worker error:', payload.message);
          setError(payload.message);
          setIsCalculating(false);
          setIsCalculatingSuggestion(false);

          // Fallback to main thread calculation
          if (!fallbackUsedRef.current) {
            fallbackUsedRef.current = true;
            const result = fallbackCalculate(props);
            setOptions(result.options);
            setSuggestion(result.suggestion);
          }
        }
      };

      workerRef.current.onerror = (e) => {
        console.error('Worker crashed:', e);
        setError('Worker crashed: ' + e.message);
        setIsCalculating(false);
        setIsCalculatingSuggestion(false);

        // Fallback to main thread calculation
        if (!fallbackUsedRef.current) {
          fallbackUsedRef.current = true;
          const result = fallbackCalculate(props);
          setOptions(result.options);
          setSuggestion(result.suggestion);
        }
      };

    } catch (err) {
      console.error('Failed to create worker:', err);
      setError('Failed to create worker');
      
      // Fallback immediately
      if (!fallbackUsedRef.current) {
        fallbackUsedRef.current = true;
        const result = fallbackCalculate(props);
        setOptions(result.options);
        setSuggestion(result.suggestion);
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send calculation request to worker
  const calculate = useCallback(() => {
    if (!workerRef.current) {
      // Worker not available, use fallback
      const result = fallbackCalculate(props);
      setOptions(result.options);
      setSuggestion(result.suggestion);
      return;
    }

    if (width <= 0 || height <= 0 || quantity <= 0) {
      setOptions([]);
      setSuggestion(null);
      setIsCalculating(false);
      setIsCalculatingSuggestion(false);
      return;
    }

    setIsCalculating(true);
    setIsCalculatingSuggestion(false);
    setError(null);
    fallbackUsedRef.current = false;

    // Filter papers for the worker
    const papers = isCustomPaper
      ? []
      : paperDatabase.filter(p => p.type === inputs.selectedPaperType && p.gsm === inputs.selectedGSM);

    const message: WorkerInput = {
      type: 'calculate',
      payload: {
        width,
        height,
        quantity,
        inputs,
        machines,
        papers,
        config,
        extraFinishings,
        isCustomPaper,
        customPaper
      }
    };

    workerRef.current.postMessage(message);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, quantity, inputs, machines, paperDatabase, config, extraFinishings, isCustomPaper, customPaper]);

  // Calculation trigger (minimal debounce since inputs are already debounced)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      calculate();
    }, 100); // Minimal debounce - inputs already debounced at component level

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [calculate]);

  return {
    options,
    suggestion,
    isCalculating,
    isCalculatingSuggestion,
    error
  };
}
