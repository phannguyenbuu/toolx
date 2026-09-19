// Price Calculator Web Worker
// Handles heavy calculations in background thread

/* eslint-disable no-restricted-globals */
// 'self' is the global object in Web Workers

import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CustomPaper,
  CalcOption,
  LayoutItem,
  Suggestion,
  WorkerInput,
  WorkerOutput,
  getImpositionCacheKey,
} from '../utils/calculatorTypes';

// Constants
const ALL_CUT_PATTERNS = [
  { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 2 },
  { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 3 },
  { x: 4, y: 2 }, { x: 4, y: 3 }
];

// Caches (PA4 - Memoization)
const impositionCache = new Map<string, { count: number; items: LayoutItem[]; splitType: string; cols: number; rows: number; contentCenterX?: number; contentCenterY?: number }>();
const MAX_CACHE_SIZE = 1000;

// Helper to manage cache size
function addToCache<K, V>(cache: Map<K, V>, key: K, value: V) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

// Calculation helpers
function getCutLayout(paperW: number, paperH: number, cutX: number, cutY: number) {
  const items: LayoutItem[] = [];
  const itemW = paperW / cutX, itemH = paperH / cutY;
  for (let x = 0; x < cutX; x++) {
    for (let y = 0; y < cutY; y++) {
      items.push({ x: x * itemW, y: y * itemH, w: itemW, h: itemH });
    }
  }
  return { items, printW: itemW, printH: itemH };
}

function generateGrid(startX: number, startY: number, areaW: number, areaH: number, w: number, h: number, rotate: boolean) {
  const cols = Math.floor(areaW / w), rows = Math.floor(areaH / h);
  const list: LayoutItem[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      list.push({ x: startX + c * w, y: startY + r * h, w, h, rotate });
    }
  }
  return list;
}

function calculateImposition(
  sheetW: number,
  sheetH: number,
  prodW: number,
  prodH: number,
  symmetryMode: string,
  printSides: number,
  gripperMargin: number,
  useBleed: boolean,
  bleedMargin: number
) {
  // Check cache first (PA4)
  const cacheKey = getImpositionCacheKey(sheetW, sheetH, prodW, prodH, symmetryMode, printSides, gripperMargin, useBleed, bleedMargin);
  const cached = impositionCache.get(cacheKey);
  if (cached) return cached;

  const safeW = sheetW, safeH = sheetH - gripperMargin;
  const bleed = useBleed ? (bleedMargin * 2) : 0;
  const itemW = prodW + bleed, itemH = prodH + bleed;

  if (itemW > safeW || itemH > safeH) {
    const result = { count: 0, items: [] as LayoutItem[], splitType: 'none', cols: 0, rows: 0 };
    addToCache(impositionCache, cacheKey, result);
    return result;
  }

  let bestResult = { count: 0, items: [] as LayoutItem[], splitType: 'none', cols: 0, rows: 0 };

  const getBestGrid = (allowV: boolean, allowH: boolean) => {
    let res = { count: 0, items: [] as LayoutItem[], splitType: 'none', cols: 0, rows: 0 };
    if (allowV) {
      const g1 = generateGrid(0, 0, safeW, safeH, itemW, itemH, false);
      const cols = Math.floor(safeW / itemW);
      if (!(symmetryMode === 'vertical' && cols % 2 !== 0) && g1.length > res.count) {
        res = { count: g1.length, items: g1, splitType: 'vertical', cols, rows: 0 };
      }
    }
    if (allowH) {
      const g2 = generateGrid(0, 0, safeW, safeH, itemH, itemW, true);
      const rows = Math.floor(safeH / itemW);
      if (!(symmetryMode === 'horizontal' && rows % 2 !== 0) && g2.length > res.count) {
        res = { count: g2.length, items: g2, splitType: 'horizontal', cols: 0, rows };
      }
    }
    return res;
  };

  if (printSides === 2) {
    if (symmetryMode === 'vertical') bestResult = getBestGrid(true, false);
    else if (symmetryMode === 'horizontal') bestResult = getBestGrid(false, true);
    else {
      const v = getBestGrid(true, false), h = getBestGrid(false, true);
      const vIsEven = v.count > 0 && v.cols % 2 === 0, hIsEven = h.count > 0 && h.rows % 2 === 0;
      if (vIsEven && !hIsEven) bestResult = v;
      else if (!vIsEven && hIsEven) bestResult = h;
      else bestResult = v.count >= h.count ? v : h;
    }
  } else {
    const maxCols = Math.floor(safeW / itemW);
    for (let c = 0; c <= maxCols; c++) {
      const splitX = c * itemW, remainW = safeW - splitX;
      const g1 = generateGrid(0, 0, splitX, safeH, itemW, itemH, false);
      const g2 = generateGrid(splitX, 0, remainW, safeH, itemH, itemW, true);
      if (g1.length + g2.length > bestResult.count) {
        bestResult = { count: g1.length + g2.length, items: [...g1, ...g2], splitType: 'mixed', cols: 0, rows: 0 };
      }
    }
  }

  // Center the layout
  if (bestResult.count > 0) {
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    bestResult.items.forEach(item => {
      if (item.x < minX) minX = item.x;
      if (item.y < minY) minY = item.y;
      if (item.x + item.w > maxX) maxX = item.x + item.w;
      if (item.y + item.h > maxY) maxY = item.y + item.h;
    });
    const usedWidth = maxX - minX, usedHeight = maxY - minY;
    const offsetX = (safeW - usedWidth) / 2 - minX;
    const offsetY = (safeH - usedHeight) / 2 + gripperMargin - minY;
    const centeredItems = bestResult.items.map(item => ({ ...item, x: item.x + offsetX, y: item.y + offsetY }));
    const result = {
      ...bestResult,
      items: centeredItems,
      contentCenterX: offsetX + usedWidth / 2,
      contentCenterY: offsetY + usedHeight / 2
    };
    addToCache(impositionCache, cacheKey, result);
    return result;
  }

  addToCache(impositionCache, cacheKey, bestResult);
  return bestResult;
}

// Main calculation function
function calculateMainOptions(
  inW: number,
  inH: number,
  inQty: number,
  inputs: InputState,
  machines: Machine[],
  activePapers: Paper[],
  config: ConfigState,
  extraFinishings: FinishingItem[]
): CalcOption[] {
  const requiredColors = parseInt(inputs.printColors) || 0;
  const machineList = (inputs.selectedMachine === 'auto'
    ? machines
    : machines.filter(m => m.id === inputs.selectedMachine)
  ).filter(m => m.maxColors >= requiredColors);

  const allValidOptions: CalcOption[] = [];

  activePapers.forEach(paper => {
    if (config.maxCutWidth > 0 && Math.min(paper.width, paper.height) > config.maxCutWidth) return;
    
    machineList.forEach(machine => {
      ALL_CUT_PATTERNS.forEach(cut => {
        const cutLayout = getCutLayout(paper.width, paper.height, cut.x, cut.y);
        const pW = cutLayout.printW, pH = cutLayout.printH;
        let runW = 0, runH = 0;

        if (pW <= machine.maxWidth && pH <= machine.maxHeight) {
          runW = pW; runH = pH;
        } else if (pH <= machine.maxWidth && pW <= machine.maxHeight) {
          runW = pH; runH = pW;
        } else return;

        if (runW < config.minPrintSize || runH < config.minPrintSize) return;

        const layout = calculateImposition(
          runW, runH, inW, inH, inputs.symmetryMode,
          inputs.printSides, inputs.gripperMargin,
          inputs.useBleed, parseFloat(inputs.bleedMargin) || 0
        );
        if (layout.count === 0) return;
        if (inputs.printSides === 2 && inputs.symmetryMode !== 'auto' && layout.count % 2 !== 0) return;

        const runSheets = Math.ceil(inQty / layout.count);
        const wastePercent = inputs.printSides === 2 ? (config.wastePercent2Side / 100) : (config.wastePercent1Side / 100);
        const waste = config.wasteBase + Math.ceil(runSheets * wastePercent);
        const totalPrintSheets = runSheets + waste;
        const totalBigSheets = Math.ceil(totalPrintSheets / (cut.x * cut.y));
        const costPaper = totalBigSheets * paper.price;

        // Get pricing for the required color count
        const getPricing = (m: Machine, colors: number) => {
          if (!m.colorPricing || m.colorPricing.length === 0) return { colors: 4, basePrice: 0, excessPrice: 0 };
          const sorted = [...m.colorPricing].sort((a, b) => a.colors - b.colors);
          return sorted.find(p => p.colors >= colors) || sorted[sorted.length - 1] || { colors: 4, basePrice: 0, excessPrice: 0 };
        };
        const pricing = getPricing(machine, requiredColors || 4);
        const getPrintCost = (imp: number) =>
          imp <= machine.baseQty ? pricing.basePrice : pricing.basePrice + (imp - machine.baseQty) * pricing.excessPrice;

        let totalImpressions = 0, costPrint = 0, printMethod = '1side';

        if (inputs.printSides === 1) {
          totalImpressions = totalPrintSheets;
          costPrint = getPrintCost(totalImpressions);
        } else {
          const canWorkTurn = (layout.splitType === 'vertical' && layout.cols % 2 === 0) ||
            (layout.splitType === 'horizontal' && layout.rows % 2 === 0);
          totalImpressions = totalPrintSheets * 2;
          if (canWorkTurn) {
            costPrint = getPrintCost(totalImpressions);
            printMethod = 'work-turn';
          } else {
            costPrint = getPrintCost(totalPrintSheets) * 2;
            printMethod = 'sheet-wise';
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
            : (item.unit === 'm²' ? (inW * inH * inQty) / 1000000 : item.unit === 'lượt' ? totalImpressions : inQty);
          extraCostTotal += qty * (parseFloat(item.price) || 0);
        });

        const profitMultiplier = 1 + (config.profitMargin || 0) / 100;
        const totalCost = (costPaper + costPrint + costLamination + extraCostTotal) * profitMultiplier;

        allValidOptions.push({
          id: `${machine.id}-${paper.size}-${cut.x}x${cut.y}`,
          machineName: machine.name,
          machineColors: pricing.colors,
          paperDisplay: paper.type === 'Custom' ? (paper.name || 'Custom') : `${paper.type} ${paper.gsm}gsm`,
          paperSize: paper.size,
          paperWidth: paper.width,
          paperHeight: paper.height,
          cutX: cut.x,
          cutY: cut.y,
          printSize: { w: runW, h: runH },
          layoutItems: layout.items,
          ups: layout.count,
          totalBigSheets,
          totalImpressions,
          printMethod,
          cutItems: cutLayout.items,
          splitType: layout.splitType,
          cols: layout.cols,
          rows: layout.rows,
          contentCenterY: (layout as any).contentCenterY,
          contentCenterX: (layout as any).contentCenterX,
          costs: {
            paper: costPaper * profitMultiplier,
            print: costPrint * profitMultiplier,
            lamination: costLamination * profitMultiplier,
            extra: extraCostTotal * profitMultiplier,
            total: totalCost
          }
        });
      });
    });
  });

  // Sort and deduplicate
  allValidOptions.sort((a, b) => a.costs.total - b.costs.total);
  const uniqueResults: CalcOption[] = [];
  const seen = new Set<string>();
  
  for (const r of allValidOptions) {
    const key = `${r.machineName}-${r.paperSize}-${r.ups}-${r.printMethod}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
    if (uniqueResults.length >= 3) break;
  }

  return uniqueResults;
}

// Suggestion calculation function (PA2 - Separate calculation)
function calculateSuggestion(
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

// Worker message handler
let suggestionTimeout: ReturnType<typeof setTimeout> | null = null;

self.onmessage = function(e: MessageEvent<WorkerInput>) {
  const { type, payload } = e.data;

  if (type === 'calculate') {
    try {
      const {
        width, height, quantity, inputs, machines, papers, config,
        extraFinishings, isCustomPaper, customPaper
      } = payload;

      // Prepare active papers
      const activePapers: Paper[] = isCustomPaper && customPaper
        ? [{
            type: 'Custom',
            name: customPaper.name,
            gsm: parseInt(customPaper.gsm) || 0,
            size: `${customPaper.width}x${customPaper.height}`,
            width: parseFloat(customPaper.width) || 0,
            height: parseFloat(customPaper.height) || 0,
            price: parseFloat(customPaper.price) || 0
          }]
        : papers.filter(p => p.type === inputs.selectedPaperType && p.gsm === inputs.selectedGSM);

      // Calculate main options first (priority)
      const options = calculateMainOptions(
        width, height, quantity, inputs, machines, activePapers, config, extraFinishings
      );

      // Send main result immediately
      const mainResult: WorkerOutput = {
        type: 'main_result',
        payload: { options }
      };
      self.postMessage(mainResult);

      // Clear previous suggestion timeout (PA2 - Separate debounce)
      if (suggestionTimeout) {
        clearTimeout(suggestionTimeout);
      }

      // Calculate suggestion with delay (PA2)
      if (options.length > 0) {
        suggestionTimeout = setTimeout(() => {
          try {
            const suggestion = calculateSuggestion(
              width, height, quantity,
              options[0].ups, options[0].costs.total,
              inputs, machines, activePapers, config, extraFinishings
            );

            const suggestionResult: WorkerOutput = {
              type: 'suggestion_result',
              payload: { suggestion }
            };
            self.postMessage(suggestionResult);
          } catch (err) {
            const errorResult: WorkerOutput = {
              type: 'error',
              payload: { message: `Suggestion error: ${err}` }
            };
            self.postMessage(errorResult);
          }
        }, 1000); // 1 second delay for suggestion
      } else {
        // No options, no suggestion
        const suggestionResult: WorkerOutput = {
          type: 'suggestion_result',
          payload: { suggestion: null }
        };
        self.postMessage(suggestionResult);
      }

    } catch (err) {
      const errorResult: WorkerOutput = {
        type: 'error',
        payload: { message: `Calculation error: ${err}` }
      };
      self.postMessage(errorResult);
    }
  }
};

export {};
