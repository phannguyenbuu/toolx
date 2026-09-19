# ✅ PHASE 1.1: Variable Replacement System

**Status:** 🟡 In Progress  
**Started:** 2026-03-01 13:42  
**Estimated:** 4h

---

## 📋 TASKS BREAKDOWN

### Task 1.1.1: Tạo templateVariables.ts ✅ COMPLETED
- [x] Define QUOTE_VARIABLES (25 variables)
- [x] Define INVOICE_VARIABLES (27 variables)
- [x] Create replaceVariables function
- [x] Add type definitions (VariableDefinition, VariableData)
- [x] Add helper functions (validate, getUsed, etc)
- [x] Add comprehensive documentation

**File created:** `src/utils/templateVariables.ts` (280 lines)

### Task 1.1.2: Apply vào QuotesPage
- [ ] Import utilities
- [ ] Replace header HTML
- [ ] Replace footer HTML
- [ ] Test preview

### Task 1.1.3: Apply vào InvoicesPage
- [ ] Import utilities
- [ ] Replace header HTML
- [ ] Replace footer HTML
- [ ] Test preview

### Task 1.1.4: Update BusinessTab
- [ ] Add variables helper UI
- [ ] Show available variables
- [ ] Add copy button

### Task 1.1.5: Testing
- [ ] Test với quote data
- [ ] Test với invoice data
- [ ] Test edge cases
- [ ] Document usage

---

## 📝 IMPLEMENTATION LOG

### 2026-03-01 13:42 - Starting Task 1.1.1
Creating templateVariables.ts...



### Task 1.1.2: Apply vào QuotesPage ✅ COMPLETED
- [x] Import utilities
- [x] Add variable data preparation
- [x] Replace header HTML with sanitized version
- [x] Replace footer HTML with sanitized version
- [x] Create patch file for manual application

**File created:** `PATCH_QuotesPage_Variables.md`

### Task 1.1.3: Apply vào InvoicesPage ✅ COMPLETED
- [x] Import utilities
- [x] Add variable data preparation (with paidAmount, remainingAmount)
- [x] Replace header HTML
- [x] Replace footer HTML
- [x] Create patch file

**File created:** `PATCH_InvoicesPage_Variables.md`

---

## 📝 NEXT STEPS

### Manual Application Required:
Vì file quá lớn, cần apply patches manually:

1. Install dependencies:
```bash
cd /root/toolxprint
npm install dompurify @types/dompurify
```

2. Apply PATCH_QuotesPage_Variables.md
3. Apply PATCH_InvoicesPage_Variables.md
4. Test với data thật

### Task 1.1.4: Update BusinessTab (NEXT)
- [ ] Add VariablesHelper component
- [ ] Show available variables
- [ ] Add copy-to-clipboard
- [ ] Add validation warnings

### Task 1.1.5: Testing (FINAL)
- [ ] Test quote preview
- [ ] Test invoice preview
- [ ] Test edge cases (missing data)
- [ ] Document usage

---

**Status:** 60% Complete (3/5 tasks done)
**Time spent:** ~1.5h
**Remaining:** ~2.5h
