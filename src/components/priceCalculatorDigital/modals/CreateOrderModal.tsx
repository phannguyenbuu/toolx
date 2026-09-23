import React, { useState } from 'react';
import { CalcOption } from '../../../utils/calculatorTypes';
import { formatVND } from '../helpers';

interface CreateOrderModalProps {
  orderOpt: CalcOption | null;
  onClose: () => void;
  onConfirm: (customerName: string) => void;
  customers: Array<{ id: string | number; name: string; phone?: string }>;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  orderOpt,
  onClose,
  onConfirm,
  customers
}) => {
  const [orderCustomerName, setOrderCustomerName] = useState('');

  if (!orderOpt) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg text-slate-800">Tạo đơn hàng</h3>
        <div className="text-sm text-slate-600">
          <div>
            {orderOpt.machineName} — {orderOpt.paperDisplay}
          </div>
          <div className="font-bold text-cyan-700 text-lg mt-1">
            {formatVND(orderOpt.costs.total)}
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-slate-500 block mb-1">Khách hàng</label>
          <select
            value={orderCustomerName}
            onChange={(e) => setOrderCustomerName(e.target.value)}
            className="w-full p-2 border rounded text-sm mb-2 bg-white cursor-pointer"
          >
            <option value="">— Khách vãng lai —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
                {c.phone ? ` (${c.phone})` : ''}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Hoặc nhập tên khách mới..."
            value={orderCustomerName}
            onChange={(e) => setOrderCustomerName(e.target.value)}
            className="w-full p-2 border rounded text-sm bg-white"
            list="customer-suggestions"
          />
          <datalist id="customer-suggestions">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              onConfirm(orderCustomerName || 'Khách vãng lai');
              setOrderCustomerName('');
            }}
            className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-emerald-700 cursor-pointer"
          >
            ✓ Xác nhận
          </button>
          <button
            onClick={() => {
              onClose();
              setOrderCustomerName('');
            }}
            className="px-4 bg-slate-100 text-slate-600 py-2 rounded-lg font-bold text-sm hover:bg-slate-200 cursor-pointer"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
};
