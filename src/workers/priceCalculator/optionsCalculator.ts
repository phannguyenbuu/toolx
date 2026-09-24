import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CalcOption,
} from '../../utils/calculatorTypes';
import { ALL_CUT_PATTERNS, getCutLayout, calculateImposition } from './impositionEngine';

export function calculateMainOptions(
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
