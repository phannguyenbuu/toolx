// Load a font into the browser so Konva canvas can render it
export const browserFontCache = new Set<string>();

export async function loadBrowserFont(fontFamily: string): Promise<void> {
  if (!fontFamily || browserFontCache.has(fontFamily)) return;
  try {
    const res = await fetch('/fonts/fonts.json');
    if (!res.ok) return;
    const data: Array<{ name: string; file: string }> = await res.json();
    const entry = data.find(f => f.name === fontFamily);
    if (!entry) return;
    const font = new FontFace(fontFamily, `url('/fonts/${encodeURIComponent(entry.file)}')`);
    const loaded = await font.load();
    document.fonts.add(loaded);
    browserFontCache.add(fontFamily);
  } catch (e) {
    console.warn('[loadBrowserFont] failed:', fontFamily, e);
  }
}
