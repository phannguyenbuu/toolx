import React from 'react';
import { BusinessInfo, SingleDocConfig, DisplaySettings } from '../types';

interface DocumentPreviewPanelProps {
  previewType: 'quote' | 'invoice';
  setPreviewType: (type: 'quote' | 'invoice') => void;
  editData: BusinessInfo;
  currentDocConfig: SingleDocConfig;
  displaySettings: DisplaySettings;
}

export const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  previewType,
  setPreviewType,
  editData,
  currentDocConfig,
  displaySettings,
}) => {
  const isQuote = previewType === 'quote';

  return (
    <div className="bg-white rounded-xl border p-5 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800 text-sm">Xem trước</h3>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setPreviewType('quote')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              isQuote
                ? 'bg-amber-500 text-white shadow'
                : 'text-gray-600 hover:text-amber-600'
            }`}
          >
            📋 Báo giá
          </button>
          <button
            onClick={() => setPreviewType('invoice')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
              !isQuote
                ? 'bg-emerald-500 text-white shadow'
                : 'text-gray-600 hover:text-emerald-600'
            }`}
          >
            🧾 Hóa đơn
          </button>
        </div>
      </div>
      
      {/* Document Preview Container */}
      <div className="border rounded-lg bg-white shadow-inner overflow-hidden max-h-[700px] overflow-y-auto">
        <div className="bg-gradient-to-r from-slate-100 to-slate-50 p-1.5 border-b flex items-center gap-2 sticky top-0">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
          </div>
          <span className="text-[10px] text-gray-500 ml-1">
            {isQuote ? 'BAO-GIA-001.pdf' : 'HOA-DON-001.pdf'}
          </span>
        </div>
        
        <div className="p-4 bg-slate-100">
          <style>{`
            .preview-doc table.table-no-border td,
            .preview-doc table[data-stroke="0"] td {
              border: none !important;
            }
          `}</style>
          <div className="preview-doc bg-white rounded shadow-lg" style={{ minHeight: '500px' }}>
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-start gap-4">
                {editData.logo && (
                  <img src={editData.logo} alt="Logo" className="w-20 h-20 object-contain flex-shrink-0" />
                )}
                {currentDocConfig.headerImage && (
                  <img src={currentDocConfig.headerImage} alt="Header" className="h-16 object-contain" />
                )}
                <div className="flex-1">
                  {currentDocConfig.header ? (
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentDocConfig.header }} />
                  ) : (
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{editData.name || 'TÊN CÔNG TY'}</h2>
                      <p className="text-sm text-gray-600">{editData.address || 'Địa chỉ công ty'}</p>
                      <p className="text-sm text-gray-600">ĐT: {editData.phone || '0xxx xxx xxx'} | Email: {editData.email || 'email@company.com'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className={`py-3 text-center ${isQuote ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <h1 className={`text-xl font-bold ${isQuote ? 'text-amber-700' : 'text-emerald-700'}`}>
                {isQuote ? 'BÁO GIÁ' : 'HÓA ĐƠN'}
              </h1>
              {(displaySettings.showDocumentNumber || displaySettings.showDocumentDate) && (
                <p className="text-xs text-gray-500">
                  {displaySettings.showDocumentNumber && `Số: ${isQuote ? 'BG-2024-001' : 'HD-2024-001'}`}
                  {displaySettings.showDocumentNumber && displaySettings.showDocumentDate && ' | '}
                  {displaySettings.showDocumentDate && `Ngày: ${new Date().toLocaleDateString('vi-VN')}`}
                  {displaySettings.showValidUntil && isQuote && ' | HĐ đến: 25/12/2024'}
                </p>
              )}
            </div>

            {/* Customer Info */}
            <div className="px-4 py-3 border-b">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {displaySettings.showCustomerName && (
                  <div>
                    <p className="text-gray-500">Khách hàng:</p>
                    <p className="font-medium">Công ty ABC</p>
                  </div>
                )}
                {displaySettings.showCustomerAddress && (
                  <div>
                    <p className="text-gray-500">Địa chỉ:</p>
                    <p className="font-medium">123 Đường XYZ, Q.1</p>
                  </div>
                )}
                {displaySettings.showCustomerPhone && (
                  <div>
                    <p className="text-gray-500">Điện thoại:</p>
                    <p className="font-medium">0901 234 567</p>
                  </div>
                )}
                {displaySettings.showCustomerEmail && (
                  <div>
                    <p className="text-gray-500">Email:</p>
                    <p className="font-medium">abc@email.com</p>
                  </div>
                )}
                {displaySettings.showCustomerTaxCode && (
                  <div>
                    <p className="text-gray-500">Mã số thuế:</p>
                    <p className="font-medium">0123456789</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`${isQuote ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <th className="text-left py-2 px-3 font-medium">Hạng mục</th>
                    <th className="text-right py-2 px-3 font-medium">SL</th>
                    <th className="text-right py-2 px-3 font-medium">Đơn giá</th>
                    <th className="text-right py-2 px-3 font-medium">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 px-3">In name card 2 mặt, cán bóng</td>
                    <td className="py-2 px-3 text-right">500</td>
                    <td className="py-2 px-3 text-right">1,200đ</td>
                    <td className="py-2 px-3 text-right font-medium">600,000đ</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-3">In brochure A4 gấp 3</td>
                    <td className="py-2 px-3 text-right">200</td>
                    <td className="py-2 px-3 text-right">3,500đ</td>
                    <td className="py-2 px-3 text-right font-medium">700,000đ</td>
                  </tr>
                  <tr className={`${isQuote ? 'bg-amber-50' : 'bg-emerald-50'} font-bold`}>
                    <td colSpan={3} className="py-2 px-3 text-right">Tổng cộng:</td>
                    <td className="py-2 px-3 text-right">1,300,000đ</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Info (Invoice only) */}
            {!isQuote && displaySettings.showPaymentInfo && (
              <div className="px-4 py-3 bg-gray-50 border-t">
                <h4 className="font-medium text-gray-700 mb-1 text-xs">Thông tin thanh toán:</h4>
                <div className="text-xs text-gray-600">
                  <p>Ngân hàng: {editData.bankName || 'Vietcombank'}</p>
                  <p>STK: {editData.bankAccount || '1234567890'}</p>
                  <p>Chi nhánh: {editData.bankBranch || 'TP.HCM'}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t mt-auto">
              {currentDocConfig.footerImage && (
                <img src={currentDocConfig.footerImage} alt="Footer" className="h-10 object-contain mb-3" />
              )}
              {currentDocConfig.footer ? (
                <div className="prose prose-sm max-w-none text-xs" dangerouslySetInnerHTML={{ __html: currentDocConfig.footer }} />
              ) : (
                <div className="text-xs text-gray-500">
                  <p><strong>Điều khoản:</strong></p>
                  <ul className="list-disc ml-4 mt-1">
                    <li>{isQuote ? 'Báo giá có hiệu lực 15 ngày' : 'Thanh toán trong vòng 7 ngày'}</li>
                    <li>Giá đã bao gồm VAT 10%</li>
                  </ul>
                  {displaySettings.showSignature && (
                    <div className="flex justify-between mt-4 pt-3">
                      <div className="text-center">
                        <p className="font-medium">Người lập</p>
                        <p className="text-[10px] text-gray-400 mt-8">(Ký, ghi rõ họ tên)</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">Khách hàng</p>
                        <p className="text-[10px] text-gray-400 mt-8">(Ký, ghi rõ họ tên)</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-3 text-center">
        💡 Thay đổi nội dung Header/Footer ở phần bên trái để cập nhật preview
      </p>
    </div>
  );
};
