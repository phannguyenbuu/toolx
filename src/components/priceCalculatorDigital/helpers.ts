import { CalcOption, FinishingItem, InputState } from '../../utils/calculatorTypes';

export const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const formatMM = (n: number) => Math.floor(n);

export const copyToClipboard = (text: string) =>
  navigator.clipboard.writeText(text).catch(() => {});

export const FINISHING_TYPES = [
  "Bế Demi",
  "Cấn đường",
  "Cán màng",
  "UV Định hình",
  "Ép kim",
  "Đóng cuốn",
  "Dán bao thư",
  "Bồi carton",
  "Khác"
];

export const ALL_CUT_PATTERNS = [
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 2, y: 1 },
  { x: 2, y: 2 },
  { x: 2, y: 3 },
  { x: 3, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 3 },
  { x: 4, y: 2 },
  { x: 4, y: 3 }
];

export const getQuoteText = (
  opt: CalcOption & { digitalClicks?: number },
  inputs: InputState,
  extraFinishings: FinishingItem[]
): string => {
  const qty = parseInt(inputs.quantity) || 1;
  const unitPrice = qty > 0 ? Math.round(opt.costs.total / qty) : 0;
  const laminationText =
    inputs.lamination === 'none'
      ? ''
      : inputs.lamination === '1side'
      ? 'Cán màng 1 mặt'
      : 'Cán màng 2 mặt';
  const extrasText = extraFinishings.map((e) => e.name).filter(Boolean).join(', ');
  const clickInfo = opt.digitalClicks
    ? `\nIn Digital: ${opt.digitalClicks} click × ${inputs.printSides} mặt × ${opt.totalBigSheets} tờ = ${formatVND(opt.costs.print)}`
    : '';

  return `--- BÁO GIÁ IN DIGITAL ---\nNgày: ${new Date().toLocaleString('vi-VN')}\nKích thước: ${inputs.width} x ${inputs.height} mm\nSố lượng: ${qty.toLocaleString('vi-VN')}\nQuy cách: In ${inputs.printSides === 1 ? "1 mặt" : "2 mặt"}\nGiấy: ${opt.paperDisplay}${clickInfo}\nGia công: ${[laminationText, extrasText].filter(Boolean).join(', ') || 'Không có'}\n-------------------------\nĐƠN GIÁ: ${formatVND(unitPrice)}/sản phẩm\nTỔNG CỘNG: ${formatVND(opt.costs.total)}`;
};
