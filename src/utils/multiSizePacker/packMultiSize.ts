import { PackItem, PackedItem, PackResult } from './types';
import { MaxRectsSheetPacker } from './MaxRectsSheetPacker';
import { shelfPackSequential } from './shelfPackSequential';
import { shelfPackLayerByLayer } from './shelfPackVariants';

/**
 * Check if any two placed items on the same sheet overlap
 */
export function hasOverlap(items: PackedItem[]): boolean {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if ((a.sheetIndex ?? 0) !== (b.sheetIndex ?? 0)) continue;
      const overlapX = a.x < b.x + b.w && a.x + a.w > b.x;
      const overlapY = a.y < b.y + b.h && a.y + a.h > b.y;
      if (overlapX && overlapY) return true;
    }
  }
  return false;
}

/**
 * Sequential 2D MaxRects bin packing preserving Layer A -> B -> C order
 * and intelligently inserting items into any open pocket or free rectangular space
 */
export function maxRectsPackSequential(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowRotation: boolean = true,
  allowMultiSheet: boolean = true,
  heuristic: 'bottom-left' | 'best-short-side' | 'best-area' = 'bottom-left'
): { items: PackedItem[]; totalSheets: number; skipped: number } {
  const sheets: MaxRectsSheetPacker[] = [new MaxRectsSheetPacker(sheetW, sheetH, padding)];
  let skipped = 0;

  for (const item of items) {
    const isSpecialShape = ['trapezoid', 'triangle', 'hexagon'].includes(item.shape || '');
    const canRotate = allowRotation && !isSpecialShape && (item.canRotate !== false);

    let placed = false;

    // Check existing sheets (from sheet 0 to current active sheet to fill all pockets)
    for (let sIdx = 0; sIdx < sheets.length; sIdx++) {
      const sheet = sheets[sIdx];
      const pos = sheet.findPosition(item.w, item.h, canRotate, heuristic);
      if (pos) {
        sheet.placeRect(pos, item, sIdx);
        placed = true;
        break;
      }
    }

    if (!placed) {
      if (allowMultiSheet) {
        const newSheet = new MaxRectsSheetPacker(sheetW, sheetH, padding);
        const sIdx = sheets.length;
        const pos = newSheet.findPosition(item.w, item.h, canRotate, heuristic);
        if (pos) {
          newSheet.placeRect(pos, item, sIdx);
          sheets.push(newSheet);
          placed = true;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
  }

  const allPlaced: PackedItem[] = [];
  sheets.forEach(s => allPlaced.push(...s.placedItems));

  // Fallback to sequential shelf pack if any overlap is detected
  if (hasOverlap(allPlaced)) {
    return shelfPackSequential(items, sheetW, sheetH, padding, allowRotation, allowMultiSheet);
  }

  return { items: allPlaced, totalSheets: sheets.length, skipped };
}

/**
 * Main entry: pack multiple items of different sizes onto sheets
 * Returns multiple plan options, with 2D Insertion-point (MaxRects) packing as top priority
 */
export function packMultiSize(
  items: PackItem[],
  sheetW: number,
  sheetH: number,
  padding: number,
  allowMultiSheet: boolean = true,
  allowRotation: boolean = true
): PackResult[] {
  if (items.length === 0) return [];

  const results: PackResult[] = [];
  const canRot = allowRotation;

  // Plan 1: Điểm chèn tối ưu 2D (A→B→C + Lấp đầy khoảng trống)
  const p1 = maxRectsPackSequential(items, sheetW, sheetH, padding, canRot, allowMultiSheet, 'bottom-left');
  if (p1.items.length > 0) {
    results.push({
      name: canRot ? 'Điểm chèn tối ưu 2D (A→B→C + Lấp đầy khoảng trống)' : 'Điểm chèn tối ưu 2D (Giữ nguyên hướng)',
      items: p1.items,
      totalSheets: p1.totalSheets,
      skipped: p1.skipped
    });
  }

  // Plan 2: Điểm chèn khít cạnh 2D (A→B→C + Xoay tối ưu)
  const p2 = maxRectsPackSequential(items, sheetW, sheetH, padding, canRot, allowMultiSheet, 'best-short-side');
  if (p2.items.length > 0) {
    results.push({
      name: canRot ? 'Điểm chèn khít cạnh 2D (A→B→C + Xoay tối ưu)' : 'Điểm chèn khít cạnh 2D (Giữ nguyên hướng)',
      items: p2.items,
      totalSheets: p2.totalSheets,
      skipped: p2.skipped
    });
  }

  // Plan 3: Điểm chèn 2D (A→B→C) + Giữ nguyên hướng
  const p3 = maxRectsPackSequential(items, sheetW, sheetH, padding, false, allowMultiSheet, 'bottom-left');
  if (p3.items.length > 0) {
    results.push({
      name: 'Điểm chèn 2D (A→B→C) + Giữ nguyên hướng',
      items: p3.items,
      totalSheets: p3.totalSheets,
      skipped: p3.skipped
    });
  }

  // Plan 4: Hàng chuẩn theo thứ tự (A→B→C)
  const p4 = shelfPackSequential(items, sheetW, sheetH, padding, canRot, allowMultiSheet);
  if (p4.items.length > 0) {
    results.push({
      name: canRot ? 'Hàng chuẩn theo thứ tự (A→B→C)' : 'Hàng chuẩn theo thứ tự (Giữ nguyên hướng)',
      items: p4.items,
      totalSheets: p4.totalSheets,
      skipped: p4.skipped
    });
  }

  // Plan 5: Hàng chuẩn theo Layer (A→B→C)
  const p5 = shelfPackLayerByLayer(items, sheetW, sheetH, padding, canRot, allowMultiSheet);
  if (p5.items.length > 0) {
    results.push({
      name: canRot ? 'Hàng chuẩn theo Layer (A→B→C)' : 'Hàng chuẩn theo Layer (Giữ nguyên hướng)',
      items: p5.items,
      totalSheets: p5.totalSheets,
      skipped: p5.skipped
    });
  }

  // Plan 6: Tự do tối đa tem (Xếp tự do 2D)
  const sortedFree = [...items].sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const p6 = maxRectsPackSequential(sortedFree, sheetW, sheetH, padding, canRot, allowMultiSheet, 'best-short-side');
  if (p6.items.length > 0) {
    results.push({
      name: canRot ? 'Tự do tối đa tem (Xếp tự do 2D)' : 'Tự do tối đa tem (Giữ nguyên hướng)',
      items: p6.items,
      totalSheets: p6.totalSheets,
      skipped: p6.skipped
    });
  }

  // Deduplicate results
  const unique: PackResult[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const key = `${r.items.length}-${r.totalSheets}-${r.name}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }

  return unique;
}
