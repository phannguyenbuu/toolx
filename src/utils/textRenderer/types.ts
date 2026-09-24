/**
 * TextRendererUtil - Type Definitions
 */

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
