# PATCH: TopUpModal - Add QR Code & Manual Verify

## Install
```bash
npm install qrcode.react
```

## File: src/components/account/TopUpModal.tsx

### Step 1: Import (after line 2)
```typescript
import QRCode from 'qrcode.react';
```

### Step 2: Add state for verification (after line 45)
```typescript
const [verificationCode, setVerificationCode] = useState<string>('');
const [isVerifying, setIsVerifying] = useState(false);
```

### Step 3: Generate QR content (after line 50)
```typescript
// Generate VietQR content
const qrContent = `2|99|${BANK_INFO.accountNumber}|${BANK_INFO.accountName}|${finalAmount}|${verificationCode}|0|0|${finalAmount}`;
```

### Step 4: Generate verification code on mount
```typescript
React.useEffect(() => {
  if (isOpen && step === 'payment') {
    // Generate unique code: TXN-timestamp
    const code = `TXN-${Date.now().toString().slice(-8)}`;
    setVerificationCode(code);
  }
}, [isOpen, step]);
```

### Step 5: Add QR display in payment step (find payment step render)
Add after bank info:
```typescript
{/* QR Code */}
<div className="flex justify-center my-6">
  <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
    <QRCode 
      value={qrContent}
      size={200}
      level="M"
    />
    <p className="text-xs text-center text-gray-500 mt-2">
      Quét mã QR để chuyển khoản
    </p>
  </div>
</div>

{/* Verification Code */}
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
  <p className="text-sm font-medium text-amber-800 mb-2">
    Nội dung chuyển khoản:
  </p>
  <div className="flex items-center gap-2">
    <code className="flex-1 px-3 py-2 bg-white rounded border text-sm font-mono">
      {verificationCode}
    </code>
    <button
      onClick={() => handleCopy(verificationCode, 'code')}
      className="p-2 hover:bg-amber-100 rounded"
    >
      {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
    </button>
  </div>
  <p className="text-xs text-amber-600 mt-2">
    ⚠️ Vui lòng nhập chính xác nội dung này khi chuyển khoản
  </p>
</div>
```

### Step 6: Add manual verify button
```typescript
<button
  onClick={async () => {
    setIsVerifying(true);
    // Simulate verification (replace with real API call)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsVerifying(false);
    setStep('success');
    onSuccess?.(finalAmount);
  }}
  disabled={isVerifying}
  className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
>
  {isVerifying ? (
    <>
      <Loader2 size={16} className="animate-spin" />
      Đang xác minh...
    </>
  ) : (
    <>
      <CheckCircle size={16} />
      Tôi đã chuyển khoản
    </>
  )}
</button>
```

## Test
1. Click "Nạp tiền"
2. Chọn số tiền
3. Chọn "Chuyển khoản"
4. Thấy QR code + verification code
5. Click "Tôi đã chuyển khoản"

Done!
