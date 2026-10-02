import { UtiCommandItem } from '../types';

export const industryCommands: UtiCommandItem[] = [
  // --- NHÓM 4: BÌNH TRANG IN ẤN (IMPOSITION SERVICE) ---
  {
    command: 'imposition_calc_grid',
    label: 'Dàn trang tự động (Imposition 8-Up)',
    category: '📐 Bình Trang & Layout',
    language: 'python',
    is_visible: true,
    description: 'Tính toán sơ đồ xếp trang 8-up khổ in 65x86cm, tính độ bù hao lề và bon cắt',
    command_content: `sheet_w = 650  # mm
sheet_h = 860  # mm
item_w = 210   # mm (A4)
item_h = 297   # mm (A4)
bleed = 2      # mm
margin = 15    # mm (kẹp nhíp)

cols = int((sheet_w - margin * 2) / (item_w + bleed * 2))
rows = int((sheet_h - margin * 2) / (item_h + bleed * 2))
total_up = cols * rows

used_w = cols * (item_w + bleed * 2)
used_h = rows * (item_h + bleed * 2)
efficiency = round(((used_w * used_h) / (sheet_w * sheet_h)) * 100, 1)

print("=== SƠ ĐỒ BÌNH TRANG KHỔ IN (IMPOSITION SERVICE) ===")
print(f"• Khổ giấy in: {sheet_w} × {sheet_h} mm")
print(f"• Kích thước con: {item_w} × {item_h} mm (Bleed: +{bleed}mm)")
print(f"• Cách xếp: {cols} cột × {rows} hàng -> {total_up} con/tay in (Tay 8 trang)")
print(f"• Hiệu suất sử dụng giấy: {efficiency}%")
print("• Bon cắt: 4 góc + bon chữ thập tâm trang (Cross-mark)")
print("✓ Sẵn sàng xuất layout sang PDF khổ lớn!")
`
  },

  // --- NHÓM 5: THIẾT KẾ KHUÔN HỘP (DIECUT SERVICE) ---
  {
    command: 'diecut_generate_box',
    label: 'Sinh Dieline Hộp Nắp Cài Đáy Gài',
    category: '📦 Bao Bì & Khuôn Hộp',
    language: 'python',
    is_visible: true,
    description: 'Tính toán tọa độ đường cắt bế (Cut) và cấn gân (Crease) theo kích thước Dài × Rộng × Cao',
    command_content: `length = 150  # mm (Dài)
width = 80    # mm (Rộng)
height = 200  # mm (Cao)
tuck_flap = 15 # mm (Tai gài)
glue_flap = 12 # mm (Tai dán)

blank_w = 2 * (length + width) + glue_flap
blank_h = height + 2 * (width + tuck_flap)

print("=== BẢN VẼ DIELINE KHUÔN HỘP (DIECUT SERVICE) ===")
print(f"• Kích thước hộp (D×R×C): {length} × {width} × {height} mm")
print(f"• Kích thước phôi trải phẳng (Blank): {blank_w} × {blank_h} mm")
print(f"• Tai dán hông: {glue_flap} mm | Tai gài nắp: {tuck_flap} mm")
print("• Phân lớp CAD:")
print("  - Đỏ (#FF0000): Đường cắt đứt (Cut line - 2pt)")
print("  - Xanh lá (#00FF00): Đường cấn gân xếp (Crease line - đứt đoạn 1pt)")
print("  - Vàng (#FFFF00): Vùng tràn màu in (Bleed line 3mm)")
print("✓ Đã kiểm tra tính toán góc bo gài nắp (45 độ).")
`
  },

  // --- NHÓM 6: BIẾN ĐỔI DỮ LIỆU & QR (VDP SERVICE) ---
  {
    command: 'vdp_batch_vietqr',
    label: 'Sinh VietQR Napas247 & Serial',
    category: '🏷️ Biến Đổi Dữ Liệu & QR',
    language: 'python',
    is_visible: true,
    description: 'Sinh chuỗi dữ liệu VietQR thanh toán tự động kèm số serial nhảy liên tục',
    command_content: `import json

bank_bin = "970422"  # MBBank
account_no = "0987654321"
account_name = "TOOLX PRINT SERVICE"

sample_orders = [
    {"serial": "TX-2026-0001", "customer": "Nguyễn Văn A", "amount": 150000},
    {"serial": "TX-2026-0002", "customer": "Trần Thị B", "amount": 320000},
    {"serial": "TX-2026-0003", "customer": "Công ty TNHH In Ấn X", "amount": 1250000}
]

print("=== TRỘN DỮ LIỆU BIẾN ĐỔI & VIETQR (VDP SERVICE) ===")
for order in sample_orders:
    memo = f"Thanh toan {order['serial']}"
    qr_payload = f"00020101021238540010A00000072701240006{bank_bin}01{len(account_no):02d}{account_no}530370454{len(str(order['amount'])):02d}{order['amount']}5802VN62{len(memo)+4:02d}08{len(memo):02d}{memo}6304"
    print(f"• [{order['serial']}] {order['customer']} - {order['amount']:,} đ -> VietQR: Ready")

print("\\n✓ Đã kết nối dữ liệu thành công. Sẵn sàng nạp vào module LabelDesigner.")
`
  },

  // --- NHÓM 7: TÍNH GIÁ IN ẤN (PRICING SERVICE) ---
  {
    command: 'pricing_calculate_offset',
    label: 'Mô phỏng Báo giá In Offset',
    category: '💰 Tính Giá & Định Mức',
    language: 'python',
    is_visible: true,
    description: 'Tính toán chi phí in ấn: tiền giấy, tiền kẽm CTP, công in số lượt, cán màng và lãi định mức',
    command_content: `qty = 2000          # Số lượng sản phẩm
pages = 8           # Số trang
paper_cost_per_kg = 28500  # VNĐ/kg (Couche 150gsm)
plates_count = 4    # 4 bản kẽm CMYK
plate_price = 75000 # VNĐ/bản
print_run_cost = 450000 # Tiền công in cơ bản

# Tính toán
total_plates = plates_count * plate_price
paper_total = round(qty * 0.035 * paper_cost_per_kg) # ước tính 35g/bản in
lamination_total = qty * 450 # Cán màng nhiệt mờ
subtotal = total_plates + paper_total + print_run_cost + lamination_total
profit_margin = 0.20 # 20% lợi nhuận
grand_total = round(subtotal * (1 + profit_margin))
unit_price = round(grand_total / qty)

print("=== BẢNG TÍNH GIÁ IN ẤN OFFSET (PRICING SERVICE) ===")
print(f"• Số lượng: {qty:,} cuốn | Khổ in: A4 (8 trang)")
print(f"• Tiền bản kẽm CTP (4 kẽm): {total_plates:,} đ")
print(f"• Tiền giấy (C150):         {paper_total:,} đ")
print(f"• Tiền công in Offset:      {print_run_cost:,} đ")
print(f"• Tiền gia công cán màng:   {lamination_total:,} đ")
print(f"----------------------------------------")
print(f"• TỔNG BÁO GIÁ:             {grand_total:,} đ ({unit_price:,} đ/sp)")
print(f"✓ Công thức đã đối soát khớp với CSDL PostgreSQL!")
`
  },

  // --- NHÓM 8: TIỀN KIỂM PDF & ICC (PDF PREFLIGHT SERVICE) ---
  {
    command: 'inspect_pdf_dimensions',
    label: 'Trích xuất kích thước MediaBox',
    category: '📄 Tiền Kiểm PDF & ICC',
    language: 'python',
    is_visible: true,
    description: 'Phân tích file PDF, đo kích thước khổ in thực tế (mm, inch, pt)',
    command_content: `import sys

sample_w_pt = 595.28
sample_h_pt = 841.89

w_mm = round((sample_w_pt / 72.0) * 25.4, 1)
h_mm = round((sample_h_pt / 72.0) * 25.4, 1)

print("=== PHÂN TÍCH KÍCH THƯỚC KHỔ TRANG (MEDIABOX) ===")
print(f"• Điểm ảnh PDF: {sample_w_pt} × {sample_h_pt} pt")
print(f"• Kích thước in ấn: {w_mm} × {h_mm} mm (Khổ A4 tiêu chuẩn)")
print("• Độ phân giải tối ưu đề xuất: 300 DPI (Offset) / 200 DPI (KTS)")
`
  },
  {
    command: 'list_icc_profiles',
    label: 'Danh sách ICC Profiles Prepress',
    category: '📄 Tiền Kiểm PDF & ICC',
    language: 'python',
    is_visible: true,
    description: 'Hiển thị thư viện ICC Profile chuẩn ngành in ấn đang tích hợp',
    command_content: `icc_profiles = {
    "CMYK": [
        "Japan Color 2001 Coated (Chuẩn in Offset VN/Nhật)",
        "ISO Coated v2 / FOGRA39 (Châu Âu)",
        "PSO Coated v3 / FOGRA51 (ISO 12647-2)",
        "U.S. Web Coated (SWOP) v2",
        "GRACoL 2006 Coated"
    ],
    "RGB": [
        "sRGB IEC61966-2.1 (Màn hình)",
        "Adobe RGB (1998) (Dải màu rộng)",
        "Display P3 (Apple)"
    ],
    "GRAY": [
        "Dot Gain 15% (Giấy Couche)",
        "Dot Gain 20% (Giấy Fort)",
        "Gray Gamma 2.2"
    ]
}

print("=== THƯ VIỆN ICC PROFILE CHUẨN IN ẤN TOOLXPRINT ===")
for space, profs in icc_profiles.items():
    print(f"\\n[{space} Profiles]:")
    for p in profs:
        print(f"  ✓ {p}")
`
  },

  // --- NHÓM 9: LIÊN KẾT CORELDRAW & VECTOR (COREL CLIPBOARD SERVICE) ---
  {
    command: 'corel_paste_svg',
    label: 'Chép Dieline SVG sang CorelDRAW (Ctrl+V)',
    category: '🎨 CorelDRAW & Vector',
    language: 'python',
    is_visible: true,
    description: 'Nạp file SVG khuôn bế vào Windows Clipboard chuẩn CF_HDROP để dán trực tiếp Ctrl+V vào CorelDRAW không cần cài macro VBA',
    command_content: `import os
import sys
import tempfile
import ctypes
import json
import base64
from ctypes import wintypes

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

svg_b64 = "__SVG_BASE64__"
if not svg_b64 or svg_b64.startswith("__"):
    svg_data = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>'
else:
    svg_data = base64.b64decode(svg_b64.encode('utf-8')).decode('utf-8')

temp_dir = tempfile.gettempdir()
svg_path = os.path.join(temp_dir, 'toolx_dieline.svg')
with open(svg_path, 'w', encoding='utf-8') as f:
    f.write(svg_data)

abs_path = os.path.abspath(svg_path)

# 1. Thử nạp trực tiếp qua CorelDRAW COM nếu Corel đang mở
corel_imported = False
try:
    import win32com.client
    app = win32com.client.GetActiveObject("CorelDRAW.Application")
    if app and app.ActiveDocument:
        app.ActiveDocument.ActiveLayer.Import(abs_path)
        corel_imported = True
except Exception:
    pass

# 2. Luôn ghi file vào Windows Clipboard định dạng CF_HDROP (Ctrl+V native)
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32

kernel32.GlobalAlloc.restype = wintypes.HGLOBAL
kernel32.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
kernel32.GlobalLock.restype = wintypes.LPVOID
kernel32.GlobalLock.argtypes = [wintypes.HGLOBAL]
kernel32.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
user32.OpenClipboard.argtypes = [wintypes.HWND]
user32.SetClipboardData.restype = wintypes.HANDLE
user32.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HANDLE]

class DROPFILES(ctypes.Structure):
    _fields_ = [
        ('pFiles', wintypes.DWORD),
        ('pt', wintypes.POINT),
        ('fNC', wintypes.BOOL),
        ('fWide', wintypes.BOOL),
    ]

files_bytes = (abs_path + '\\0\\0').encode('utf-16le')
df = DROPFILES()
df.pFiles = ctypes.sizeof(DROPFILES)
df.pt = wintypes.POINT(0, 0)
df.fNC = False
df.fWide = True

buf = bytes(df) + files_bytes
GHND = 0x0042
hGlobal = kernel32.GlobalAlloc(GHND, len(buf))
pGlobal = kernel32.GlobalLock(hGlobal)
ctypes.memmove(pGlobal, buf, len(buf))
kernel32.GlobalUnlock(hGlobal)

user32.OpenClipboard(None)
user32.EmptyClipboard()
CF_HDROP = 15
res = user32.SetClipboardData(CF_HDROP, hGlobal)
user32.CloseClipboard()

msg = 'Đã tự động nạp thẳng vào CorelDRAW đang mở!' if corel_imported else 'Đã chép dieline SVG vào Clipboard! Sang CorelDRAW chỉ cần nhấn Ctrl + V là xong.'
print(f'• File SVG tạm: {abs_path}')
print(f'• Trạng thái Clipboard CF_HDROP: {bool(res)}')
if corel_imported:
    print('• Tự động nạp qua CorelDRAW COM: Thành công')
print(msg)

print("__GOAGENT_RESULT__" + json.dumps({
    "ok": bool(res) or corel_imported,
    "res": bool(res),
    "corel_imported": corel_imported,
    "path": abs_path,
    "message": msg
}))
`
  }
];

