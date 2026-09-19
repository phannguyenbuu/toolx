import { DigitalConfig, ClickTableEntry } from '../contexts/PrintConfigContext';

export const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);
export const formatMM = (n: number) => Math.floor(n);
export const copyToClipboard = (text: string) => navigator.clipboard.writeText(text).catch(() => {});

export const FINISHING_TYPES = ["Bế Demi", "Cấn đường", "Cán màng", "UV Định hình", "Ép kim", "Đóng cuốn", "Dán bao thư", "Bồi carton", "Khác"];
export const ALL_CUT_PATTERNS = [{x:1,y:1},{x:1,y:2},{x:2,y:1},{x:2,y:2},{x:2,y:3},{x:3,y:2},{x:2,y:4},{x:3,y:3},{x:4,y:2},{x:4,y:3}];

export function getClickCount(paperLength: number, clickTable: ClickTableEntry[]): number {
  if (clickTable.length === 0) return 1;
  const sorted = [...clickTable].sort((a, b) => a.maxLength - b.maxLength);
  for (const entry of sorted) {
    if (paperLength <= entry.maxLength) return entry.clicks;
  }
  return sorted[sorted.length - 1].clicks;
}

/** Calculate digital print cost correctly: click × printSides × totalPrintSheets (not totalBigSheets) */
export function calcDigitalPrintCost(
  clickPrice: number,
  clicks: number,
  printSides: number,
  totalPrintSheets: number
): number {
  return clickPrice * clicks * printSides * totalPrintSheets;
}

/**
 * Calculate paper cost for pre-cut preferred paper.
 * Uses ratio of pre-cut area to full sheet area × full sheet price.
 */
export function calcPreferredPaperCost(
  prefWidth: number, prefHeight: number,
  fullSheetWidth: number, fullSheetHeight: number, fullSheetPrice: number,
  totalSheets: number
): number {
  const ratio = (prefWidth * prefHeight) / (fullSheetWidth * fullSheetHeight);
  return Math.ceil(ratio * fullSheetPrice) * totalSheets;
}
