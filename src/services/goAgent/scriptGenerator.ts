/**
 * Tạo script Python tối ưu để bơm vào GoAgent xử lý kết xuất PDF trực tiếp
 */
export function buildRenderPythonScript(
  base64Data: string,
  filename: string,
  dpi = 300,
  colorspace = 'rgb',
  maxPages = 50,
  transparentBg = false,
  pageRange = 'all'
): string {
  return `
import base64, os, sys, tempfile, json, subprocess, time

start_t = time.time()
file_bytes = base64.b64decode("""${base64Data}""")
tmp_dir = tempfile.gettempdir()
safe_name = "".join(c for c in """${filename}""" if c.isalnum() or c in "._- ") or "doc.pdf"
in_path = os.path.join(tmp_dir, f"goagent_in_{int(start_t)}_{safe_name}")

with open(in_path, "wb") as f:
    f.write(file_bytes)

dpi_val = int(${dpi})
max_p = int(${maxPages})
colorspace_val = """${colorspace}""".lower()
alpha_val = "true" if ${transparentBg ? 'True' : 'False'} else "false"
page_range_val = """${pageRange || 'all'}"""

worker_code = """
import fitz, base64, json, sys, os

pdf_path = sys.argv[1]
dpi = int(sys.argv[2]) if len(sys.argv) > 2 else 300
max_pages = int(sys.argv[3]) if len(sys.argv) > 3 else 50
colorspace = sys.argv[4] if len(sys.argv) > 4 else 'rgb'
alpha_mode = (sys.argv[5].lower() == 'true') if len(sys.argv) > 5 else False
page_range_arg = sys.argv[6] if len(sys.argv) > 6 else 'all'

def sanitize_pdf(doc):
    try:
        for xref in range(1, doc.xref_length()):
            obj_str = doc.xref_object(xref)
            if not obj_str:
                continue
            # Chuan hoa indirect reference trong ICCBased array
            if obj_str.strip().startswith('[') and '/ICCBased' in obj_str:
                parts = obj_str.replace('[', ' ').replace(']', ' ').split()
                if '/ICCBased' in parts:
                    idx = parts.index('/ICCBased')
                    if idx + 1 < len(parts) and parts[idx + 1].isdigit():
                        icc_xref = int(parts[idx + 1])
                        n_val = doc.xref_get_key(icc_xref, 'N')
                        if n_val[0] == 'int':
                            n = int(n_val[1])
                            target_cs = '/DeviceRGB' if n == 3 else ('/DeviceCMYK' if n == 4 else '/DeviceGray')
                            doc.update_object(xref, target_cs)
            # Chuan hoa Indexed ColorSpace neu base la indirect reference
            if '/Indexed' in obj_str:
                cs = doc.xref_get_key(xref, 'ColorSpace')
                if cs[0] == 'array' and '/Indexed' in cs[1]:
                    cs_str = cs[1]
                    tokens = cs_str.replace('[', ' ').replace(']', ' ').split()
                    if len(tokens) >= 5 and tokens[0] == '/Indexed':
                        if tokens[1].isdigit() and tokens[2] == '0' and tokens[3] == 'R':
                            base_ref = f"{tokens[1]} {tokens[2]} {tokens[3]}"
                            hival = int(tokens[4])
                            lookup_xref = int(tokens[5]) if len(tokens) > 5 and tokens[5].isdigit() else 0
                            target_cs = '/DeviceRGB'
                            if lookup_xref and doc.is_stream(lookup_xref):
                                pal_len = len(doc.xref_stream(lookup_xref))
                                entries = hival + 1
                                ch = pal_len // entries if entries > 0 else 3
                                target_cs = '/DeviceRGB' if ch == 3 else ('/DeviceCMYK' if ch == 4 else '/DeviceGray')
                            new_cs_str = cs_str.replace(base_ref, target_cs)
                            doc.xref_set_key(xref, 'ColorSpace', new_cs_str)
    except Exception:
        pass

try:
    doc = fitz.open(pdf_path)
    if not getattr(doc, 'is_pdf', False):
        doc = fitz.open('pdf', doc.convert_to_pdf())
    sanitize_pdf(doc)
    total_pages = len(doc)
    pages = []

    target_indices = []
    if page_range_arg == 'all' or not page_range_arg.strip():
        target_indices = list(range(min(total_pages, max_pages)))
    elif page_range_arg == 'first':
        target_indices = [0]
    else:
        for part in page_range_arg.split(','):
            part = part.strip()
            if '-' in part:
                s, e = part.split('-', 1)
                try:
                    for p in range(int(s), int(e) + 1):
                        if 1 <= p <= total_pages and (p - 1) not in target_indices:
                            target_indices.append(p - 1)
                except Exception:
                    pass
            elif part.isdigit():
                p = int(part)
                if 1 <= p <= total_pages and (p - 1) not in target_indices:
                    target_indices.append(p - 1)
        if not target_indices:
            target_indices = list(range(min(total_pages, max_pages)))
        target_indices = target_indices[:max_pages]

    cs = fitz.csRGB
    if colorspace in ('cmyk',):
        cs = fitz.csCMYK
    elif colorspace in ('gray', 'grayscale', 'monochrome'):
        cs = fitz.csGRAY

    out_doc = fitz.open()
    for idx in target_indices:
        page = doc[idx]
        rect = page.rect
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        
        pix = page.get_pixmap(matrix=mat, colorspace=cs, alpha=alpha_mode)
        if pix.colorspace and ('CMYK' in pix.colorspace.name or pix.colorspace.n == 4):
            preview_pix = fitz.Pixmap(fitz.csRGB, pix)
            img_bytes = preview_pix.tobytes("png")
        else:
            try:
                img_bytes = pix.tobytes("png")
            except Exception:
                preview_pix = fitz.Pixmap(fitz.csRGB, pix)
                img_bytes = preview_pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode("ascii")

        # Đóng gói trang đã rasterize vào tài liệu PDF thành phẩm
        new_page = out_doc.new_page(width=rect.width, height=rect.height)
        new_page.insert_image(rect, pixmap=pix)

        pages.append({
            "page_number": idx + 1,
            "width_pt": round(rect.width, 2),
            "height_pt": round(rect.height, 2),
            "width_mm": round(rect.width * 25.4 / 72.0, 1),
            "height_mm": round(rect.height * 25.4 / 72.0, 1),
            "dpi": dpi,
            "preview_b64": "data:image/png;base64," + b64
        })

    out_pdf_bytes = out_doc.tobytes(deflate=True, garbage=4)
    out_pdf_b64 = base64.b64encode(out_pdf_bytes).decode("ascii")

    pdf_base = os.path.splitext(os.path.basename(pdf_path))[0]
    out_pdf_path = os.path.join(os.path.dirname(pdf_path), f"rendered_{pdf_base}.pdf")
    try:
        out_doc.save(out_pdf_path, deflate=True, garbage=4)
    except Exception:
        pass

    print("__GOAGENT_RESULT__" + json.dumps({
        "ok": True,
        "total_pages": total_pages,
        "pages": pages,
        "pdf_b64": "data:application/pdf;base64," + out_pdf_b64,
        "file_path": out_pdf_path if os.path.exists(out_pdf_path) else "",
        "engine": "PyMuPDF (fitz)"
    }))
except Exception as err:
    print("__GOAGENT_RESULT__" + json.dumps({
        "ok": False,
        "error": str(err)
    }))
"""

worker_file = os.path.join(tmp_dir, f"goagent_worker_{int(start_t)}.py")
with open(worker_file, "w", encoding="utf-8") as wf:
    wf.write(worker_code)

candidates = [
    r"C:\\Users\\SingPC\\Python312\\python.exe",
    os.path.join(os.path.expanduser("~"), "Python312", "python.exe"),
    r"C:\\Python314\\python.exe",
    r"C:\\Python313\\python.exe",
    r"C:\\Python312\\python.exe",
    r"C:\\Python311\\python.exe",
    r"C:\\Program Files\\Python314\\python.exe",
    r"C:\\Program Files\\Python313\\python.exe",
    "python",
    "py"
]

py_exe = None
for c in candidates:
    if os.path.exists(c) or c in ("python", "py"):
        py_exe = c
        break

if not py_exe:
    py_exe = sys.executable

res = subprocess.run([py_exe, worker_file, in_path, str(dpi_val), str(max_p), colorspace_val, alpha_val, page_range_val], capture_output=True, text=True, timeout=60)

found_result = False
if res.returncode == 0 or "__GOAGENT_RESULT__" in res.stdout:
    for line in res.stdout.splitlines():
        if line.startswith("__GOAGENT_RESULT__"):
            payload = json.loads(line[len("__GOAGENT_RESULT__"):])
            payload["duration_ms"] = round((time.time() - start_t) * 1000, 1)
            payload["filename"] = """${filename}"""
            context["result_payload"] = payload
            found_result = True
            break

if not found_result:
    context["result_payload"] = {
        "ok": False,
        "error": res.stderr or res.stdout or "Không nhận được dữ liệu từ render worker.",
        "duration_ms": round((time.time() - start_t) * 1000, 1)
    }

try:
    if os.path.exists(worker_file):
        os.remove(worker_file)
    if os.path.exists(in_path):
        os.remove(in_path)
except Exception:
    pass
`;
}
