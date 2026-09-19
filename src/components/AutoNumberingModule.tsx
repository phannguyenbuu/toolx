/**
 * Automatic Numbering Module
 * 
 * Generates variable data sequences for label printing with 3 modes:
 * 1. Standard - Sequential numbering with padding
 * 2. Alpha - Alphanumeric sequences (A001 -> A999 -> B001)
 * 3. Repeat/Carbonless - Repeating sequences for multi-part forms
 */

import React, { useState, useCallback, useMemo } from 'react';

// Types
type NumberingMode = 'standard' | 'alpha' | 'repeat';

interface StandardConfig {
    startValue: number;
    totalQuantity: number;
    step: number;
    padding: number;
}

interface AlphaConfig {
    startValue: number;
    totalQuantity: number;
    startLetter: string;
    numbersPerLetter: number;
}

interface RepeatConfig {
    startValue: number;
    totalQuantity: number;
    copiesPerSet: number;
}

interface CommonConfig {
    prefix: string;
    suffix: string;
}

interface GeneratedRow {
    index: number;
    value: string;
    formula?: string;
}

// FontAwesome icons as inline SVG (to avoid CDN dependency issues)
const Icons = {
    hashtag: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
            <path d="M181.3 32.4c17.4 2.9 29.2 19.4 26.3 36.8L197.8 128h95.1l11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3s29.2 19.4 26.3 36.8L357.8 128H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H347.1L325.8 320H384c17.7 0 32 14.3 32 32s-14.3 32-32 32H315.1l-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.8-58.7H155.1l-11.5 69.3c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8L90.2 384H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.9l21.3-128H64c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.9l11.5-69.3c2.9-17.4 19.4-29.2 36.8-26.3zM187.1 192L165.8 320h95.1l21.3-128H187.1z"/>
        </svg>
    ),
    font: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
            <path d="M254 52.8C249.3 40.3 237.3 32 224 32s-25.3 8.3-30 20.8L57.8 416H32c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32h-1.8l18-48H303.8l18 48H320c-17.7 0-32 14.3-32 32s14.3 32 32 32h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H393.2L254 52.8zM279.8 304H168.2L224 155.1 279.8 304z"/>
        </svg>
    ),
    copy: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
            <path d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z"/>
        </svg>
    ),
    play: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 384 512">
            <path d="M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80V432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z"/>
        </svg>
    ),
    table: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512">
            <path d="M64 256V160H224v96H64zm0 64H224v96H64V320zm224 96V320H448v96H288zM448 256H288V160H448v96zM64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64z"/>
        </svg>
    ),
    code: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 640 512">
            <path d="M392.8 1.2c-17-4.9-34.7 5-39.6 22l-128 448c-4.9 17 5 34.7 22 39.6s34.7-5 39.6-22l128-448c4.9-17-5-34.7-22-39.6zm80.6 120.1c-12.5 12.5-12.5 32.8 0 45.3L562.7 256l-89.4 89.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l112-112c12.5-12.5 12.5-32.8 0-45.3l-112-112c-12.5-12.5-32.8-12.5-45.3 0zm-306.7 0c-12.5-12.5-32.8-12.5-45.3 0l-112 112c-12.5 12.5-12.5 32.8 0 45.3l112 112c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256l89.4-89.4c12.5-12.5 12.5-32.8 0-45.3z"/>
        </svg>
    ),
    clipboard: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 384 512">
            <path d="M280 64h40c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128C0 92.7 28.7 64 64 64h40 9.6C121 27.5 153.3 0 192 0s71 27.5 78.4 64H280zM64 112c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H320c8.8 0 16-7.2 16-16V128c0-8.8-7.2-16-16-16H304v24c0 13.3-10.7 24-24 24H192 104c-13.3 0-24-10.7-24-24V112H64zm128-8a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/>
        </svg>
    ),
    check: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 448 512">
            <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/>
        </svg>
    ),
    download: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512">
            <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"/>
        </svg>
    ),
};

// Props interface
interface AutoNumberingModuleProps {
    onApply?: (data: GeneratedRow[], formula: string) => void;
    onClose?: () => void;
}

export const AutoNumberingModule: React.FC<AutoNumberingModuleProps> = ({ onApply, onClose }) => {
    // State
    const [mode, setMode] = useState<NumberingMode>('standard');
    const [generatedData, setGeneratedData] = useState<GeneratedRow[]>([]);
    const [formula, setFormula] = useState<string>('');
    const [copied, setCopied] = useState(false);

    // Standard mode config
    const [standardConfig, setStandardConfig] = useState<StandardConfig>({
        startValue: 1,
        totalQuantity: 100,
        step: 1,
        padding: 6,
    });

    // Alpha mode config
    const [alphaConfig, setAlphaConfig] = useState<AlphaConfig>({
        startValue: 1,
        totalQuantity: 100,
        startLetter: 'A',
        numbersPerLetter: 999,
    });

    // Repeat mode config
    const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>({
        startValue: 1,
        totalQuantity: 100,
        copiesPerSet: 3,
    });

    // Common config
    const [commonConfig, setCommonConfig] = useState<CommonConfig>({
        prefix: '',
        suffix: '',
    });

    // Generate Standard sequence
    const generateStandard = useCallback((): { rows: GeneratedRow[]; formula: string } => {
        const { startValue, totalQuantity, step, padding } = standardConfig;
        const { prefix, suffix } = commonConfig;
        const rows: GeneratedRow[] = [];
        const endValue = startValue + (totalQuantity - 1) * step;

        for (let i = 0; i < totalQuantity; i++) {
            const num = startValue + i * step;
            const paddedNum = String(num).padStart(padding, '0');
            rows.push({
                index: i + 1,
                value: `${prefix}${paddedNum}${suffix}`,
            });
        }

        // PSM Formula: COUNTER(start, end, step, padding, True)
        const formulaStr = prefix || suffix
            ? `"${prefix}" & COUNTER(${startValue}, ${endValue}, ${step}, ${padding}, True) & "${suffix}"`
            : `COUNTER(${startValue}, ${endValue}, ${step}, ${padding}, True)`;

        return { rows, formula: formulaStr };
    }, [standardConfig, commonConfig]);

    // Generate Alpha sequence (A001 -> A999 -> B001)
    const generateAlpha = useCallback((): { rows: GeneratedRow[]; formula: string } => {
        const { startValue, totalQuantity, startLetter, numbersPerLetter } = alphaConfig;
        const { prefix, suffix } = commonConfig;
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
                value: `${prefix}${letter}${paddedNum}${suffix}`,
            });
        }

        // Formula using CHR, INT, MOD
        // CHR(65 + INT((COUNTER-1)/999)) & TEXT(MOD(COUNTER-1, 999)+1, "000")
        const endValue = startValue + totalQuantity - 1;
        const baseFormula = `CHR(${startCode} + INT((COUNTER(${startValue}, ${endValue}, 1, 0, True) - 1) / ${numbersPerLetter})) & TEXT(MOD(COUNTER(${startValue}, ${endValue}, 1, 0, True) - 1, ${numbersPerLetter}) + 1, "000")`;
        const formulaStr = prefix || suffix
            ? `"${prefix}" & ${baseFormula} & "${suffix}"`
            : baseFormula;

        return { rows, formula: formulaStr };
    }, [alphaConfig, commonConfig]);

    // Generate Repeat/Carbonless sequence
    const generateRepeat = useCallback((): { rows: GeneratedRow[]; formula: string } => {
        const { startValue, totalQuantity, copiesPerSet } = repeatConfig;
        const { prefix, suffix } = commonConfig;
        const rows: GeneratedRow[] = [];
        const padding = String(startValue + Math.ceil(totalQuantity / copiesPerSet)).length;

        for (let i = 0; i < totalQuantity; i++) {
            const setNumber = startValue + Math.floor(i / copiesPerSet);
            const paddedNum = String(setNumber).padStart(padding, '0');
            rows.push({
                index: i + 1,
                value: `${prefix}${paddedNum}${suffix}`,
            });
        }

        // Formula: start + INT((COUNTER-1)/copies)
        const endCounter = totalQuantity;
        const baseFormula = `TEXT(${startValue} + INT((COUNTER(1, ${endCounter}, 1, 0, True) - 1) / ${copiesPerSet}), "${'0'.repeat(padding)}")`;
        const formulaStr = prefix || suffix
            ? `"${prefix}" & ${baseFormula} & "${suffix}"`
            : baseFormula;

        return { rows, formula: formulaStr };
    }, [repeatConfig, commonConfig]);

    // Generate data based on current mode
    const handleGenerate = useCallback(() => {
        let result: { rows: GeneratedRow[]; formula: string };

        switch (mode) {
            case 'standard':
                result = generateStandard();
                break;
            case 'alpha':
                result = generateAlpha();
                break;
            case 'repeat':
                result = generateRepeat();
                break;
            default:
                result = { rows: [], formula: '' };
        }

        setGeneratedData(result.rows);
        setFormula(result.formula);
    }, [mode, generateStandard, generateAlpha, generateRepeat]);

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

    // Mode descriptions
    const modeDescriptions = {
        standard: 'Tạo dãy số tuần tự với số 0 đứng trước (VD: 000001, 000002...)',
        alpha: 'Tạo dãy chữ-số theo bảng chữ cái (VD: A001 → A999 → B001...)',
        repeat: 'Tạo dãy số lặp lại cho in carbonless (VD: 1, 1, 1, 2, 2, 2...)',
    };

    return (
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden">
            <div className="p-6">
                {/* Mode Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <button
                        onClick={() => setMode('standard')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            mode === 'standard'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {Icons.hashtag}
                        <span>Chuẩn</span>
                    </button>
                    <button
                        onClick={() => setMode('alpha')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            mode === 'alpha'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {Icons.font}
                        <span>Chữ-Số (A-Z)</span>
                    </button>
                    <button
                        onClick={() => setMode('repeat')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                            mode === 'repeat'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {Icons.copy}
                        <span>Lặp lại (Carbonless)</span>
                    </button>
                </div>

                {/* Mode Description */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
                    <p className="text-blue-700 text-sm">{modeDescriptions[mode]}</p>
                </div>

                {/* Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {/* Standard Mode Inputs */}
                    {mode === 'standard' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Giá trị bắt đầu
                                </label>
                                <input
                                    type="number"
                                    value={standardConfig.startValue}
                                    onChange={(e) => setStandardConfig({ ...standardConfig, startValue: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={0}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tổng số lượng
                                </label>
                                <input
                                    type="number"
                                    value={standardConfig.totalQuantity}
                                    onChange={(e) => setStandardConfig({ ...standardConfig, totalQuantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bước nhảy
                                </label>
                                <input
                                    type="number"
                                    value={standardConfig.step}
                                    onChange={(e) => setStandardConfig({ ...standardConfig, step: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Độ dài số (padding)
                                </label>
                                <input
                                    type="number"
                                    value={standardConfig.padding}
                                    onChange={(e) => setStandardConfig({ ...standardConfig, padding: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                    max={20}
                                />
                            </div>
                        </>
                    )}

                    {/* Alpha Mode Inputs */}
                    {mode === 'alpha' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Giá trị bắt đầu
                                </label>
                                <input
                                    type="number"
                                    value={alphaConfig.startValue}
                                    onChange={(e) => setAlphaConfig({ ...alphaConfig, startValue: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tổng số lượng
                                </label>
                                <input
                                    type="number"
                                    value={alphaConfig.totalQuantity}
                                    onChange={(e) => setAlphaConfig({ ...alphaConfig, totalQuantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Chữ cái bắt đầu
                                </label>
                                <input
                                    type="text"
                                    value={alphaConfig.startLetter}
                                    onChange={(e) => setAlphaConfig({ ...alphaConfig, startLetter: e.target.value.toUpperCase().slice(0, 1) || 'A' })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 uppercase"
                                    maxLength={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Số mỗi chữ cái
                                </label>
                                <input
                                    type="number"
                                    value={alphaConfig.numbersPerLetter}
                                    onChange={(e) => setAlphaConfig({ ...alphaConfig, numbersPerLetter: parseInt(e.target.value) || 999 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                    max={9999}
                                />
                            </div>
                        </>
                    )}

                    {/* Repeat Mode Inputs */}
                    {mode === 'repeat' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Giá trị bắt đầu
                                </label>
                                <input
                                    type="number"
                                    value={repeatConfig.startValue}
                                    onChange={(e) => setRepeatConfig({ ...repeatConfig, startValue: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Tổng số lượng
                                </label>
                                <input
                                    type="number"
                                    value={repeatConfig.totalQuantity}
                                    onChange={(e) => setRepeatConfig({ ...repeatConfig, totalQuantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Số bản/bộ (copies)
                                </label>
                                <input
                                    type="number"
                                    value={repeatConfig.copiesPerSet}
                                    onChange={(e) => setRepeatConfig({ ...repeatConfig, copiesPerSet: parseInt(e.target.value) || 1 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    min={1}
                                    max={100}
                                />
                            </div>
                        </>
                    )}

                    {/* Common: Prefix & Suffix */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tiền tố (Prefix)
                        </label>
                        <input
                            type="text"
                            value={commonConfig.prefix}
                            onChange={(e) => setCommonConfig({ ...commonConfig, prefix: e.target.value })}
                            placeholder="VD: INV-"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Hậu tố (Suffix)
                        </label>
                        <input
                            type="text"
                            value={commonConfig.suffix}
                            onChange={(e) => setCommonConfig({ ...commonConfig, suffix: e.target.value })}
                            placeholder="VD: -2024"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>

                {/* Generate Button */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={handleGenerate}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        {Icons.play}
                        <span>Tạo dữ liệu</span>
                    </button>
                </div>

                {/* Preview Table */}
                {generatedData.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            {Icons.table}
                            <label className="text-sm font-medium text-gray-700">
                                Xem trước (10 dòng đầu tiên)
                            </label>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">
                                                STT
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                                Giá trị
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {generatedData.slice(0, 10).map((row) => (
                                            <tr key={row.index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {row.index}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 font-mono">
                                                    {row.value}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                Tổng: <strong>{mode === 'standard' ? standardConfig.totalQuantity : mode === 'alpha' ? alphaConfig.totalQuantity : repeatConfig.totalQuantity}</strong> bản ghi
                            </span>
                            {mode === 'repeat' && (
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Số bộ: <strong>{Math.ceil(repeatConfig.totalQuantity / repeatConfig.copiesPerSet)}</strong>
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {generatedData.length > 0 && onApply && (
                    <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3 justify-end">
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Hủy
                            </button>
                        )}
                        <button
                            onClick={handleApply}
                            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                        >
                            {Icons.download}
                            <span>Áp dụng dữ liệu</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutoNumberingModule;
