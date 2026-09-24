import { CalcOption, InputState, FinishingItem } from './types';

export const formatVND = (n: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

export const formatMM = (n: number) => Math.floor(n);

export const copyToClipboard = (text: string) =>
  navigator.clipboard.writeText(text).catch(() => {});

export const getQuoteText = (
  opt: CalcOption,
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
  const extrasText = extraFinishings
    .map((e) => e.name)
    .filter(Boolean)
    .join(', ');

  return `--- BÁO GIÁ IN OFFSET ---
Ngày: ${new Date().toLocaleString('vi-VN')}
Kích thước: ${inputs.width} x ${inputs.height} mm
Số lượng: ${qty.toLocaleString('vi-VN')}
Quy cách: In ${inputs.printSides === 1 ? '1 mặt' : '2 mặt'}
Giấy: ${opt.paperDisplay}
Gia công: ${[laminationText, extrasText].filter(Boolean).join(', ') || 'Không có'}
-------------------------
ĐƠN GIÁ: ${formatVND(unitPrice)}/sản phẩm
TỔNG CỘNG: ${formatVND(opt.costs.total)}`;
};
