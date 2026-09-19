/**
 * TextRendererUtil - Isomorphic Text Rendering Module
 * 
 * This module serves as the SINGLE SOURCE OF TRUTH for all text rendering
 * calculations across both Frontend (Browser) and Backend (Node.js) environments.
 * 
 * It uses OpenType.js exclusively for:
 * - Text to vector path conversion
 * - Precise text measurement
 * - Transformation matrix calculations for STRETCH/FILL/FIT/ACTUAL modes
 * 
 * This ensures 100% WYSIWYG fidelity between canvas preview and PDF export.
 */

import opentype from 'opentype.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Text scaling modes matching frontend definitions
 */
export type TextFitMode = 'stretch' | 'fill' | 'fit' | 'actual';

/**
 * Text alignment options
 */
export type HorizontalAlign = 'flex-start' | 'center' | 'flex-end';
export type VerticalAlign = 'flex-start' | 'center' | 'flex-end';

/**
 * Style attributes for text rendering
 */
export interface TextStyle {
    fontFamily?: string;
    fontSize?: string | number;
    fontWeight?: string | number;
    fontStyle?: string;
    color?: string;
    textDecoration?: string;
}

/**
 * Element data structure for text elements
 */
export interface TextElement {
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotate?: number;
    textFitMode?: TextFitMode;
    textAlignH?: HorizontalAlign;
    textAlignV?: VerticalAlign;
    textWrap?: boolean;
    style?: TextStyle;
}

/**
 * Bounding box dimensions
 */
export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
}

/**
 * Font metrics from OpenType.js
 */
export interface FontMetrics {
    ascender: number;
    descender: number;
    unitsPerEm: number;
}

/**
 * Standardized output for rendering
 * This is the contract between the calculation logic and renderers
 */
export interface RenderOutput {
    /** SVG path 'd' attribute data */
    pathData: string;
    
    /** Transformation matrix [a, b, c, d, e, f] for SVG/PDF transform */
    transformMatrix: [number, number, number, number, number, number];
    
    /** Precise bounding box after transformation */
    boundingBox: BoundingBox;
    
    /** Position offset for alignment */
    position: { x: number; y: number };
    
    /** Original text metrics */
    metrics: {
        naturalWidth: number;
        naturalHeight: number;
        ascender: number;
        descender: number;
        fontSize: number;
    };
    
    /** Decoration paths (underline, strikethrough) */
    decorations?: {
        underline?: string;
        strikethrough?: string;
    };
}

/**
 * Configuration for text calculation
 */
export interface CalculationConfig {
    /** Text content to render */
    text: string;
    
    /** Container dimensions (in target units, e.g., pt for PDF, px for screen) */
    containerWidth: number;
    containerHeight: number;
    
    /** Text scaling mode */
    mode: TextFitMode;
    
    /** Font size for ACTUAL mode (in target units) */
    fontSize?: number;
    
    /** Text alignment */
    alignH?: HorizontalAlign;
    alignV?: VerticalAlign;
    
    /** Style flags */
    fauxBold?: boolean;
    fauxItalic?: boolean;
    
    /** Text decorations */
    underline?: boolean;
    strikethrough?: boolean;
}

// ============================================================================
// MAIN CLASS
// ============================================================================

export class TextRendererUtil {
    private font: opentype.Font;
    private fontMetrics: FontMetrics;

    constructor(font: opentype.Font) {
        this.font = font;
        this.fontMetrics = {
            ascender: font.ascender,
            descender: font.descender,
            unitsPerEm: font.unitsPerEm
        };
    }

    /**
     * Create instance from ArrayBuffer (works in both browser and Node.js)
     */
    static fromArrayBuffer(buffer: ArrayBuffer): TextRendererUtil {
        const font = opentype.parse(buffer);
        return new TextRendererUtil(font);
    }

    /**
     * Create instance from file path (Node.js only)
     */
    static async fromFile(filePath: string): Promise<TextRendererUtil> {
        const font = await opentype.load(filePath);
        return new TextRendererUtil(font);
    }

    /**
     * Create instance from URL (Browser primarily, works in Node.js with fetch)
     */
    static async fromUrl(url: string): Promise<TextRendererUtil> {
        const font = await opentype.load(url);
        return new TextRendererUtil(font);
    }

    /**
     * Main calculation function - computes all rendering data
     */
    calculate(config: CalculationConfig): RenderOutput {
        const {
            text,
            containerWidth,
            containerHeight,
            mode,
            fontSize = 72,
            alignH = 'flex-start',
            alignV = 'flex-start',
            fauxBold = false,
            fauxItalic = false,
            underline = false,
            strikethrough = false
        } = config;

        // Use a reference font size for path generation
        const refFontSize = 100;
        
        // Get the path at reference size
        const path = this.font.getPath(text, 0, 0, refFontSize);
        const pathBounds = path.getBoundingBox();
        
        // Calculate natural dimensions at reference size
        const naturalWidth = pathBounds.x2 - pathBounds.x1;
        const naturalHeight = this.getTextHeight(refFontSize);
        const ascender = (this.fontMetrics.ascender / this.fontMetrics.unitsPerEm) * refFontSize;
        const descender = (this.fontMetrics.descender / this.fontMetrics.unitsPerEm) * refFontSize;

        // Calculate transformation matrix based on mode
        let matrix = this.calculateTransformMatrix(
            mode,
            naturalWidth,
            naturalHeight,
            containerWidth,
            containerHeight,
            fontSize,
            refFontSize,
            fauxItalic
        );

        // Calculate scaled dimensions
        const [scaleX, , , scaleY] = matrix;
        const scaledWidth = naturalWidth * Math.abs(scaleX);
        const scaledHeight = naturalHeight * Math.abs(scaleY);

        // Calculate alignment offset
        const position = this.calculateAlignmentOffset(
            scaledWidth,
            scaledHeight,
            containerWidth,
            containerHeight,
            alignH,
            alignV,
            mode
        );

        // Adjust matrix translation for alignment and baseline
        // OpenType paths use baseline at y=0, so we need to offset by ascender
        matrix[4] = position.x - pathBounds.x1 * scaleX;
        matrix[5] = position.y + ascender * scaleY;

        // Convert path to SVG path data
        const pathData = path.toPathData(4); // 4 decimal precision

        // Generate decoration paths
        const decorations = this.generateDecorations(
            scaledWidth,
            position,
            scaledHeight,
            ascender * scaleY,
            underline,
            strikethrough
        );

        return {
            pathData,
            transformMatrix: matrix,
            boundingBox: {
                x1: position.x,
                y1: position.y,
                x2: position.x + scaledWidth,
                y2: position.y + scaledHeight,
                width: scaledWidth,
                height: scaledHeight
            },
            position,
            metrics: {
                naturalWidth,
                naturalHeight,
                ascender: ascender * scaleY,
                descender: descender * scaleY,
                fontSize: refFontSize * scaleY
            },
            decorations
        };
    }

    /**
     * Calculate text height based on font metrics
     */
    private getTextHeight(fontSize: number): number {
        const { ascender, descender, unitsPerEm } = this.fontMetrics;
        return ((ascender - descender) / unitsPerEm) * fontSize;
    }

    /**
     * Calculate transformation matrix for different scaling modes
     */
    private calculateTransformMatrix(
        mode: TextFitMode,
        naturalWidth: number,
        naturalHeight: number,
        containerWidth: number,
        containerHeight: number,
        requestedFontSize: number,
        refFontSize: number,
        fauxItalic: boolean
    ): [number, number, number, number, number, number] {
        let scaleX = 1;
        let scaleY = 1;
        const skewX = fauxItalic ? Math.tan(-14 * Math.PI / 180) : 0; // ~14 degrees for italic

        if (naturalWidth <= 0 || naturalHeight <= 0) {
            return [1, 0, skewX, 1, 0, 0];
        }

        switch (mode) {
            case 'stretch':
                // Non-uniform scaling to exactly fill the container
                scaleX = containerWidth / naturalWidth;
                scaleY = containerHeight / naturalHeight;
                break;

            case 'fill':
                // Uniform scaling using the LARGER factor (may overflow)
                const fillScaleX = containerWidth / naturalWidth;
                const fillScaleY = containerHeight / naturalHeight;
                const fillScale = Math.max(fillScaleX, fillScaleY);
                scaleX = fillScale;
                scaleY = fillScale;
                break;

            case 'fit':
                // Uniform scaling using the SMALLER factor (fits within)
                const fitScaleX = containerWidth / naturalWidth;
                const fitScaleY = containerHeight / naturalHeight;
                const fitScale = Math.min(fitScaleX, fitScaleY);
                scaleX = fitScale;
                scaleY = fitScale;
                break;

            case 'actual':
            default:
                // Scale to requested font size
                const actualScale = requestedFontSize / refFontSize;
                scaleX = actualScale;
                scaleY = actualScale;
                break;
        }

        // Return transformation matrix [a, b, c, d, e, f]
        // With skew: [scaleX, 0, skewX * scaleY, scaleY, translateX, translateY]
        return [scaleX, 0, skewX * scaleY, scaleY, 0, 0];
    }

    /**
     * Calculate alignment offset within container
     */
    private calculateAlignmentOffset(
        scaledWidth: number,
        scaledHeight: number,
        containerWidth: number,
        containerHeight: number,
        alignH: HorizontalAlign,
        alignV: VerticalAlign,
        mode: TextFitMode
    ): { x: number; y: number } {
        let x = 0;
        let y = 0;

        // For STRETCH mode, text fills the entire container - no alignment needed
        if (mode === 'stretch') {
            return { x: 0, y: 0 };
        }

        // Horizontal alignment
        switch (alignH) {
            case 'center':
                x = (containerWidth - scaledWidth) / 2;
                break;
            case 'flex-end':
                x = containerWidth - scaledWidth;
                break;
            case 'flex-start':
            default:
                x = 0;
                break;
        }

        // Vertical alignment
        switch (alignV) {
            case 'center':
                y = (containerHeight - scaledHeight) / 2;
                break;
            case 'flex-end':
                y = containerHeight - scaledHeight;
                break;
            case 'flex-start':
            default:
                y = 0;
                break;
        }

        return { x, y };
    }

    /**
     * Generate decoration paths (underline, strikethrough)
     */
    private generateDecorations(
        width: number,
        position: { x: number; y: number },
        height: number,
        ascender: number,
        underline: boolean,
        strikethrough: boolean
    ): { underline?: string; strikethrough?: string } | undefined {
        const decorations: { underline?: string; strikethrough?: string } = {};
        const thickness = Math.max(1, height * 0.05);

        if (underline) {
            const y = position.y + height + thickness;
            decorations.underline = `M ${position.x} ${y} L ${position.x + width} ${y}`;
        }

        if (strikethrough) {
            const y = position.y + height * 0.5;
            decorations.strikethrough = `M ${position.x} ${y} L ${position.x + width} ${y}`;
        }

        if (underline || strikethrough) {
            return decorations;
        }
        return undefined;
    }

    /**
     * Get font metrics
     */
    getMetrics(): FontMetrics {
        return { ...this.fontMetrics };
    }

    /**
     * Measure text width at given font size
     */
    measureTextWidth(text: string, fontSize: number): number {
        const path = this.font.getPath(text, 0, 0, fontSize);
        const bounds = path.getBoundingBox();
        return bounds.x2 - bounds.x1;
    }

    /**
     * Measure text height at given font size
     */
    measureTextHeight(fontSize: number): number {
        return this.getTextHeight(fontSize);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

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

export default TextRendererUtil;
