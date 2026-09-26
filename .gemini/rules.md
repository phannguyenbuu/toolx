# Workspace Rules — Toolx

## Build workflow (QUAN TRỌNG — đọc trước khi sửa code)

### Không build full để kiểm tra TypeScript!

Dùng `tsc --noEmit` để check type trong **3-8 giây** thay vì `npm run build:imposition` (~38s):

```bash
npx tsc --noEmit
```

Nếu cần check nhanh 1 file cụ thể:

```bash
npx tsc --noEmit --isolatedModules src/components/imposition/pdfExportEngine.ts
```

### Quy tắc vòng lặp khi sửa code:

1. **Sửa code** → `npx tsc --noEmit` (3-8s) — lặp đến khi sạch lỗi
2. **Build full** `npm run build:imposition` — chỉ chạy **1 lần duy nhất** trước khi commit
3. **Deploy backend** → `scp` 2 file Python + `systemctl restart toolx-ai`
4. **Commit + push**

### Không được làm:
- ❌ Build full mỗi lần sửa 1 dòng
- ❌ Build để "xem có lỗi không" — dùng tsc thay thế
- ❌ Deploy frontend lên VPS trừ khi user yêu cầu rõ ràng

---

## VPS config

- SSH: `root@157.66.80.125`, key: `C:\Users\nguyenbuu.DESKTOP-TOEFTR1\.ssh\id_ed25519`
- Python Flask: port `3005`, service `toolx-ai`
- NestJS: port `3001`, Express: port `3003`
- Restart: `systemctl restart toolx-ai`

## Rules tuyệt đối

- **KHÔNG git revert/restore bản cũ**
- **File length ≤ 500 dòng** — mọi file phải giữ dưới 500 dòng
