import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { calculateLayout, LayoutPlan } from '../../../utils/layoutSolver';
import { ImpositionConfig, ManualRotateType } from '../types';
import { DEFAULT_IMPOSITION_CONFIG } from '../constants';

export function useImpositionConfig() {
  const [config, setConfig] = useState<ImpositionConfig>(DEFAULT_IMPOSITION_CONFIG);
  const [plans, setPlans] = useState<LayoutPlan[]>([]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [manualRotate, setManualRotate] = useState<ManualRotateType>('auto');
  const [unitPrice, setUnitPrice] = useState(10000); // Đơn giá/tờ

  // Debounced config for inputs
  const [pendingConfig, setPendingConfig] = useState<Partial<ImpositionConfig>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const updateConfigDebounced = useCallback((updates: Partial<ImpositionConfig>) => {
    setPendingConfig((prev) => ({ ...prev, ...updates }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setConfig((prev) => ({ ...prev, ...updates }));
      setPendingConfig({});
    }, 500);
  }, []);

  const updatePrint = useCallback((w: number, h: number) => {
    setConfig((p) => ({
      ...p,
      pageW: w,
      pageH: h,
      printW: Math.max(0, w - 20),
      printH: Math.max(0, h - 30)
    }));
  }, []);

  const handlePreset = useCallback(
    (v: string) => {
      const [w, h] = v.split('x').map(Number);
      updatePrint(w, h);
    },
    [updatePrint]
  );

  const swapDims = useCallback(() => {
    updatePrint(config.pageH, config.pageW);
  }, [config.pageH, config.pageW, updatePrint]);

  const runCalc = useCallback(() => {
    if (config.itemW <= 0 || config.itemH <= 0) {
      setPlans([]);
      return;
    }
    const r = calculateLayout({
      shape: config.shape,
      itemW: config.itemW,
      itemH: config.shape === 'circle' ? config.itemW : config.itemH,
      padding: config.padding,
      printW: config.printW,
      printH: config.printH,
      pageW: config.pageW,
      pageH: config.pageH
    });
    setPlans(r);
    if (currentPlanIndex >= r.length) setCurrentPlanIndex(0);
  }, [config, currentPlanIndex]);

  useEffect(() => {
    const t = setTimeout(runCalc, 500);
    return () => clearTimeout(t);
  }, [runCalc]);

  const currentPlan = plans[currentPlanIndex] || null;

  const sheets =
    currentPlan && currentPlan.qty > 0
      ? Math.ceil(config.totalOrder / currentPlan.qty)
      : 0;

  const totalCost = sheets * unitPrice;

  const pricePerItem =
    currentPlan && currentPlan.qty > 0 && sheets > 0
      ? totalCost / (sheets * currentPlan.qty)
      : 0;

  const getBR = useCallback(
    (scale: number) => {
      if (config.shape === 'circle' || config.shape === 'oval') return '50%';
      if (config.cornerRadius > 0) return Math.max(2, config.cornerRadius * scale) + 'px';
      if (config.shape === 'hexagon') return '15%';
      return '2px';
    },
    [config.shape, config.cornerRadius]
  );

  const getClipPath = useCallback(
    (isFlipped: boolean = false) => {
      if (config.cornerRadius > 0) return 'none';

      if (config.shape === 'trapezoid') {
        return isFlipped
          ? 'polygon(0% 0%, 100% 0%, 85% 100%, 15% 100%)'
          : 'polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)';
      }
      if (config.shape === 'triangle') {
        return isFlipped
          ? 'polygon(0% 0%, 100% 0%, 50% 100%)'
          : 'polygon(50% 0%, 100% 100%, 0% 100%)';
      }
      if (config.shape === 'hexagon') {
        return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
      }
      return 'none';
    },
    [config.shape, config.cornerRadius]
  );

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_IMPOSITION_CONFIG);
    setPlans([]);
    setCurrentPlanIndex(0);
    setManualRotate('auto');
    setUnitPrice(10000);
    setPendingConfig({});
  }, []);

  return {
    config,
    setConfig,
    pendingConfig,
    updateConfigDebounced,
    plans,
    setPlans,
    currentPlanIndex,
    setCurrentPlanIndex,
    currentPlan,
    manualRotate,
    setManualRotate,
    unitPrice,
    setUnitPrice,
    updatePrint,
    handlePreset,
    swapDims,
    sheets,
    totalCost,
    pricePerItem,
    getBR,
    getClipPath,
    resetConfig
  };
}
