# 🔧 HOTFIX - 2026-03-01 16:55

## Issues Fixed:

### 1. ✅ API_BASE Empty String
**Problem:** `API_BASE = ''` causing `/api/python-health` to become `//api/python-health`

**Fixed in:**
- `src/App.tsx`
- `src/components/ImpositionPage.tsx`
- `src/components/ImpositionAdvancedPage.tsx`
- `src/components/ai/AIImageProcessor.tsx`

**Change:** `const API_BASE = '/api';`

---

### 2. ✅ Supabase NULL Constraint Error
**Problem:** `null value in column "title" of relation "quotes" violates not-null constraint`

**Fixed in:**
- `src/services/api.ts` - `createQuote()` - Added default: `title: q.title || 'Báo giá mới'`
- `src/services/api.ts` - `createInvoice()` - Added default: `title: inv.title || 'Hóa đơn mới'`

---

### 3. ⚠️ Known Issues (Not Critical):

**Font Loading Errors:**
- Fonts with apostrophes in names fail to load
- Affected: `UTM God's WordBold`, `UTM God's WordBoldItalic`, etc.
- Impact: Minor - 192/196 fonts loaded successfully
- Fix: Rename font files or escape apostrophes (optional)

**Multiple GoTrueClient Instances:**
- Warning from Supabase client
- Impact: None - just a warning
- Cause: Multiple Supabase client initializations

---

## Deployment:

```bash
cd /root/toolxprint
npm run build
systemctl reload nginx
```

**Status:** ✅ Deployed and running
**URL:** http://157.66.80.125
