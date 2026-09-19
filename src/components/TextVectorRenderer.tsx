/**
 * TextVectorRenderer - React component for vector-based text rendering
 * 
 * This component uses OpenType.js to convert text to SVG paths,
 * ensuring 100% visual fidelity with PDF export.
 * 
 * It replaces browser-based text rendering (<span>, <svg text>) with
 * precise vector paths calculated by the shared TextRendererUtil.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { loadFont } from '../services/fontService';
import { 
    TextRendererUtil, 
    RenderOutput, 
    TextFitMode, 
    HorizontalAlign, 
    VerticalAlign,
    UnitConversion 
} from '../utils/TextRendererUtil';

export interface TextVectorRendererProps {
    /** Text content to render */
    text: string;
    
    /** Container width in pixels */
    width: number;
    
    /** Container height in pixels */
    height: number;
    
    /** Text scaling mode */
    mode?: TextFitMode;
    
    /** Font family name */
    fontFamily?: string;
    
    /** Font size (for ACTUAL mode) */
    fontSize?: string | number;
    
    /** Font weight */
    fontWeight?: string | number;
    
    /** Font style (normal/italic) */
    fontStyle?: string;
    
    /** Text color */
    color?: string;
    
    /** Horizontal alignment */
    alignH?: HorizontalAlign;
    
    /** Vertical alignment */
    alignV?: VerticalAlign;
    
    /** Text decoration */
    textDecoration?: string;
    
    /** Optional className for the container */
    className?: string;
    
    /** Optional inline styles for the container */
    style?: React.CSSProperties;
    
    /** Callback when rendering is complete */
    onRenderComplete?: (output: RenderOutput) => void;
    
    /** Fallback content while loading */
    fallback?: React.ReactNode;
}

/**
 * Parse font size to pixels for rendering
 */
function parseFontSizeToPx(fontSize: string | number | undefined): number {
    if (fontSize === undefined) return 16;
    
    if (typeof fontSize === 'number') return fontSize;
    
    const num = parseFloat(fontSize);
    if (isNaN(num)) return 16;
    
    if (fontSize.includes('pt')) return num * UnitConversion.PT_TO_PX;
    if (fontSize.includes('mm')) return num * UnitConversion.MM_TO_PX;
    
    return num; // Assume px
}

/**
 * TextVectorRenderer Component
 * 
 * Renders text as SVG vector paths using OpenType.js
 */
export const TextVectorRenderer: React.FC<TextVectorRendererProps> = ({
    text,
    width,
    height,
    mode = 'actual',
    fontFamily = 'UTM Avo',
    fontSize = '16px',
    fontWeight = 'normal',
    fontStyle = 'normal',
    color = '#000000',
    alignH = 'flex-start',
    alignV = 'flex-start',
    textDecoration = 'none',
    className,
    style,
    onRenderComplete,
    fallback
}) => {
    const [renderer, setRenderer] = useState<TextRendererUtil | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Determine if bold/italic simulation is needed
    const isBold = fontWeight === 'bold' || fontWeight === '700' || Number(fontWeight) >= 700;
    const isItalic = fontStyle === 'italic';

    // Load font when fontFamily changes
    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        loadFont(fontFamily, isBold, isItalic)
            .then(util => {
                if (mounted) {
                    setRenderer(util);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (mounted) {
                    console.error('[TextVectorRenderer] Font loading failed:', err);
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => { mounted = false; };
    }, [fontFamily, isBold, isItalic]);

    // Calculate render output
    const renderOutput = useMemo(() => {
        if (!renderer || !text || width <= 0 || height <= 0) {
            return null;
        }

        try {
            const fontSizePx = parseFontSizeToPx(fontSize);
            
            return renderer.calculate({
                text,
                containerWidth: width,
                containerHeight: height,
                mode,
                fontSize: fontSizePx,
                alignH,
                alignV,
                fauxBold: isBold,
                fauxItalic: isItalic,
                underline: textDecoration === 'underline',
                strikethrough: textDecoration === 'line-through'
            });
        } catch (err) {
            console.error('[TextVectorRenderer] Calculation error:', err);
            return null;
        }
    }, [renderer, text, width, height, mode, fontSize, alignH, alignV, isBold, isItalic, textDecoration]);

    // Notify parent when render is complete
    useEffect(() => {
        if (renderOutput && onRenderComplete) {
            onRenderComplete(renderOutput);
        }
    }, [renderOutput, onRenderComplete]);

    // Loading state
    if (loading) {
        return (
            <div className={className} style={{ ...style, width, height }}>
                {fallback || (
                    <span style={{ 
                        fontFamily, 
                        fontSize: parseFontSizeToPx(fontSize),
                        fontWeight: isBold ? 'bold' : 'normal',
                        fontStyle: isItalic ? 'italic' : 'normal',
                        color,
                        opacity: 0.5
                    }}>
                        {text}
                    </span>
                )}
            </div>
        );
    }

    // Error state - fall back to browser rendering
    if (error || !renderOutput) {
        return (
            <div className={className} style={{ ...style, width, height }}>
                <span style={{ 
                    fontFamily: `"${fontFamily}"`, 
                    fontSize: parseFontSizeToPx(fontSize),
                    fontWeight: isBold ? 'bold' : 'normal',
                    fontStyle: isItalic ? 'italic' : 'normal',
                    color,
                    textDecoration
                }}>
                    {text}
                </span>
            </div>
        );
    }

    // Render as SVG with vector paths
    const { pathData, transformMatrix, decorations, boundingBox } = renderOutput;
    const [a, b, c, d, e, f] = transformMatrix;
    const decorationThickness = Math.max(1, boundingBox.height * 0.05);

    return (
        <div className={className} style={{ ...style, width, height, overflow: 'hidden' }}>
            <svg 
                width={width} 
                height={height} 
                viewBox={`0 0 ${width} ${height}`}
                style={{ display: 'block' }}
            >
                {/* Main text path */}
                <g transform={`matrix(${a} ${b} ${c} ${d} ${e} ${f})`}>
                    <path 
                        d={pathData} 
                        fill={color}
                        stroke={isBold ? color : 'none'}
                        strokeWidth={isBold ? boundingBox.height * 0.02 : 0}
                    />
                </g>

                {/* Underline decoration */}
                {decorations?.underline && (
                    <path 
                        d={decorations.underline} 
                        stroke={color} 
                        strokeWidth={decorationThickness}
                        fill="none"
                    />
                )}

                {/* Strikethrough decoration */}
                {decorations?.strikethrough && (
                    <path 
                        d={decorations.strikethrough} 
                        stroke={color} 
                        strokeWidth={decorationThickness}
                        fill="none"
                    />
                )}
            </svg>
        </div>
    );
};

/**
 * Hook for using TextRendererUtil directly
 */
export function useTextRenderer(fontFamily: string, isBold: boolean = false, isItalic: boolean = false) {
    const [renderer, setRenderer] = useState<TextRendererUtil | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        loadFont(fontFamily, isBold, isItalic)
            .then(util => {
                if (mounted) {
                    setRenderer(util);
                    setLoading(false);
                }
            })
            .catch(err => {
                if (mounted) {
                    setError(err);
                    setLoading(false);
                }
            });

        return () => { mounted = false; };
    }, [fontFamily, isBold, isItalic]);

    return { renderer, loading, error };
}

export default TextVectorRenderer;
