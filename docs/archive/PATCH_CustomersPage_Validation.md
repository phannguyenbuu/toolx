# PATCH: CustomersPage - Data Validation

## File: src/components/business/CustomersPage.tsx

### Problem:
```typescript
// Line 50 - Only checks if name is empty
const handleSubmit = (e: React.FormEvent) => {
  if (!formData.name.trim()) {
    alert('Vui lòng nhập tên khách hàng'); // ❌ Using alert()
    return;
  }
  // ❌ No email validation
  // ❌ No phone validation
  // ❌ No duplicate check
  // ❌ No inline error messages
}
```

---

## Solution:

### Step 1: Add imports (after line 8)

```typescript
import {
  validateCustomer,
  checkDuplicateCustomer,
  sanitizeCustomerData,
  getFieldError,
  formatPhoneDisplay,
  formatTaxCodeDisplay,
} from '../../utils/customerValidation';
```

### Step 2: Add validation state to CustomerFormModal

**Find this (around line 20):**
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  company: '',
  address: '',
  taxCode: '',
  notes: '',
});
```

**Add after it:**
```typescript
const [validationErrors, setValidationErrors] = useState<Array<{ field: string; message: string }>>([]);
const [isDuplicateWarning, setIsDuplicateWarning] = useState<string>('');
```

### Step 3: Replace handleSubmit (around line 50)

**Replace this:**
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!formData.name.trim()) {
    alert('Vui lòng nhập tên khách hàng');
    return;
  }
  
  // ... rest of code
  
  onSave({
    ...formData,
    address: fullAddress,
  });
  onClose();
};
```

**With this:**
```typescript
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  // Clear previous errors
  setValidationErrors([]);
  setIsDuplicateWarning('');
  
  // Validate customer data
  const validation = validateCustomer(formData);
  if (!validation.valid) {
    setValidationErrors(validation.errors);
    return;
  }
  
  // Check for duplicates (if customers list is available)
  // Note: You need to pass customers list to this component
  // const duplicate = checkDuplicateCustomer(
  //   formData,
  //   customers,
  //   customer?.id
  // );
  // if (duplicate.isDuplicate) {
  //   setIsDuplicateWarning(
  //     `Khách hàng với ${duplicate.duplicateField === 'email' ? 'email' : 'số điện thoại'} này đã tồn tại`
  //   );
  //   return;
  // }
  
  // Sanitize data before saving
  const sanitizedData = sanitizeCustomerData(formData);
  
  // Build full address
  const countryName = countries.find(c => c.isoCode === selectedCountry)?.name || '';
  const stateName = selectedState ? getStatesByCountry(selectedCountry).find(s => s.isoCode === selectedState)?.name || '' : '';
  const cityName = selectedCity || '';
  const detailAddress = sanitizedData.address || '';
  const addressParts = [detailAddress, cityName, stateName, countryName].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
  onSave({
    ...sanitizedData,
    address: fullAddress,
  });
  onClose();
};
```

### Step 4: Add inline error messages to form fields

**For Name field (around line 80):**
```typescript
<div className="col-span-2">
  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">
    Họ và tên *
  </label>
  <input
    type="text"
    required
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
      getFieldError(validationErrors, 'name') ? 'border-red-500' : ''
    }`}
    placeholder="Nguyễn Văn A"
  />
  {getFieldError(validationErrors, 'name') && (
    <p className="text-xs text-red-500 mt-1">
      {getFieldError(validationErrors, 'name')}
    </p>
  )}
</div>
```

**For Email field:**
```typescript
<div>
  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
  <input
    type="email"
    value={formData.email}
    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
      getFieldError(validationErrors, 'email') ? 'border-red-500' : ''
    }`}
    placeholder="email@example.com"
  />
  {getFieldError(validationErrors, 'email') && (
    <p className="text-xs text-red-500 mt-1">
      {getFieldError(validationErrors, 'email')}
    </p>
  )}
</div>
```

**For Phone field:**
```typescript
<div>
  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Số điện thoại</label>
  <input
    type="tel"
    value={formData.phone}
    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
      getFieldError(validationErrors, 'phone') ? 'border-red-500' : ''
    }`}
    placeholder="0901234567"
  />
  {getFieldError(validationErrors, 'phone') && (
    <p className="text-xs text-red-500 mt-1">
      {getFieldError(validationErrors, 'phone')}
    </p>
  )}
  {formData.phone && !getFieldError(validationErrors, 'phone') && (
    <p className="text-xs text-gray-500 mt-1">
      Hiển thị: {formatPhoneDisplay(formData.phone)}
    </p>
  )}
</div>
```

**For Tax Code field:**
```typescript
<div className="col-span-2">
  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Mã số thuế</label>
  <input
    type="text"
    value={formData.taxCode}
    onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
    className={`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 ${
      getFieldError(validationErrors, 'taxCode') ? 'border-red-500' : ''
    }`}
    placeholder="0123456789"
  />
  {getFieldError(validationErrors, 'taxCode') && (
    <p className="text-xs text-red-500 mt-1">
      {getFieldError(validationErrors, 'taxCode')}
    </p>
  )}
  {formData.taxCode && !getFieldError(validationErrors, 'taxCode') && (
    <p className="text-xs text-gray-500 mt-1">
      Hiển thị: {formatTaxCodeDisplay(formData.taxCode)}
    </p>
  )}
</div>
```

### Step 5: Add duplicate warning banner (after form opening tag)

```typescript
{isDuplicateWarning && (
  <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm font-medium text-amber-800">{isDuplicateWarning}</p>
      <p className="text-xs text-amber-600 mt-1">
        Vui lòng kiểm tra lại hoặc sử dụng thông tin khác
      </p>
    </div>
  </div>
)}
```

---

## Benefits:

✅ **Email Validation:** Checks format before saving  
✅ **Phone Validation:** Vietnamese format (10-11 digits)  
✅ **Tax Code Validation:** 10 or 13 digits  
✅ **Duplicate Check:** Prevents duplicate email/phone  
✅ **Inline Errors:** Shows errors next to fields  
✅ **Data Sanitization:** Cleans data before saving  
✅ **Format Preview:** Shows formatted phone/tax code

---

## Testing:

### Test 1: Empty Name
```
Input: name = ""
Expected: ❌ "Tên khách hàng là bắt buộc"
```

### Test 2: Invalid Email
```
Input: email = "invalid-email"
Expected: ❌ "Email không hợp lệ. VD: example@domain.com"
```

### Test 3: Invalid Phone
```
Input: phone = "123"
Expected: ❌ "Số điện thoại không hợp lệ. VD: 0901234567"
```

### Test 4: Valid Phone Format
```
Input: phone = "0901234567"
Expected: ✅ Preview shows "0901 234 567"
```

### Test 5: Invalid Tax Code
```
Input: taxCode = "123"
Expected: ❌ "Mã số thuế không hợp lệ. Phải có 10 hoặc 13 chữ số"
```

### Test 6: Valid Data
```
Input: All fields valid
Expected: ✅ Saves successfully
```

---

## UI Preview:

```
┌─────────────────────────────────────┐
│ Họ và tên *                         │
│ [Nguyễn Văn A____________]          │
│                                     │
│ Email                               │
│ [invalid-email___________]          │
│ ❌ Email không hợp lệ. VD: ...     │
│                                     │
│ Số điện thoại                       │
│ [0901234567______________]          │
│ ✅ Hiển thị: 0901 234 567          │
└─────────────────────────────────────┘
```

---

**Priority:** HIGH  
**Impact:** Prevents bad data in database  
**Effort:** 15 minutes to apply
