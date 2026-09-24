import opentype from 'opentype.js';
import {
    TextFitMode,
    HorizontalAlign,
    VerticalAlign,
    FontMetrics,
    RenderOutput,
    CalculationConfig
} from './types';

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
