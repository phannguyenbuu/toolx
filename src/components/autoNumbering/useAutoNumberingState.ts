import { useState, useCallback } from 'react';
import {
  NumberingMode,
  StandardConfig,
  AlphaConfig,
  RepeatConfig,
  CommonConfig,
  GeneratedRow
} from './types';
import {
  generateStandardSequence,
  generateAlphaSequence,
  generateRepeatSequence
} from './sequenceGenerators';

export function useAutoNumberingState(
  onApply?: (data: GeneratedRow[], formula: string) => void
) {
  const [mode, setMode] = useState<NumberingMode>('standard');
  const [generatedData, setGeneratedData] = useState<GeneratedRow[]>([]);
  const [formula, setFormula] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Standard mode config
  const [standardConfig, setStandardConfig] = useState<StandardConfig>({
    startValue: 1,
    totalQuantity: 100,
    step: 1,
    padding: 6
  });

  // Alpha mode config
  const [alphaConfig, setAlphaConfig] = useState<AlphaConfig>({
    startValue: 1,
    totalQuantity: 100,
    startLetter: 'A',
    numbersPerLetter: 999
  });

  // Repeat mode config
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>({
    startValue: 1,
    totalQuantity: 100,
    copiesPerSet: 3
  });

  // Common config
  const [commonConfig, setCommonConfig] = useState<CommonConfig>({
    prefix: '',
    suffix: ''
  });

  // Generate data based on current mode
  const handleGenerate = useCallback(() => {
    let result: { rows: GeneratedRow[]; formula: string };

    switch (mode) {
      case 'standard':
        result = generateStandardSequence(standardConfig, commonConfig);
        break;
      case 'alpha':
        result = generateAlphaSequence(alphaConfig, commonConfig);
        break;
      case 'repeat':
        result = generateRepeatSequence(repeatConfig, commonConfig);
        break;
      default:
        result = { rows: [], formula: '' };
    }

    setGeneratedData(result.rows);
    setFormula(result.formula);
  }, [mode, standardConfig, alphaConfig, repeatConfig, commonConfig]);

  // Copy formula to clipboard
  const handleCopyFormula = useCallback(async () => {
    if (formula) {
      await navigator.clipboard.writeText(formula);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [formula]);

  // Apply data
  const handleApply = useCallback(() => {
    if (onApply && generatedData.length > 0) {
      onApply(generatedData, formula);
    }
  }, [onApply, generatedData, formula]);

  return {
    mode,
    setMode,
    generatedData,
    formula,
    copied,
    standardConfig,
    setStandardConfig,
    alphaConfig,
    setAlphaConfig,
    repeatConfig,
    setRepeatConfig,
    commonConfig,
    setCommonConfig,
    handleGenerate,
    handleCopyFormula,
    handleApply
  };
}
