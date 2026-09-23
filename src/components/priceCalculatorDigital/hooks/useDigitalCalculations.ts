import { useMemo } from 'react';
import {
  Machine,
  Paper,
  ConfigState,
  InputState,
  FinishingItem,
  CalcOption,
  ClickTableEntry
} from '../../../utils/calculatorTypes';
import { DigitalConfig } from '../../../contexts/PrintConfigContext';
import { calcDigitalPrintCost, calcPreferredPaperCost } from '../../../utils/printCalculatorHelpers';
import { OffsetComparisonResult } from '../types';

interface UseDigitalCalculationsProps {
  topOptions: CalcOption[];
  inputs: InputState;
  machines: Machine[];
  digitalConfig: DigitalConfig;
  config: ConfigState;
  paperDatabase: Paper[];
  extraFinishings: FinishingItem[];
  offsetMachines: Machine[];
  forcePreferred: boolean;
  preferredSizeMode: string;
}

export const useDigitalCalculations = ({
  topOptions,
  inputs,
  machines,
  digitalConfig,
  config,
  paperDatabase,
  extraFinishings,
  offsetMachines,
  forcePreferred,
  preferredSizeMode
}: UseDigitalCalculationsProps) => {
  // Digital printing: Calculate clicks based on paper length and machine's click table
  const getClickCount = (paperLength: number, machineClickTable?: ClickTableEntry[]): number => {
    const table = machineClickTable || digitalConfig.clickTable;
    if (!table || table.length === 0) return 1;
    const sortedTable = [...table].sort((a, b) => a.maxLength - b.maxLength);
    for (const entry of sortedTable) {
      if (paperLength <= entry.maxLength) {
        return entry.clicks;
      }
    }
    return sortedTable[sortedTable.length - 1].clicks;
  };

  // Get click price for a specific machine (fallback to global digitalConfig)
  const getMachineClickPrice = (machineName: string): number => {
    const machine = machines.find((m) => m.name === machineName);
    return machine?.clickPrice ?? digitalConfig.clickPrice;
  };

  // Get click table for a specific machine (fallback to global digitalConfig)
  const getMachineClickTable = (machineName: string): ClickTableEntry[] => {
    const machine = machines.find((m) => m.name === machineName);
    return machine?.clickTable ?? digitalConfig.clickTable;
  };

  // Digital printing: Recalculate costs using Digital formula
  const digitalOptions = useMemo(() => {
    return topOptions
      .map((opt) => {
        const paperLength = Math.max(opt.printSize.w, opt.printSize.h);
        const machineClickTable = getMachineClickTable(opt.machineName);
        const machineClickPrice = getMachineClickPrice(opt.machineName);
        const clicks = getClickCount(paperLength, machineClickTable);
        const printSides = inputs.printSides;
        // totalPrintSheets = sheets going through the digital printer (after cutting big sheets)
        const totalPrintSheets = opt.totalBigSheets * (opt.cutX * opt.cutY);
        const digitalPrintCost = calcDigitalPrintCost(machineClickPrice, clicks, printSides, totalPrintSheets);
        const digitalTotal = opt.costs.paper + digitalPrintCost + opt.costs.lamination + opt.costs.extra;

        return {
          ...opt,
          digitalClicks: clicks,
          digitalPrintCost,
          digitalTotal,
          costs: {
            ...opt.costs,
            print: digitalPrintCost,
            total: digitalTotal
          }
        };
      })
      .sort((a, b) => a.digitalTotal - b.digitalTotal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topOptions, digitalConfig.clickPrice, digitalConfig.clickTable, machines, inputs.printSides]);

  // Apply preferred paper logic
  const preferredConditionsMet = useMemo(() => {
    if (digitalOptions.length === 0 || digitalConfig.preferredPapers.length === 0) return false;
    const best = digitalOptions[0];
    if (!best) return false;
    return (
      best.totalBigSheets < digitalConfig.maxSheetsForPreferred &&
      best.digitalTotal < digitalConfig.maxPriceForPreferred
    );
  }, [digitalOptions, digitalConfig.preferredPapers.length, digitalConfig.maxSheetsForPreferred, digitalConfig.maxPriceForPreferred]);

  const finalOptions = useMemo(() => {
    if (digitalOptions.length === 0) return digitalOptions;
    if (!forcePreferred || digitalConfig.preferredPapers.length === 0) return digitalOptions;

    const selectedType = inputs.selectedPaperType;
    const selectedGSM = inputs.selectedGSM;
    const matchingPaper =
      paperDatabase.find((p) => p.type === selectedType && p.gsm === selectedGSM) ||
      paperDatabase.find((p) => p.type === selectedType) ||
      paperDatabase[0];

    // Filter preferred papers by selected paper type & GSM
    const filteredPreferred = digitalConfig.preferredPapers.filter(
      (p) => (!p.paperType || p.paperType === selectedType) && (!p.gsm || p.gsm === selectedGSM)
    );

    const preferredOptions = filteredPreferred
      .map((pref) => {
        const gsmToUse = pref.gsm || selectedGSM;
        const gsmPaper = pref.gsm
          ? paperDatabase.find((p) => p.type === selectedType && p.gsm === gsmToUse) || matchingPaper
          : matchingPaper;

        const qty = parseFloat(inputs.quantity) || 1;
        const productW = parseInt(inputs.width) || 210;
        const productH = parseInt(inputs.height) || 297;

        // Try both orientations to maximize ups
        const layout1 = { cols: Math.floor(pref.width / productW), rows: Math.floor(pref.height / productH), rotate: false };
        const layout2 = { cols: Math.floor(pref.width / productH), rows: Math.floor(pref.height / productW), rotate: true };
        const ups1 = layout1.cols * layout1.rows;
        const ups2 = layout2.cols * layout2.rows;
        const ups = Math.max(ups1, ups2);

        // Skip if product doesn't fit this paper
        if (ups === 0) return null;

        const bestLayout = ups1 >= ups2 ? layout1 : layout2;

        const runSheets = Math.ceil(qty / ups);
        const wastePercent =
          inputs.printSides === 2 ? config.wastePercent2Side / 100 : config.wastePercent1Side / 100;
        const waste = config.wasteBase + Math.ceil(runSheets * wastePercent);
        const totalPrintSheets = runSheets + waste;
        const totalSheets = totalPrintSheets;

        const paperLength = Math.max(pref.width, pref.height);
        const selectedMachine =
          inputs.selectedMachine !== 'auto'
            ? machines.find((m) => m.id === inputs.selectedMachine)
            : machines[0];
        const machineClickPrice = selectedMachine?.clickPrice ?? digitalConfig.clickPrice;
        const machineClickTable = selectedMachine?.clickTable ?? digitalConfig.clickTable;
        const clicks = getClickCount(paperLength, machineClickTable);
        const printSides = inputs.printSides || 1;

        const printCost = calcDigitalPrintCost(machineClickPrice, clicks, printSides, totalPrintSheets);

        // Paper cost: use customPrice if set, otherwise ratio from full sheet
        const paperCost = pref.customPrice
          ? pref.customPrice * totalSheets
          : calcPreferredPaperCost(
              pref.width,
              pref.height,
              gsmPaper.width,
              gsmPaper.height,
              gsmPaper.price,
              totalSheets
            );

        let laminationCost = 0;
        if (inputs.lamination !== 'none') {
          const sheetAreaM2 = (pref.width * pref.height) / 1000000;
          laminationCost = Math.ceil(
            sheetAreaM2 * totalPrintSheets * (inputs.lamination === '2side' ? 2 : 1) * config.laminationPrice
          );
        }

        let extraCost = 0;
        extraFinishings.forEach((item) => {
          const itemQty = item.overrideVal
            ? parseFloat(item.overrideVal) || 0
            : item.unit === 'm²'
            ? (productW * productH * qty) / 1000000
            : item.unit === 'lượt'
            ? totalPrintSheets * printSides
            : qty;
          extraCost += itemQty * (parseFloat(item.price) || 0);
        });

        // Apply profit margin same as regular options
        const profitMultiplier = 1 + (config.profitMargin || 0) / 100;
        const total = (printCost + paperCost + laminationCost + extraCost) * profitMultiplier;

        // Generate layout items
        const layoutItems = [];
        const itemW = bestLayout.rotate ? productH : productW;
        const itemH = bestLayout.rotate ? productW : productH;

        for (let row = 0; row < bestLayout.rows; row++) {
          for (let col = 0; col < bestLayout.cols; col++) {
            layoutItems.push({
              x: col * itemW,
              y: row * itemH,
              w: itemW,
              h: itemH,
              rotate: bestLayout.rotate
            });
          }
        }

        return {
          id: `preferred-${pref.paperType}-${pref.width}x${pref.height}`,
          isPreferred: true,
          priceDiff: total - digitalOptions[0].digitalTotal,
          machineName: "Digital (Cắt sẵn)",
          machineColors: 4,
          paperDisplay: `${selectedType} ${gsmToUse}gsm (Cắt sẵn ${pref.width}×${pref.height})`,
          paperWidth: pref.width,
          paperHeight: pref.height,
          paperSize: `${pref.width}×${pref.height}mm`,
          cutX: 1,
          cutY: 1,
          printSize: { w: pref.width, h: pref.height },
          ups: ups,
          cutItems: [{ x: 0, y: 0, w: pref.width, h: pref.height }],
          layoutItems: layoutItems,
          paperPrice: gsmPaper.price,
          paperGSM: gsmToUse,
          totalBigSheets: totalSheets,
          totalImpressions: totalPrintSheets * printSides,
          printMethod: 'digital' as const,
          splitType: 'none',
          sheetsPerBig: 1,
          digitalTotal: total,
          digitalClicks: clicks,
          digitalPrintCost: printCost,
          costs: {
            print: printCost,
            paper: paperCost,
            lamination: laminationCost,
            extra: extraCost,
            total: total
          }
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.digitalTotal - b.digitalTotal);

    if (preferredSizeMode === 'auto') return preferredOptions;
    const selected = preferredOptions.find((o) => o.paperSize === preferredSizeMode);
    return selected ? [selected] : preferredOptions;
  }, [digitalOptions, digitalConfig, inputs, config, extraFinishings, paperDatabase, forcePreferred, preferredSizeMode, machines]);

  // Compare with Offset pricing
  const offsetComparison = useMemo<OffsetComparisonResult | null>(() => {
    if (finalOptions.length === 0 || offsetMachines.length === 0) return null;

    const bestDigital = finalOptions[0];
    if (!bestDigital) return null;

    let bestOffsetTotal = Infinity;
    let bestOffsetMachine = '';

    for (const machine of offsetMachines) {
      const pw = bestDigital.printSize.w,
        ph = bestDigital.printSize.h;
      const fits =
        (pw <= machine.maxWidth && ph <= machine.maxHeight) ||
        (ph <= machine.maxWidth && pw <= machine.maxHeight);
      if (!fits) continue;

      const requiredColors = parseInt(inputs.printColors) || 4;
      if (machine.maxColors < requiredColors) continue;

      const sorted = [...machine.colorPricing].sort((a, b) => a.colors - b.colors);
      const pricing = sorted.find((p) => p.colors >= requiredColors) || sorted[sorted.length - 1];
      if (!pricing) continue;

      const totalImpressions = bestDigital.totalImpressions || bestDigital.totalBigSheets;
      const getPrintCost = (imp: number) =>
        imp <= machine.baseQty ? pricing.basePrice : pricing.basePrice + (imp - machine.baseQty) * pricing.excessPrice;

      const offsetPrintCost = getPrintCost(totalImpressions);
      const offsetTotal =
        bestDigital.costs.paper + offsetPrintCost + bestDigital.costs.lamination + bestDigital.costs.extra;

      if (offsetTotal < bestOffsetTotal) {
        bestOffsetTotal = offsetTotal;
        bestOffsetMachine = machine.name;
      }
    }

    if (bestOffsetTotal < bestDigital.digitalTotal) {
      const savings = bestDigital.digitalTotal - bestOffsetTotal;
      const savingsPercent = Math.round((savings / bestDigital.digitalTotal) * 100);
      return {
        isOffsetCheaper: true,
        offsetTotal: bestOffsetTotal,
        digitalTotal: bestDigital.digitalTotal,
        savings,
        savingsPercent,
        offsetOption: { ...bestDigital, machineName: bestOffsetMachine }
      };
    }

    return null;
  }, [finalOptions, offsetMachines, inputs.printColors]);

  return {
    getClickCount,
    getMachineClickPrice,
    getMachineClickTable,
    digitalOptions,
    preferredConditionsMet,
    finalOptions,
    offsetComparison
  };
};
