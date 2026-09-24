import React from 'react';
import { Printer, X } from 'lucide-react';
import { Invoice, formatVND, formatDate } from '../../../../types/business';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  config: { company?: any; header?: string; footer?: string };
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  invoice,
  config,
}) => {
  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <style>{`
        @page {
          margin: 8mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white;
          }
          body * {
            visibility: hidden;
          }
          #invoice-print, #invoice-print * {
            visibility: visible;
          }
          #invoice-print {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            max-width: none !important;
            max-height: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          #invoice-print-scroll {
            display: block !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          #invoice-print-inner {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            font-size: 13px !important;
          }
          #invoice-print-inner > div:first-child {
            margin-top: 0 !important;
            padding-top: 0 !important;
          }
        }
      `}</style>
      <div id="invoice-print" className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center shrink-0 print:hidden">
          <h3 className="font-bold text-slate-800">Xem trước hóa đơn - {invoice.invoiceNumber}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
            >
              <Printer size={16} /> In
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500">
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          id="invoice-print-scroll"
          className="flex-1 overflow-auto bg-white print:bg-white print:p-0"
        >
          <div
            id="invoice-print-inner"
            className="bg-white p-8 print:shadow-none print:p-0"
            style={{ fontSize: '13px' }}
          >
            {/* Header */}
            <div className="mb-6 pb-4 border-b">
              <div className="flex items-start gap-4">
                {config.company?.logo && (
                  <img src={config.company.logo} alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" />
                )}
                <div className="flex-1">
                  {config.header ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.header }} />
                  ) : (
                    <div>
                      <h3 className="font-bold text-slate-800">{config.company?.name || 'TÊN CÔNG TY'}</h3>
                      <p className="text-sm text-slate-600">{config.company?.address || 'Địa chỉ công ty'}</p>
                      <p className="text-sm text-slate-600">ĐT: {config.company?.phone || '0xxx xxx xxx'} | Email: {config.company?.email || 'email@company.com'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="py-3 text-center bg-emerald-50 mb-4">
              <h1 className="text-xl font-bold text-emerald-700">HÓA ĐƠN</h1>
              <p className="text-xs text-gray-500">
                Số: {invoice.invoiceNumber} | Ngày: {formatDate(invoice.createdAt)}
                {invoice.dueDate && ` | Hạn TT: ${formatDate(invoice.dueDate)}`}
              </p>
            </div>

            {/* Customer Info */}
            <div className="mb-6 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">Khách hàng:</p>
                  <p className="font-bold">{invoice.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Địa chỉ:</p>
                  <p className="font-medium">{invoice.customerAddress || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Điện thoại:</p>
                  <p className="font-medium">{invoice.customerPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email:</p>
                  <p className="font-medium">{invoice.customerEmail || '-'}</p>
                </div>
                {invoice.customerTaxCode && (
                  <div>
                    <p className="text-gray-500">Mã số thuế:</p>
                    <p className="font-medium">{invoice.customerTaxCode}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse mb-6">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border px-3 py-2 text-left text-xs font-bold">STT</th>
                  <th className="border px-3 py-2 text-left text-xs font-bold">Mô tả</th>
                  <th className="border px-3 py-2 text-center text-xs font-bold">SL</th>
                  <th className="border px-3 py-2 text-right text-xs font-bold">Đơn giá</th>
                  <th className="border px-3 py-2 text-right text-xs font-bold">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id}>
                    <td className="border px-3 py-2 text-center">{index + 1}</td>
                    <td className="border px-3 py-2">
                      <div className="font-medium">{item.description}</div>
                      {item.specifications && <div className="text-xs text-slate-500">{item.specifications}</div>}
                    </td>
                    <td className="border px-3 py-2 text-center">{item.quantity.toLocaleString()}</td>
                    <td className="border px-3 py-2 text-right">{formatVND(item.unitPrice)}</td>
                    <td className="border px-3 py-2 text-right font-medium">{formatVND(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="border px-3 py-2 text-right">Tạm tính:</td>
                  <td className="border px-3 py-2 text-right">{formatVND(invoice.subtotal)}</td>
                </tr>
                {invoice.discountAmount > 0 && (
                  <tr>
                    <td colSpan={4} className="border px-3 py-2 text-right text-red-600">Giảm giá ({invoice.discountPercent}%):</td>
                    <td className="border px-3 py-2 text-right text-red-600">-{formatVND(invoice.discountAmount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} className="border px-3 py-2 text-right">VAT ({invoice.vatPercent}%):</td>
                  <td className="border px-3 py-2 text-right">{formatVND(invoice.vatAmount)}</td>
                </tr>
                <tr className="bg-emerald-50 font-bold">
                  <td colSpan={4} className="border px-3 py-2 text-right">TỔNG CỘNG:</td>
                  <td className="border px-3 py-2 text-right text-emerald-600">{formatVND(invoice.total)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Payment Info */}
            {invoice.payments.length > 0 && (
              <div className="mb-6 p-3 bg-slate-50 rounded text-sm">
                <h4 className="font-bold mb-2">Lịch sử thanh toán:</h4>
                <div className="space-y-1">
                  {invoice.payments.map(p => (
                    <div key={p.id} className="flex justify-between text-green-600">
                      <span>{formatDate(p.date)} - {p.method === 'transfer' ? 'CK' : p.method === 'cash' ? 'TM' : p.method}</span>
                      <span>{formatVND(p.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-1 border-t">
                    <span>Còn lại:</span>
                    <span className={invoice.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatVND(invoice.remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-6 p-3 bg-slate-50 rounded text-sm">
                <strong>Ghi chú:</strong> {invoice.notes}
              </div>
            )}

            {/* Footer */}
            {config.footer && (
              <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.footer }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
