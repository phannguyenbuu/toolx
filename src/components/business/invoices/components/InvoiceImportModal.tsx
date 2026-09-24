import React from 'react';
import { Download, X, Receipt } from 'lucide-react';
import { PriceCalculatorOrder, formatVND } from '../../../../types/business';

interface InvoiceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftOrders: PriceCalculatorOrder[];
  onSelectOrder: (order: PriceCalculatorOrder) => void;
}

export const InvoiceImportModal: React.FC<InvoiceImportModalProps> = ({
  isOpen,
  onClose,
  draftOrders,
  onSelectOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Download size={18} className="text-indigo-600" />
            Import từ Tính giá
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 max-h-80 overflow-auto space-y-2">
          {draftOrders.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              <Receipt size={32} className="mx-auto mb-2 opacity-50" />
              <p>Không có đơn nháp nào</p>
            </div>
          ) : (
            draftOrders.map(order => (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className="w-full text-left p-3 border rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-slate-800">
                      {order.inputs?.width}x{order.inputs?.height}mm - {order.result?.paperDisplay}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      SL: {parseInt(order.inputs?.quantity || '0', 10).toLocaleString()} | {order.result?.machineName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">{formatVND(order.result?.costs?.total || 0)}</div>
                    <div className="text-[10px] text-slate-400">{order.timestamp}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
