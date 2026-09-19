/**
 * Font Service - Client-side font loading and caching
 * 
 * This service handles loading font files from the server and parsing them
 * with OpenType.js for use in vector-based text rendering.
 */

import opentype from 'opentype.js';
import { TextRendererUtil } from '../utils/TextRendererUtil';

// Font cache to avoid reloading
const fontCache = new Map<string, TextRendererUtil>();
const loadingPromises = new Map<string, Promise<TextRendererUtil>>();

// Backend URL for font files - uses proxy
const BACKEND_URL = '';

/**
 * Get the font file URL for a given font family
 */
function getFontUrl(fontFamily: string, isBold: boolean = false, isItalic: boolean = false): string {
    // Clean font family name
    const cleanFamily = fontFamily.replace(/["']/g, '').trim();
    
    // Build variant suffix
    let variant = '';
    if (isBold && isItalic) {
        variant = 'BoldItalic';
    } else if (isBold) {
        variant = 'Bold';
    } else if (isItalic) {
        variant = 'Italic';
    }
    
    const fileName = variant ? `${cleanFamily}${variant}.ttf` : `${cleanFamily}.ttf`;
    return `${BACKEND_URL}/fonts/${encodeURIComponent(fileName)}`;
}

/**
 * Load a font and create a TextRendererUtil instance
 */
export async function loadFont(
    fontFamily: string,
    isBold: boolean = false,
    isItalic: boolean = false
): Promise<TextRendererUtil> {
    const cacheKey = `${fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
    
    // Check cache first
    if (fontCache.has(cacheKey)) {
        return fontCache.get(cacheKey)!;
    }
    
    // Check if already loading
    if (loadingPromises.has(cacheKey)) {
        return loadingPromises.get(cacheKey)!;
    }
    
    // Start loading
    const loadPromise = (async () => {
        try {
            // Try to load the specific variant first
            const url = getFontUrl(fontFamily, isBold, isItalic);
            console.log(`[FontService] Loading font: ${url}`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                // If variant not found, try base font
                if (isBold || isItalic) {
                    console.log(`[FontService] Variant not found, trying base font`);
                    const baseUrl = getFontUrl(fontFamily, false, false);
                    const baseResponse = await fetch(baseUrl);
                    
                    if (!baseResponse.ok) {
                        throw new Error(`Font not found: ${fontFamily}`);
                    }
                    
                    const buffer = await baseResponse.arrayBuffer();
                    const renderer = TextRendererUtil.fromArrayBuffer(buffer);
                    fontCache.set(cacheKey, renderer);
                    return renderer;
                }
                throw new Error(`Font not found: ${fontFamily}`);
            }
            
            const buffer = await response.arrayBuffer();
            const renderer = TextRendererUtil.fromArrayBuffer(buffer);
            fontCache.set(cacheKey, renderer);
            
            console.log(`[FontService] Font loaded successfully: ${fontFamily}`);
            return renderer;
        } catch (error) {
            console.error(`[FontService] Failed to load font: ${fontFamily}`, error);
            
            // Try fallback fonts
            const fallbacks = ['UTM Avo', 'Roboto', 'Arial'];
            for (const fallback of fallbacks) {
                if (fallback !== fontFamily) {
                    try {
                        const fallbackUrl = getFontUrl(fallback, false, false);
                        const response = await fetch(fallbackUrl);
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            const renderer = TextRendererUtil.fromArrayBuffer(buffer);
                            fontCache.set(cacheKey, renderer);
                            console.log(`[FontService] Using fallback font: ${fallback}`);
                            return renderer;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
            
            throw error;
        } finally {
            loadingPromises.delete(cacheKey);
        }
    })();
    
    loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
}

/**
 * Preload multiple fonts
 */
export async function preloadFonts(fontFamilies: string[]): Promise<void> {
    const unique = Array.from(new Set(fontFamilies));
    await Promise.all(unique.map(family => loadFont(family).catch(() => null)));
}

/**
 * Check if a font is already loaded
 */
export function isFontLoaded(fontFamily: string, isBold: boolean = false, isItalic: boolean = false): boolean {
    const cacheKey = `${fontFamily}-${isBold ? 'b' : ''}-${isItalic ? 'i' : ''}`;
    return fontCache.has(cacheKey);
}

/**
 * Clear font cache
 */
export function clearFontCache(): void {
    fontCache.clear();
}

/**
 * Get available fonts from server
 */
export async function getAvailableFonts(): Promise<string[]> {
    try {
        const response = await fetch(`${BACKEND_URL}/api/fonts`);
        if (response.ok) {
            const data = await response.json();
            return data.fonts || [];
        }
    } catch (error) {
        console.error('[FontService] Failed to get available fonts:', error);
    }
    return [];
}

export default {
    loadFont,
    preloadFonts,
    isFontLoaded,
    clearFontCache,
    getAvailableFonts
};
