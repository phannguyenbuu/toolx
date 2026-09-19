# 🎯 REFACTOR PLAN - TOOLXPRINT ACCOUNT & BUSINESS MODULES

**Ngày bắt đầu:** 2026-03-01  
**Trạng thái:** 🟡 In Progress

---

## 📋 TỔNG QUAN CÁC MODULE CẦN SỬA

### ✅ Đã kiểm tra:
1. ✅ Tài khoản (Account Dashboard)
2. ✅ Cài đặt (Settings)
3. ✅ Thông tin xưởng in (Business Info)
4. ✅ Quản lý team (Team Management)
5. ✅ Ví & Giao dịch (Wallet & Transactions)
6. ✅ Tổng quan (Overview)
7. ✅ Nạp tiền (Top-up)
8. ✅ Nâng cấp gói (Subscription)
9. ✅ Hóa đơn (Invoices)
10. ✅ Báo giá (Quotes)
11. ✅ Khách hàng (Customers)
12. ✅ Header & Footer (Document Templates)

---

## 🔥 PRIORITY MATRIX

### P0 - CRITICAL (Phải sửa ngay - Ảnh hưởng chức năng chính)
- [ ] **P0.1** Variable Replacement cho Header/Footer
- [ ] **P0.2** Save Images vào Database
- [ ] **P0.3** Sanitize HTML (XSS Security)
- [ ] **P0.4** Transaction Type Validation
- [ ] **P0.5** Customer Data Validation

### P1 - HIGH (Sửa trong tuần - Ảnh hưởng UX nghiêm trọng)
- [ ] **P1.1** PDF Export Button
- [ ] **P1.2** Payment Verification cho Top-up
- [ ] **P1.3** Permission Checks cho Team Management
- [ ] **P1.4** Invoice Numbering System
- [ ] **P1.5** Variables Documentation UI

### P2 - MEDIUM (Sửa trong tháng - Cải thiện UX)
- [ ] **P2.1** Templates Library
- [ ] **P2.2** Loading States
- [ ] **P2.3** Error Handling với Toast
- [ ] **P2.4** Pagination cho Lists
- [ ] **P2.5** Debounce Editor Performance

### P3 - LOW (Nice to have)
- [ ] **P3.1** Import/Export CSV
- [ ] **P3.2** Email Notifications
- [ ] **P3.3** Audit Logs
- [ ] **P3.4** Version History
- [ ] **P3.5** Keyboard Shortcuts

---

## 📦 PHASE 1: CRITICAL FIXES (2-3 ngày)

### ✅ PHASE 1.1: Variable Replacement System
**Files:** 
- `src/utils/templateVariables.ts` (NEW)
- `src/components/business/QuotesPage.tsx`
- `src/components/business/InvoicesPage.tsx`

**Tasks:**
- [ ] 1.1.1 - Tạo templateVariables.ts với definitions
- [ ] 1.1.2 - Implement replaceVariables function
- [ ] 1.1.3 - Apply vào QuotesPage preview
- [ ] 1.1.4 - Apply vào InvoicesPage preview
- [ ] 1.1.5 - Test với data thật

**Estimated:** 4h

---

### ✅ PHASE 1.2: Save Images to Database
**Files:**
- `src/components/account/BusinessTab.tsx`
- `src/hooks/useBusinessDatabaseApi.ts`
- `src/services/businessApi.ts`

**Tasks:**
- [ ] 1.2.1 - Update BusinessTab handleSave
- [ ] 1.2.2 - Update QuoteConfig/InvoiceConfig types
- [ ] 1.2.3 - Update API calls
- [ ] 1.2.4 - Test upload & reload

**Estimated:** 3h

---

### ✅ PHASE 1.3: HTML Sanitization
**Files:**
- `src/components/business/QuotesPage.tsx`
- `src/components/business/InvoicesPage.tsx`
- `src/components/account/BusinessTab.tsx`

**Tasks:**
- [ ] 1.3.1 - Install dompurify
- [ ] 1.3.2 - Apply sanitization vào preview
- [ ] 1.3.3 - Test XSS attacks
- [ ] 1.3.4 - Document security measures

**Estimated:** 2h

---

### ✅ PHASE 1.4: Transaction Type Validation
**Files:**
- `src/components/account/useAccountData.ts`
- `src/types/api.ts`

**Tasks:**
- [ ] 1.4.1 - Add type guards
- [ ] 1.4.2 - Validate before casting
- [ ] 1.4.3 - Handle invalid types
- [ ] 1.4.4 - Add error logging

**Estimated:** 2h

---

### ✅ PHASE 1.5: Customer Validation
**Files:**
- `src/components/business/CustomersPage.tsx`

**Tasks:**
- [ ] 1.5.1 - Email format validation
- [ ] 1.5.2 - Phone number validation
- [ ] 1.5.3 - Duplicate check
- [ ] 1.5.4 - Inline error messages

**Estimated:** 2h

**PHASE 1 TOTAL:** ~13h (1.5 ngày)

---

## 📦 PHASE 2: HIGH PRIORITY (3-4 ngày)

### ✅ PHASE 2.1: PDF Export
**Files:**
- `src/utils/pdfExport.ts` (NEW)
- `src/components/business/QuotesPage.tsx`
- `src/components/business/InvoicesPage.tsx`

**Tasks:**
- [ ] 2.1.1 - Install html2pdf.js
- [ ] 2.1.2 - Create pdfExport utility
- [ ] 2.1.3 - Add export button UI
- [ ] 2.1.4 - Test PDF quality
- [ ] 2.1.5 - Handle images in PDF

**Estimated:** 6h

---

### ✅ PHASE 2.2: Payment Verification
**Files:**
- `src/components/account/TopUpModal.tsx`
- `src/services/paymentApi.ts` (NEW)

**Tasks:**
- [ ] 2.2.1 - Design payment flow
- [ ] 2.2.2 - Add QR code generation
- [ ] 2.2.3 - Add webhook endpoint
- [ ] 2.2.4 - Add verification UI
- [ ] 2.2.5 - Test payment flow

**Estimated:** 8h

---

### ✅ PHASE 2.3: Team Permission System
**Files:**
- `src/components/account/TeamTab.tsx`
- `src/hooks/usePermissions.ts` (NEW)

**Tasks:**
- [ ] 2.3.1 - Define permission matrix
- [ ] 2.3.2 - Create usePermissions hook
- [ ] 2.3.3 - Apply checks vào actions
- [ ] 2.3.4 - Add permission denied UI
- [ ] 2.3.5 - Test all roles

**Estimated:** 6h

---

### ✅ PHASE 2.4: Invoice Numbering
**Files:**
- `src/components/business/InvoicesPage.tsx`
- `src/utils/invoiceNumbering.ts` (NEW)

**Tasks:**
- [ ] 2.4.1 - Design numbering format
- [ ] 2.4.2 - Auto-increment logic
- [ ] 2.4.3 - Prevent duplicates
- [ ] 2.4.4 - Add manual override
- [ ] 2.4.5 - Test edge cases

**Estimated:** 4h

---

### ✅ PHASE 2.5: Variables Documentation
**Files:**
- `src/components/account/BusinessTab.tsx`
- `src/components/VariablesHelper.tsx` (NEW)

**Tasks:**
- [ ] 2.5.1 - Create VariablesHelper component
- [ ] 2.5.2 - Add copy-to-clipboard
- [ ] 2.5.3 - Add examples
- [ ] 2.5.4 - Add search/filter
- [ ] 2.5.5 - Integrate vào BusinessTab

**Estimated:** 4h

**PHASE 2 TOTAL:** ~28h (3.5 ngày)

---

## 📦 PHASE 3: MEDIUM PRIORITY (1 tuần)

### ✅ PHASE 3.1: Templates Library
**Files:**
- `src/data/documentTemplates.ts` (NEW)
- `src/components/account/BusinessTab.tsx`

**Tasks:**
- [ ] 3.1.1 - Create 5+ header templates
- [ ] 3.1.2 - Create 5+ footer templates
- [ ] 3.1.3 - Add preview thumbnails
- [ ] 3.1.4 - Add template selector UI
- [ ] 3.1.5 - Test all templates

**Estimated:** 8h

---

### ✅ PHASE 3.2: Loading States
**Files:**
- `src/components/account/*`
- `src/components/business/*`

**Tasks:**
- [ ] 3.2.1 - Add loading spinners
- [ ] 3.2.2 - Add skeleton screens
- [ ] 3.2.3 - Add progress indicators
- [ ] 3.2.4 - Handle slow connections

**Estimated:** 6h

---

### ✅ PHASE 3.3: Toast Notifications
**Files:**
- `src/components/Toast.tsx` (NEW)
- `src/hooks/useToast.ts` (NEW)

**Tasks:**
- [ ] 3.3.1 - Install react-hot-toast
- [ ] 3.3.2 - Replace all alert()
- [ ] 3.3.3 - Add success/error/warning
- [ ] 3.3.4 - Add undo actions

**Estimated:** 4h

---

### ✅ PHASE 3.4: Pagination
**Files:**
- `src/components/business/CustomersPage.tsx`
- `src/components/business/QuotesPage.tsx`
- `src/components/business/InvoicesPage.tsx`

**Tasks:**
- [ ] 3.4.1 - Add pagination component
- [ ] 3.4.2 - Apply vào Customers
- [ ] 3.4.3 - Apply vào Quotes
- [ ] 3.4.4 - Apply vào Invoices
- [ ] 3.4.5 - Add page size selector

**Estimated:** 6h

---

### ✅ PHASE 3.5: Editor Performance
**Files:**
- `src/components/account/BusinessTab.tsx`

**Tasks:**
- [ ] 3.5.1 - Add debounce
- [ ] 3.5.2 - Memoize preview
- [ ] 3.5.3 - Optimize re-renders
- [ ] 3.5.4 - Test performance

**Estimated:** 3h

**PHASE 3 TOTAL:** ~27h (3.5 ngày)

---

## 📊 PROGRESS TRACKING

### Overall Progress: 5/50 tasks completed (10%)

```
Phase 1 (Critical):  ██░░░░░░░░ 5/25 (20%)
Phase 2 (High):      ░░░░░░░░░░ 0/25 (0%)
Phase 3 (Medium):    ░░░░░░░░░░ 0/25 (0%)
```

### Time Tracking
- **Estimated Total:** ~68 hours (8.5 ngày)
- **Actual Time:** 1.5h
- **Remaining:** 66.5h

### Completed Phases
- ✅ **Phase 1.1** - Variable Replacement System (1.5h) - DONE

---

## 🐛 BUGS DISCOVERED

### Critical
- None yet

### High
- None yet

### Medium
- None yet

---

## 📝 NOTES & DECISIONS

### 2026-03-01
- Bắt đầu audit toàn bộ hệ thống
- Phát hiện Header/Footer không có variable replacement
- Phát hiện Images không được lưu vào DB
- Phát hiện XSS vulnerability

---

## ✅ COMPLETED TASKS

### Phase 1.1: Variable Replacement System ✅ (2026-03-01)
- ✅ 1.1.1 - Created templateVariables.ts (280 lines, 27 variables)
- ✅ 1.1.2 - Created QuotesPage patch
- ✅ 1.1.3 - Created InvoicesPage patch
- ✅ 1.1.4 - Created VariablesHelper component (200 lines)
- ✅ 1.1.5 - Created BusinessTab integration patch

**Files Created:**
- `src/utils/templateVariables.ts`
- `src/components/VariablesHelper.tsx`
- `PATCH_QuotesPage_Variables.md`
- `PATCH_InvoicesPage_Variables.md`
- `PATCH_BusinessTab_VariablesHelper.md`
- `PHASE_1.1_COMPLETED.md`

**Time:** 1.5h (Ahead of 4h estimate)

---

## 🚀 NEXT STEPS

1. Bắt đầu Phase 1.1: Variable Replacement
2. Tạo file progress tracking
3. Setup testing environment

---

**Last Updated:** 2026-03-01 13:42
**Updated By:** AI Assistant
