import { LayoutItem, getImpositionCacheKey } from '../../utils/calculatorTypes';

// Constants
export const ALL_CUT_PATTERNS = [
  { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 2 },
  { x: 2, y: 3 }, { x: 3, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 3 },
  { x: 4, y: 2 }, { x: 4, y: 3 }
];

// Caches (PA4 - Memoization)
const impositionCache = new Map<string, { count: number; items: LayoutItem[]; splitType: string; cols: number; rows: number; contentCenterX?: number; contentCenterY?: number }>();
const MAX_CACHE_SIZE = 1000;

// Helper to manage cache size
export function addToCache<K, V>(cache: Map<K, V>, key: K, value: V) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, value);
}

// Calculation helpers
export function getCutLayout(paperW: number, paperH: number, cutX: number, cutY: number) {
  const items: LayoutItem[] = [];
  const itemW = paperW / cutX, itemH = paperH / cutY;
  for (let x = 0; x < cutX; x++) {
    for (let y = 0; y < cutY; y++) {
      items.push({ x: x * itemW, y: y * itemH, w: itemW, h: itemH });
    }
  }
  return { items, printW: itemW, printH: itemH };
}

export function generateGrid(startX: number, startY: number, areaW: number, areaH: number, w: number, h: number, rotate: boolean) {
  const cols = Math.floor(areaW / w), rows = Math.floor(areaH / h);
  const list: LayoutItem[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      list.push({ x: startX + c * w, y: startY + r * h, w, h, rotate });
    }
  }
  return list;
}

export function calculateImposition(
  sheetW: number,
  sheetH: number,
  prodW: number,
  prodH: number,
  symmetryMode: string,
  printSides: number,
  gripperMargin: number,
  useBleed: boolean,
  bleedMargin: number
) {
  // Check cache first (PA4)
  const cacheKey = getImpositionCacheKey(sheetW, sheetH, prodW, prodH, symmetryMode, printSides, gripperMargin, useBleed, bleedMargin);
  const cached = impositionCache.get(cacheKey);
  if (cached) return cached;

  const safeW = sheetW, safeH = sheetH - gripperMargin;
  const bleed = useBleed ? (bleedMargin * 2) : 0;
  const itemW = prodW + bleed, itemH = prodH + bleed;

  if (itemW > safeW || itemH > safeH) {
    const result = { count: 0, items: [] as LayoutItem[], splitType: 'none', cols: 0, rows: 0 };
    addToCache(impositionCache, cacheKey, result);
    return result;
  }

  let bestResult = { count: 0, items: [] as LayoutItem[], splitType: 'none', cols: 0, rows: 0 };

  const getBestGrid = (allowV: boolean, allowH: boolean) => {
    let res = { count: 0, items: [] as LayoutItem[], splitType: 'none', cols: 0, rows: 0 };
    if (allowV) {
      const g1 = generateGrid(0, 0, safeW, safeH, itemW, itemH, false);
      const cols = Math.floor(safeW / itemW);
      if (!(symmetryMode === 'vertical' && cols % 2 !== 0) && g1.length > res.count) {
        res = { count: g1.length, items: g1, splitType: 'vertical', cols, rows: 0 };
      }
    }
    if (allowH) {
      const g2 = generateGrid(0, 0, safeW, safeH, itemH, itemW, true);
      const rows = Math.floor(safeH / itemW);
      if (!(symmetryMode === 'horizontal' && rows % 2 !== 0) && g2.length > res.count) {
        res = { count: g2.length, items: g2, splitType: 'horizontal', cols: 0, rows };
      }
    }
    return res;
  };

  if (printSides === 2) {
    if (symmetryMode === 'vertical') bestResult = getBestGrid(true, false);
    else if (symmetryMode === 'horizontal') bestResult = getBestGrid(false, true);
    else {
      const v = getBestGrid(true, false), h = getBestGrid(false, true);
      const vIsEven = v.count > 0 && v.cols % 2 === 0, hIsEven = h.count > 0 && h.rows % 2 === 0;
      if (vIsEven && !hIsEven) bestResult = v;
      else if (!vIsEven && hIsEven) bestResult = h;
      else bestResult = v.count >= h.count ? v : h;
    }
  } else {
    const maxCols = Math.floor(safeW / itemW);
    for (let c = 0; c <= maxCols; c++) {
      const splitX = c * itemW, remainW = safeW - splitX;
      const g1 = generateGrid(0, 0, splitX, safeH, itemW, itemH, false);
      const g2 = generateGrid(splitX, 0, remainW, safeH, itemH, itemW, true);
      if (g1.length + g2.length > bestResult.count) {
        bestResult = { count: g1.length + g2.length, items: [...g1, ...g2], splitType: 'mixed', cols: 0, rows: 0 };
      }
    }
  }

  // Center the layout
  if (bestResult.count > 0) {
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    bestResult.items.forEach(item => {
      if (item.x < minX) minX = item.x;
      if (item.y < minY) minY = item.y;
      if (item.x + item.w > maxX) maxX = item.x + item.w;
      if (item.y + item.h > maxY) maxY = item.y + item.h;
    });
    const usedWidth = maxX - minX, usedHeight = maxY - minY;
    const offsetX = (safeW - usedWidth) / 2 - minX;
    const offsetY = (safeH - usedHeight) / 2 + gripperMargin - minY;
    const centeredItems = bestResult.items.map(item => ({ ...item, x: item.x + offsetX, y: item.y + offsetY }));
    const result = {
      ...bestResult,
      items: centeredItems,
      contentCenterX: offsetX + usedWidth / 2,
      contentCenterY: offsetY + usedHeight / 2
    };
    addToCache(impositionCache, cacheKey, result);
    return result;
  }

  addToCache(impositionCache, cacheKey, bestResult);
  return bestResult;
}
