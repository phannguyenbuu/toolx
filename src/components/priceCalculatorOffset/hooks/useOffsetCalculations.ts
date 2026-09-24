import { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  InputState,
  CalcOption,
  DigitalConfig,
  DigitalComparisonResult
} from '../types';
import { calcDigitalPrintCost, getClickCount as getClickCountShared } from '../../../utils/printCalculatorHelpers';

interface UseOffsetCalculationsProps {
  paperDatabase: Paper[];
  inputs: InputState;
  setInputs: React.Dispatch<React.SetStateAction<InputState>>;
  digitalConfig: DigitalConfig;
  topOptions: CalcOption[];
}

export function useOffsetCalculations({
  paperDatabase,
  inputs,
  setInputs,
  digitalConfig,
  topOptions
}: UseOffsetCalculationsProps) {
  // Local state for numeric inputs (debounced before sync to main state)
  const [localInputs, setLocalInputs] = useState({
    width: inputs.width,
    height: inputs.height,
    quantity: inputs.quantity
  });

  // Debounce sync local inputs to main inputs state (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setInputs((prev) => {
        if (
          prev.width === localInputs.width &&
          prev.height === localInputs.height &&
          prev.quantity === localInputs.quantity
        ) {
          return prev;
        }
        return {
          ...prev,
          width: localInputs.width,
          height: localInputs.height,
          quantity: localInputs.quantity
        };
      });
    }, 400);
    return () => clearTimeout(handler);
  }, [localInputs.width, localInputs.height, localInputs.quantity, setInputs]);

  const handleNumChange = (field: keyof InputState, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      if (field === 'width' || field === 'height' || field === 'quantity') {
        setLocalInputs((prev) => ({ ...prev, [field]: value }));
      } else {
        setInputs((prev) => ({ ...prev, [field]: value }));
      }
    }
  };

  const paperTypes = useMemo(
    () => Array.from(new Set(paperDatabase.map((p: Paper) => p.type))),
    [paperDatabase]
  );

  const availableGSMs = useMemo(() => {
    const papers = paperDatabase.filter((p: Paper) => p.type === inputs.selectedPaperType);
    return Array.from(new Set(papers.map((p: Paper) => p.gsm))).sort(
      (a: number, b: number) => a - b
    );
  }, [inputs.selectedPaperType, paperDatabase]);

  useEffect(() => {
    if (availableGSMs.length > 0 && !availableGSMs.includes(inputs.selectedGSM)) {
      setInputs((prev) => ({ ...prev, selectedGSM: availableGSMs[0] || 0 }));
    }
  }, [availableGSMs, inputs.selectedGSM, setInputs]);

  // So sánh với in kỹ thuật số (Digital)
  const digitalComparison = useMemo<DigitalComparisonResult | null>(() => {
    if (topOptions.length === 0) return null;
    const bestOffset = topOptions[0];
    if (!bestOffset) return null;

    // Use print size (the actual sheet going through the digital printer)
    const paperLength = Math.max(bestOffset.printSize.w, bestOffset.printSize.h);
    const clicks = getClickCountShared(paperLength, digitalConfig.clickTable);
    // totalPrintSheets = big sheets × cuts per sheet
    const totalPrintSheets = bestOffset.totalBigSheets * (bestOffset.cutX * bestOffset.cutY);
    const digitalPrintCost = calcDigitalPrintCost(
      digitalConfig.clickPrice,
      clicks,
      inputs.printSides,
      totalPrintSheets
    );
    const digitalTotal =
      bestOffset.costs.paper +
      digitalPrintCost +
      bestOffset.costs.lamination +
      bestOffset.costs.extra;
    const offsetTotal = bestOffset.costs.total;

    if (digitalTotal < offsetTotal) {
      const savings = offsetTotal - digitalTotal;
      const savingsPercent = Math.round((savings / offsetTotal) * 100);
      return {
        isDigitalCheaper: true,
        offsetTotal,
        digitalTotal,
        savings,
        savingsPercent,
        clicks
      };
    }
    return null;
  }, [topOptions, digitalConfig.clickPrice, digitalConfig.clickTable, inputs.printSides]);

  return {
    localInputs,
    setLocalInputs,
    handleNumChange,
    paperTypes,
    availableGSMs,
    digitalComparison
  };
}
