import React, { useState } from 'react';
import { Wallet, X, CreditCard } from 'lucide-react';
import { formatCurrency, formatShortAmount } from '../utils';

interface TopUpModalProps {
  isOpen: boolean;
  balance: number;
  onClose: () => void;
  onTopUp: (amount: number, onSuccess: () => void) => void;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, balance, onClose, onTopUp }) => {
  const [topUpAmount, setTopUpAmount] = useState(100000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card'>('bank');

  if (!isOpen) return null;

  const quickAmounts = [100000, 200000, 500000, 1000000, 2000000, 5000000];

  const handleSubmit = () => {
    if (topUpAmount < 100000) {
      alert('Số tiền nạp tối thiểu là 100.000đ');
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      onTopUp(topUpAmount, () => {
        setIsProcessing(false);
        onClose();
        alert(`Nạp tiền thành công! Số dư mới: ${formatCurrency(balance + topUpAmount)}`);
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[1001] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl">
                <Wallet size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Nạp tiền vào ví</h3>
                <p className="text-emerald-100 text-sm">Số dư hiện tại: {formatCurrency(balance)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Quick amounts */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn nhanh</label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  onClick={() => setTopUpAmount(amount)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all ${
                    topUpAmount === amount
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-emerald-50 hover:text-emerald-600'
                  }`}
                >
                  {formatShortAmount(amount)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Hoặc nhập số tiền</label>
            <div className="relative">
              <input
                type="number"
                min={100000}
                step={10000}
                value={topUpAmount}
                onChange={e => setTopUpAmount(Math.max(100000, parseInt(e.target.value) || 100000))}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:border-emerald-500 focus:outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">VNĐ</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Tối thiểu: 100.000đ</p>
          </div>

          {/* Payment method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('bank')}
                className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition-all ${
                  paymentMethod === 'bank'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <CreditCard size={18} />
                Chuyển khoản
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex items-center gap-2 p-3 border-2 rounded-xl text-sm font-medium transition-all ${
                  paymentMethod === 'card'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <CreditCard size={18} />
                Thẻ tín dụng
              </button>
            </div>
          </div>

          {/* Bank info (if bank transfer) */}
          {paymentMethod === 'bank' && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700 mb-2">Thông tin chuyển khoản:</p>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Ngân hàng:</span> <span className="font-medium">Vietcombank</span></p>
                <p><span className="text-gray-500">Số TK:</span> <span className="font-medium">1234567890</span></p>
                <p><span className="text-gray-500">Chủ TK:</span> <span className="font-medium">CONG TY TNHH ABC</span></p>
                <p><span className="text-gray-500">Nội dung:</span> <span className="font-medium text-emerald-600">NAPVI {Date.now()}</span></p>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isProcessing}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                <Wallet size={20} />
                Nạp {formatCurrency(topUpAmount)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
