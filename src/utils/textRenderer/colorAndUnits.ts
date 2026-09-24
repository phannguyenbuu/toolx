/**
 * Color and Unit Conversion Utilities for Text Rendering
 */

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convert RGB to CMYK (approximate, for display purposes)
 * Note: True CMYK conversion requires ICC profiles
 */
export function rgbToCmyk(r: number, g: number, b: number): { c: number; m: number; y: number; k: number } {
    const r1 = r / 255;
    const g1 = g / 255;
    const b1 = b / 255;

    const k = 1 - Math.max(r1, g1, b1);
    
    if (k === 1) {
        return { c: 0, m: 0, y: 0, k: 1 };
    }

    const c = (1 - r1 - k) / (1 - k);
    const m = (1 - g1 - k) / (1 - k);
    const y = (1 - b1 - k) / (1 - k);

    return { c, m, y, k };
}

/**
 * Unit conversion utilities
 */
export const UnitConversion = {
    MM_TO_PT: 2.83465,
    MM_TO_PX: 3.7795275591,
    PT_TO_PX: 1.3333333333,
    PX_TO_PT: 0.75,

    mmToPt: (mm: number): number => mm * 2.83465,
    mmToPx: (mm: number): number => mm * 3.7795275591,
    ptToPx: (pt: number): number => pt * 1.3333333333,
    pxToPt: (px: number): number => px * 0.75,
    pxToMm: (px: number): number => px / 3.7795275591,
    ptToMm: (pt: number): number => pt / 2.83465
};

/**
 * Parse font size string to numeric value in points
 */
export function parseFontSize(fontSize: string | number | undefined, defaultSize: number = 12): number {
    if (fontSize === undefined) return defaultSize;
    
    if (typeof fontSize === 'number') return fontSize * 0.75; // Assume px, convert to pt
    
    const num = parseFloat(fontSize);
    if (isNaN(num)) return defaultSize;
    
    if (fontSize.includes('pt')) return num;
    if (fontSize.includes('mm')) return num * UnitConversion.MM_TO_PT;
    if (fontSize.includes('px')) return num * UnitConversion.PX_TO_PT;
    
    // Default: assume px
    return num * UnitConversion.PX_TO_PT;
}
