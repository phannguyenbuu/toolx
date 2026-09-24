import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  Suggestion,
} from '../../utils/calculatorTypes';
import { ALL_CUT_PATTERNS, getCutLayout, calculateImposition } from './impositionEngine';

export function calculateSuggestion(
  inW: number,
  inH: number,
  inQty: number,
  currentBestUps: number,
  currentCost: number,
  inputs: InputState,
  machines: Machine[],
  activePapers: Paper[],
  config: ConfigState,
  extraFinishings: FinishingItem[]
): Suggestion | null {
  const requiredColors = parseInt(inputs.printColors) || 0;
  const machineList = (inputs.selectedMachine === 'auto'
    ? machines
    : machines.filter(m => m.id === inputs.selectedMachine)
  ).filter(m => m.maxColors >= requiredColors);

  let bestSuggestion: Suggestion | null = null;

  // Optimized: Try strategic sizes instead of brute force
  // Focus on sizes that might give better ups
  const sizesToTry: { w: number; h: number }[] = [];
  
  // Try reducing each dimension by 1-10mm
  for (let d = 1; d <= 10; d++) {
    sizesToTry.push({ w: inW - d, h: inH });
    sizesToTry.push({ w: inW, h: inH - d });
    sizesToTry.push({ w: inW - d, h: inH - d });
  }

  for (const testSize of sizesToTry) {
    if (testSize.w <= 0 || testSize.h <= 0) continue;

    // Early exit if we found a good suggestion (PA5 - Early exit)
    if (bestSuggestion && bestSuggestion.diff > 100000) break;

    for (const paper of activePapers) {
      if (config.maxCutWidth > 0 && Math.min(paper.width, paper.height) > config.maxCutWidth) continue;

      for (const machine of machineList) {
        for (const cut of ALL_CUT_PATTERNS) {
          const cutLayout = getCutLayout(paper.width, paper.height, cut.x, cut.y);
          const pW = cutLayout.printW, pH = cutLayout.printH;
          let runW = 0, runH = 0;

          if (pW <= machine.maxWidth && pH <= machine.maxHeight) {
            runW = pW; runH = pH;
          } else if (pH <= machine.maxWidth && pW <= machine.maxHeight) {
            runW = pH; runH = pW;
          } else continue;

          if (runW < config.minPrintSize || runH < config.minPrintSize) continue;

          const layout = calculateImposition(
            runW, runH, testSize.w, testSize.h, inputs.symmetryMode,
            inputs.printSides, inputs.gripperMargin,
            inputs.useBleed, parseFloat(inputs.bleedMargin) || 0
          );

          if (layout.count === 0) continue;
          if (layout.count <= currentBestUps) continue; // Only suggest if more ups

          // Calculate cost for this option
          const runSheets = Math.ceil(inQty / layout.count);
          const wastePercent = inputs.printSides === 2 ? (config.wastePercent2Side / 100) : (config.wastePercent1Side / 100);
          const waste = config.wasteBase + Math.ceil(runSheets * wastePercent);
          const totalPrintSheets = runSheets + waste;
          const totalBigSheets = Math.ceil(totalPrintSheets / (cut.x * cut.y));
          const costPaper = totalBigSheets * paper.price;

          const getPricing = (m: Machine, colors: number) => {
            if (!m.colorPricing || m.colorPricing.length === 0) return { colors: 4, basePrice: 0, excessPrice: 0 };
            const sorted = [...m.colorPricing].sort((a, b) => a.colors - b.colors);
            return sorted.find(p => p.colors >= colors) || sorted[sorted.length - 1] || { colors: 4, basePrice: 0, excessPrice: 0 };
          };
          const pricing = getPricing(machine, requiredColors || 4);
          const getPrintCost = (imp: number) =>
            imp <= machine.baseQty ? pricing.basePrice : pricing.basePrice + (imp - machine.baseQty) * pricing.excessPrice;

          let totalImpressions = 0, costPrint = 0;

          if (inputs.printSides === 1) {
            totalImpressions = totalPrintSheets;
            costPrint = getPrintCost(totalImpressions);
          } else {
            const canWorkTurn = (layout.splitType === 'vertical' && layout.cols % 2 === 0) ||
              (layout.splitType === 'horizontal' && layout.rows % 2 === 0);
            totalImpressions = totalPrintSheets * 2;
            if (canWorkTurn) {
              costPrint = getPrintCost(totalImpressions);
            } else {
              costPrint = getPrintCost(totalPrintSheets) * 2;
            }
          }

          let costLamination = 0;
          if (inputs.lamination !== 'none') {
            const sheetAreaM2 = (runW * runH) / 1000000;
            costLamination = Math.ceil(sheetAreaM2 * totalPrintSheets * (inputs.lamination === '2side' ? 2 : 1) * config.laminationPrice);
          }

          let extraCostTotal = 0;
          extraFinishings.forEach(item => {
            const qty = item.overrideVal
              ? parseFloat(item.overrideVal) || 0
              : (item.unit === 'm²' ? (testSize.w * testSize.h * inQty) / 1000000 : item.unit === 'lượt' ? totalImpressions : inQty);
            extraCostTotal += qty * (parseFloat(item.price) || 0);
          });

          const profitMultiplier = 1 + (config.profitMargin || 0) / 100;
          const totalCost = (costPaper + costPrint + costLamination + extraCostTotal) * profitMultiplier;

          const diff = currentCost - totalCost;
          if (diff > 10000 && (!bestSuggestion || diff > bestSuggestion.diff)) {
            bestSuggestion = {
              w: testSize.w,
              h: testSize.h,
              diff: diff,
              ups: layout.count,
              machine: machine.name,
              paper: paper.type === 'Custom' ? (paper.name || 'Custom') : `${paper.type} ${paper.gsm}gsm`
            };
          }
        }
      }
    }
  }

  return bestSuggestion;
}
