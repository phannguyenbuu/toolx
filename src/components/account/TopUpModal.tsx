import React, { useState } from 'react';
import { X, Wallet, CreditCard, Building2, QrCode, Check, Loader2, Copy, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
  currentBalance: number;
}

const TOPUP_AMOUNTS = [
  { value: 50000, label: '50.000 ₫' },
  { value: 100000, label: '100.000 ₫' },
  { value: 200000, label: '200.000 ₫' },
  { value: 500000, label: '500.000 ₫' },
  { value: 1000000, label: '1.000.000 ₫' },
  { value: 2000000, label: '2.000.000 ₫' },
];

const PAYMENT_METHODS = [
  { id: 'bank', name: 'Chuyển khoản ngân hàng', icon: Building2, description: 'Miễn phí' },
  { id: 'momo', name: 'Ví MoMo', icon: Wallet, description: 'Miễn phí' },
  { id: 'vnpay', name: 'VNPay QR', icon: QrCode, description: 'Miễn phí' },
  { id: 'card', name: 'Thẻ Visa/Mastercard', icon: CreditCard, description: 'Phí 2.5%' },
];

const BANK_INFO = {
  bankName: 'Vietcombank',
  accountNumber: '1234567890123',
  accountName: 'CONG TY TNHH LABEL DESIGNER',
  branch: 'Chi nhánh Hà Nội',
};

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess, currentBalance }) => {
  const [step, setStep] = useState<'amount' | 'method' | 'payment' | 'success'>('amount');
  const [selectedAmount, setSelectedAmount] = useState<number>(100000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('bank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const finalAmount = customAmount ? parseInt(customAmount.replace(/\D/g, '')) : selectedAmount;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('wallet_topup', {
        p_user_id: user.id,
        p_amount: finalAmount,
        p_payment_method: selectedMethod,
        p_description: `Nạp tiền qua ${selectedMethod === 'bank' ? 'Chuyển khoản' : selectedMethod === 'momo' ? 'MoMo' : 'VNPay'}`
      });

      if (error) throw error;
      
      setStep('success');
      onSuccess?.(finalAmount);
    } catch (error) {
      console.error('Topup error:', error);
      alert('Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const handleClose = () => {
    setStep('amount');
    setSelectedAmount(100000);
    setCustomAmount('');
    setSelectedMethod('bank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Nạp tiền vào ví</h2>
              <p className="text-emerald-100 text-sm">Số dư hiện tại: {formatCurrency(currentBalance)}</p>
            </div>
          </div>
        </div>

        {/* Step 1: Select Amount */}
        {step === 'amount' && (
          <div className="p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Chọn số tiền nạp</h3>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {TOPUP_AMOUNTS.map((amount) => (
                <button
                  key={amount.value}
                  onClick={() => { setSelectedAmount(amount.value); setCustomAmount(''); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedAmount === amount.value && !customAmount
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-emerald-300'
                  }`}
                >
                  <span className="font-semibold">{amount.label}</span>
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hoặc nhập số tiền khác
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setCustomAmount(value ? parseInt(value).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Nhập số tiền..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">₫</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Số tiền nạp:</span>
                <span className="text-xl font-bold text-emerald-600">{formatCurrency(finalAmount)}</span>
              </div>
            </div>

            <button
              onClick={() => setStep('method')}
              disabled={finalAmount < 10000}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Tiếp tục
            </button>
          </div>
        )}

        {/* Step 2: Select Payment Method */}
        {step === 'method' && (
          <div className="p-6">
            <button onClick={() => setStep('amount')} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
              ← Quay lại
            </button>
            
            <h3 className="font-semibold text-gray-800 mb-4">Chọn phương thức thanh toán</h3>
            
            <div className="space-y-3 mb-6">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                      selectedMethod === method.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      selectedMethod === method.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-800">{method.name}</p>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <Check className="w-5 h-5 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep('payment')}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
              Tiếp tục
            </button>
          </div>
        )}

        {/* Step 3: Payment Details */}
        {step === 'payment' && (
          <div className="p-6">
            <button onClick={() => setStep('method')} className="text-sm text-gray-500 hover:text-gray-700 mb-4">
              ← Quay lại
            </button>

            {selectedMethod === 'bank' && (
              <>
                <h3 className="font-semibold text-gray-800 mb-4">Thông tin chuyển khoản</h3>
                
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Ngân hàng</span>
                    <span className="font-medium">{BANK_INFO.bankName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Số tài khoản</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-lg">{BANK_INFO.accountNumber}</span>
                      <button
                        onClick={() => handleCopy(BANK_INFO.accountNumber, 'account')}
                        className="p-1 hover:bg-white rounded"
                      >
                        {copied === 'account' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Chủ tài khoản</span>
                    <span className="font-medium text-sm">{BANK_INFO.accountName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Số tiền</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-emerald-600">{formatCurrency(finalAmount)}</span>
                      <button
                        onClick={() => handleCopy(finalAmount.toString(), 'amount')}
                        className="p-1 hover:bg-white rounded"
                      >
                        {copied === 'amount' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Nội dung CK</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">NAPVI {Date.now().toString().slice(-8)}</span>
                      <button
                        onClick={() => handleCopy(`NAPVI ${Date.now().toString().slice(-8)}`, 'content')}
                        className="p-1 hover:bg-white rounded"
                      >
                        {copied === 'content' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Lưu ý:</strong> Vui lòng chuyển khoản đúng số tiền và nội dung. Tiền sẽ được cộng vào ví trong vòng 5-10 phút sau khi chuyển khoản thành công.
                  </p>
                </div>
              </>
            )}

            {selectedMethod !== 'bank' && (
              <div className="text-center py-8">
                <QrCode className="w-32 h-32 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Quét mã QR để thanh toán</p>
                <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(finalAmount)}</p>
              </div>
            )}

            <button
              onClick={handleConfirmPayment}
              disabled={isProcessing}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Tôi đã chuyển khoản'
              )}
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Nạp tiền thành công!</h3>
            <p className="text-gray-500 mb-2">Số tiền đã được cộng vào ví của bạn</p>
            <p className="text-3xl font-bold text-emerald-600 mb-6">{formatCurrency(finalAmount)}</p>
            
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopUpModal;
