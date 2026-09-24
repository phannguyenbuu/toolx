export const SYSTEM_FONTS = [
  'Tahoma', 'Arial', 'Verdana', 'Georgia', 'Times New Roman', 'Courier New',
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
  'Helvetica', 'sans-serif', 'serif', 'monospace'
];

// Cache fonts.json map: name -> file
let fontFileMap: Map<string, string> | null = null;

export async function getFontFileMap(): Promise<Map<string, string>> {
  if (fontFileMap && fontFileMap.size > 0) return fontFileMap;
  try {
    const res = await fetch('/fonts/fonts.json?v=' + Date.now());
    if (res.ok) {
      const data: Array<{ name: string; file: string }> = await res.json();
      fontFileMap = new Map(data.map(f => [f.name, f.file]));
    }
  } catch (e) {
    console.warn('[getFontFileMap] error', e);
  }
  if (!fontFileMap) fontFileMap = new Map();
  return fontFileMap;
}

export async function loadFontBytes(
  fontFamily: string,
  isBold?: boolean,
  isItalic?: boolean
): Promise<ArrayBuffer | null> {
  try {
    const cleanFamily = fontFamily.replace(/["']/g, '').trim();

    // Skip system fonts
    if (SYSTEM_FONTS.some(sf => cleanFamily.toLowerCase() === sf.toLowerCase())) {
      return null;
    }

    const map = await getFontFileMap();

    // Try to find exact font file from fonts.json
    const exactFile = map.get(cleanFamily);
    if (exactFile) {
      const res = await fetch(`/fonts/${encodeURIComponent(exactFile)}`);
      if (res.ok) return await res.arrayBuffer();
    }

    // Fallback: try by filename pattern
    let variant = '';
    if (isBold && isItalic) variant = 'BoldItalic';
    else if (isBold) variant = 'Bold';
    else if (isItalic) variant = 'Italic';

    const baseName = cleanFamily.replace(/\s+/g, ' ');
    const urlVariants = [
      variant ? `/fonts/${encodeURIComponent(baseName + variant)}.ttf` : null,
      variant ? `/fonts/${encodeURIComponent(baseName + ' ' + variant)}.ttf` : null,
      `/fonts/${encodeURIComponent(baseName)}.ttf`,
    ].filter(Boolean) as string[];

    for (const url of urlVariants) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.arrayBuffer();
      } catch (e) {}
    }

    console.warn(`Font "${cleanFamily}" not found in /fonts/`);
  } catch (err) {
    console.warn(`Could not load font ${fontFamily}:`, err);
  }
  return null;
}

export async function loadDefaultVietnameseFont(): Promise<ArrayBuffer | null> {
  const defaultFonts = ['UTM Agin', 'UTM Avo', 'Roboto'];
  for (const fontName of defaultFonts) {
    const bytes = await loadFontBytes(fontName);
    if (bytes) return bytes;
  }
  return null;
}
