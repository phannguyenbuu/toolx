import {
  StandardConfig,
  AlphaConfig,
  RepeatConfig,
  CommonConfig,
  GeneratedRow
} from './types';

export function generateStandardSequence(
  config: StandardConfig,
  common: CommonConfig
): { rows: GeneratedRow[]; formula: string } {
  const { startValue, totalQuantity, step, padding } = config;
  const { prefix, suffix } = common;
  const rows: GeneratedRow[] = [];
  const endValue = startValue + (totalQuantity - 1) * step;

  for (let i = 0; i < totalQuantity; i++) {
    const num = startValue + i * step;
    const paddedNum = String(num).padStart(padding, '0');
    rows.push({
      index: i + 1,
      value: `${prefix}${paddedNum}${suffix}`
    });
  }

  // PSM Formula: COUNTER(start, end, step, padding, True)
  const formulaStr =
    prefix || suffix
      ? `"${prefix}" & COUNTER(${startValue}, ${endValue}, ${step}, ${padding}, True) & "${suffix}"`
      : `COUNTER(${startValue}, ${endValue}, ${step}, ${padding}, True)`;

  return { rows, formula: formulaStr };
}

export function generateAlphaSequence(
  config: AlphaConfig,
  common: CommonConfig
): { rows: GeneratedRow[]; formula: string } {
  const { startValue, totalQuantity, startLetter, numbersPerLetter } = config;
  const { prefix, suffix } = common;
  const rows: GeneratedRow[] = [];
  const startCode = startLetter.toUpperCase().charCodeAt(0);

  for (let i = 0; i < totalQuantity; i++) {
    const absoluteIndex = startValue - 1 + i;
    const letterOffset = Math.floor(absoluteIndex / numbersPerLetter);
    const numberPart = (absoluteIndex % numbersPerLetter) + 1;
    const letter = String.fromCharCode(startCode + letterOffset);
    const paddedNum = String(numberPart).padStart(3, '0');
    rows.push({
      index: i + 1,
      value: `${prefix}${letter}${paddedNum}${suffix}`
    });
  }

  // Formula using CHR, INT, MOD
  const endValue = startValue + totalQuantity - 1;
  const baseFormula = `CHR(${startCode} + INT((COUNTER(${startValue}, ${endValue}, 1, 0, True) - 1) / ${numbersPerLetter})) & TEXT(MOD(COUNTER(${startValue}, ${endValue}, 1, 0, True) - 1, ${numbersPerLetter}) + 1, "000")`;
  const formulaStr =
    prefix || suffix ? `"${prefix}" & ${baseFormula} & "${suffix}"` : baseFormula;

  return { rows, formula: formulaStr };
}

export function generateRepeatSequence(
  config: RepeatConfig,
  common: CommonConfig
): { rows: GeneratedRow[]; formula: string } {
  const { startValue, totalQuantity, copiesPerSet } = config;
  const { prefix, suffix } = common;
  const rows: GeneratedRow[] = [];
  const padding = String(startValue + Math.ceil(totalQuantity / copiesPerSet)).length;

  for (let i = 0; i < totalQuantity; i++) {
    const setNumber = startValue + Math.floor(i / copiesPerSet);
    const paddedNum = String(setNumber).padStart(padding, '0');
    rows.push({
      index: i + 1,
      value: `${prefix}${paddedNum}${suffix}`
    });
  }

  // Formula: start + INT((COUNTER-1)/copies)
  const endCounter = totalQuantity;
  const baseFormula = `TEXT(${startValue} + INT((COUNTER(1, ${endCounter}, 1, 0, True) - 1) / ${copiesPerSet}), "${'0'.repeat(padding)}")`;
  const formulaStr =
    prefix || suffix ? `"${prefix}" & ${baseFormula} & "${suffix}"` : baseFormula;

  return { rows, formula: formulaStr };
}
