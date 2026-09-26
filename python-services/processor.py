"""
Image/PDF Processor - Xử lý ảnh và tạo PDF
Ported from PHP processor.py
"""

import os
import json
import fitz  # PyMuPDF
import img2pdf
import numpy as np
from PIL import Image, ImageCms, ImageOps, ImageDraw, ImageColor, ImageFont
from io import BytesIO
from typing import List, Dict, Any, Optional, Tuple

# Allow large images
Image.MAX_IMAGE_PIXELS = None

# Register Unicode font for ReportLab
_UNICODE_FONT_REGISTERED = False
_UNICODE_FONT_NAME = "Arial"

def register_unicode_font():
    """Register Arial font for Vietnamese text in ReportLab PDF"""
    global _UNICODE_FONT_REGISTERED, _UNICODE_FONT_NAME
    if _UNICODE_FONT_REGISTERED:
        return _UNICODE_FONT_NAME
    
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        font_paths = [
            "C:/Windows/Fonts/arial.ttf",
            "C:/Windows/Fonts/Arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
        ]
        
        for path in font_paths:
            if os.path.exists(path):
                pdfmetrics.registerFont(TTFont("ArialUnicode", path))
                _UNICODE_FONT_NAME = "ArialUnicode"
                _UNICODE_FONT_REGISTERED = True
                return _UNICODE_FONT_NAME
        
        # Fallback to Helvetica if no Unicode font found
        return "Helvetica"
    except Exception as e:
        print(f"Warning: Could not register Unicode font: {e}")
        return "Helvetica"

def sanitize_pdf_indexed_colorspaces(doc: fitz.Document) -> int:
    """
    Khắc phục triệt để lỗi MuPDF khi giải mã Indexed ColorSpace có base là Indirect Reference
    (nguyên nhân gây ra dải đen đè lên chữ/tiêu đề ở file PDF dạng strip ảnh).
    """
    fixed = 0
    try:
        for xref in range(1, doc.xref_length()):
            obj_str = doc.xref_object(xref)
            if not obj_str:
                continue
            # Chuẩn hóa indirect reference trong ICCBased array
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
                            fixed += 1
            # Chuẩn hóa Indexed ColorSpace nếu base là indirect reference
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
                            fixed += 1
    except Exception as e:
        print(f"[WARN] sanitize_pdf_indexed_colorspaces: {e}")
    return fixed

def open_and_sanitize_pdf(file_path: str) -> fitz.Document:
    """Mở PDF và tự động khử lỗi Indexed ColorSpace trước khi rasterize"""
    doc = fitz.open(file_path)
    sanitize_pdf_indexed_colorspaces(doc)
    return doc

def apply_advanced_color_management(image: Image.Image, form_data: Dict) -> Image.Image:
    """Apply 3-layer ICC color management to image"""
    try:
        # Check if advanced color management is enabled
        use_advanced_color = form_data.get('useAdvancedColor') == '1'
        if not use_advanced_color:
            return image
        
        source_icc = form_data.get('sourceIcc', 'original')
        icc1 = form_data.get('icc1', '')
        icc_output = form_data.get('iccOutput', '')
        
        print(f"[ICC] Advanced color management: source={source_icc}, icc1={icc1}, output={icc_output}")
        
        # Get ICC directory
        icc_dir = os.path.join(os.path.dirname(__file__), 'icc', 'iccpro')
        
        # Ensure image is in RGB mode
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Layer 1: Source ICC conversion
        if source_icc != 'original' and source_icc:
            source_profile_path = os.path.join(icc_dir, source_icc)
            if os.path.exists(source_profile_path):
                try:
                    source_profile = ImageCms.ImageCmsProfile(source_profile_path)
                    # Convert from source profile to working space (sRGB)
                    srgb_profile = ImageCms.createProfile('sRGB')
                    transform = ImageCms.buildTransformFromOpenProfiles(
                        source_profile, srgb_profile, 'RGB', 'RGB'
                    )
                    image = ImageCms.applyTransform(image, transform)
                    print(f"[ICC] Applied source ICC: {source_icc}")
                except Exception as e:
                    print(f"[ICC] Warning: Failed to apply source ICC {source_icc}: {e}")
        
        # Layer 2: First ICC conversion
        if icc1:
            icc1_profile_path = os.path.join(icc_dir, icc1)
            if os.path.exists(icc1_profile_path):
                try:
                    icc1_profile = ImageCms.ImageCmsProfile(icc1_profile_path)
                    srgb_profile = ImageCms.createProfile('sRGB')
                    transform = ImageCms.buildTransformFromOpenProfiles(
                        srgb_profile, icc1_profile, 'RGB', 'RGB'
                    )
                    image = ImageCms.applyTransform(image, transform)
                    print(f"[ICC] Applied ICC layer 1: {icc1}")
                except Exception as e:
                    print(f"[ICC] Warning: Failed to apply ICC1 {icc1}: {e}")
        
        # Layer 3: Output ICC conversion (final)
        if icc_output:
            output_profile_path = os.path.join(icc_dir, icc_output)
            if os.path.exists(output_profile_path):
                try:
                    output_profile = ImageCms.ImageCmsProfile(output_profile_path)
                    # Convert from current space to output profile
                    current_profile = ImageCms.createProfile('sRGB')  # Assume sRGB working space
                    transform = ImageCms.buildTransformFromOpenProfiles(
                        current_profile, output_profile, 'RGB', 'RGB'
                    )
                    image = ImageCms.applyTransform(image, transform)
                    print(f"[ICC] Applied output ICC: {icc_output}")
                except Exception as e:
                    print(f"[ICC] Warning: Failed to apply output ICC {icc_output}: {e}")
        
        return image
        
    except Exception as e:
        print(f"[ICC] Error in advanced color management: {e}")
        return image  # Return original image if color management fails

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ICC_DIR = os.path.join(BASE_DIR, 'icc')
ICC_RGB_PATH = os.path.join(ICC_DIR, 'myrgb.icc')
ICC_CMYK_PATH = os.path.join(ICC_DIR, 'mycmyk.icc')
UPLOADS_DIR = os.path.join(BASE_DIR, 'uploads')

# Ensure uploads directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)


def mm_to_px(mm: float, dpi: int) -> int:
    """Convert millimeters to pixels"""
    return int((mm / 25.4) * dpi)


def flatten_alpha(img: Image.Image, bg_color: Tuple = (255, 255, 255)) -> Image.Image:
    """Flatten alpha channel with background color"""
    if img.mode == "CMYK":
        return img
    
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        background = Image.new("RGB", img.size, bg_color)
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[3])
        return background
    
    return img


def convert_cmyk_k100(img: Image.Image, threshold: int = 30, gcr_level: float = 1.0) -> Image.Image:
    """
    Convert image to CMYK with GCR (Gray Component Replacement) control.
    
    Args:
        img: Input image (RGB or CMYK)
        threshold: Brightness threshold (0-255). Pixels darker than this become K100.
        gcr_level: GCR ratio 0.0..1.0
                   0.0 = no GCR (only CMY, K=0 except dark threshold)
                   1.0 = maximum GCR (K = max possible, like standard formula)
                   0.22 = Light GCR (SWOP v2 style, like DeXuatDA_done.pdf)
    
    Returns:
        CMYK image with GCR-optimized blacks
    """
    # Convert to RGB first if needed
    if img.mode == 'CMYK':
        img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Convert to numpy array
    rgb_array = np.array(img, dtype=np.float32)
    
    # Calculate brightness (grayscale value)
    brightness = np.mean(rgb_array, axis=2)
    
    # Standard RGB to CMYK conversion
    r, g, b = rgb_array[:, :, 0], rgb_array[:, :, 1], rgb_array[:, :, 2]
    
    # Normalize to 0-1
    r_norm = r / 255.0
    g_norm = g / 255.0
    b_norm = b / 255.0
    
    # Calculate K_max (100% GCR baseline)
    k_max = 1 - np.maximum(np.maximum(r_norm, g_norm), b_norm)
    
    # Apply GCR level: K = gcr_level × K_max
    k = k_max * float(np.clip(gcr_level, 0.0, 1.0))
    
    # Avoid division by zero
    divisor = np.where(k < 1, 1 - k, 1)
    
    # Calculate CMY compensated for GCR
    c = np.clip((1 - r_norm - k) / divisor, 0, 1)
    m = np.clip((1 - g_norm - k) / divisor, 0, 1)
    y = np.clip((1 - b_norm - k) / divisor, 0, 1)
    
    # Apply K100 optimization: very dark pixels become pure K (for sharp text)
    dark_mask = brightness < threshold
    c[dark_mask] = 0
    m[dark_mask] = 0
    y[dark_mask] = 0
    k[dark_mask] = 1.0
    
    # Clamp values and convert to 0-255
    c = np.clip(c * 255, 0, 255).astype(np.uint8)
    m = np.clip(m * 255, 0, 255).astype(np.uint8)
    y = np.clip(y * 255, 0, 255).astype(np.uint8)
    k = np.clip(k * 255, 0, 255).astype(np.uint8)
    
    # Stack channels
    cmyk_array = np.dstack((c, m, y, k))
    
    # Create CMYK image
    return Image.fromarray(cmyk_array, mode='CMYK')


def get_draw_color(hex_color: str, mode: str) -> Tuple:
    """Convert hex color to appropriate color tuple for mode"""
    try:
        rgb = ImageColor.getrgb(hex_color)
    except:
        rgb = (0, 0, 0)
    
    if mode == 'CMYK':
        temp_img = Image.new("RGB", (1, 1), rgb)
        cmyk_img = temp_img.convert("CMYK")
        return cmyk_img.getpixel((0, 0))
    
    return rgb


def load_source_image(file_path: str, dpi: int) -> Image.Image:
    """Load source image from file (PDF or image)"""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.pdf':
        try:
            doc = open_and_sanitize_pdf(file_path)
            page = doc.load_page(0)
            pix = page.get_pixmap(dpi=dpi, alpha=False)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            doc.close()
            return img
        except Exception as e:
            raise Exception(f"Không đọc được PDF: {str(e)}")
    else:
        try:
            img = Image.open(file_path)
            img = ImageOps.exif_transpose(img)
            return img
        except Exception as e:
            raise Exception(f"Không đọc được file ảnh: {str(e)}")


def auto_rotate_source(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Auto rotate image to match target orientation"""
    src_ratio = img.width / img.height
    dst_ratio = target_w / target_h
    
    if (src_ratio > 1 and dst_ratio < 1) or (src_ratio < 1 and dst_ratio > 1):
        return img.rotate(-90, expand=True)
    
    return img


def process_image_fit_mode(
    img: Image.Image, 
    target_w_px: int, 
    target_h_px: int, 
    mode: str, 
    auto_rot: bool = False,
    custom_scale: float = 100.0,
    bg_color_hex: str = '#ffffff'
) -> Image.Image:
    """Process image with specified fit mode"""
    if auto_rot:
        img = auto_rotate_source(img, target_w_px, target_h_px)
    
    original_icc = img.info.get('icc_profile')
    res_img = img
    
    if mode == 'stretch':
        res_img = img.resize((target_w_px, target_h_px), resample=Image.Resampling.LANCZOS)
    elif mode == 'fill':
        res_img = ImageOps.fit(img, (target_w_px, target_h_px), method=Image.Resampling.LANCZOS)
    elif mode == 'fit':
        # Contain: scale down to fit inside, then center on white/transparent background
        fitted = ImageOps.contain(img, (target_w_px, target_h_px), method=Image.Resampling.LANCZOS)
        # Create background and center the fitted image
        bg_mode = img.mode
        if bg_mode == "CMYK":
            bg_color = (255, 255, 255, 255)  # White in CMYK
        elif bg_mode == "RGBA":
            bg_color = (255, 255, 255, 0)  # Transparent
        else:
            bg_color = (255, 255, 255)  # White RGB
        bg = Image.new(bg_mode, (target_w_px, target_h_px), bg_color)
        x = (target_w_px - fitted.width) // 2
        y = (target_h_px - fitted.height) // 2
        bg.paste(fitted, (x, y))
        res_img = bg
    elif mode == 'actual':
        # Apply custom scale based on FITTED dimensions (not original image size)
        # This ensures scale % is relative to item size, not image size
        scale_factor = custom_scale / 100.0
        print(f"🔍 BACKEND SCALE DEBUG:", flush=True)
        print(f"  customScale parameter: {custom_scale}%", flush=True)
        print(f"  scale_factor: {scale_factor}", flush=True)
        
        # Validate scale factor
        if scale_factor <= 0:
            scale_factor = 1.0
            print(f"[WARNING] Invalid scale factor, using 1.0", flush=True)
        
        # STEP 1: Fit image into target dimensions first (like 'fit' mode)
        fitted = ImageOps.contain(img, (target_w_px, target_h_px), method=Image.Resampling.LANCZOS)
        
        # STEP 2: Apply scale to the FITTED dimensions
        scaled_w = max(1, int(fitted.width * scale_factor))
        scaled_h = max(1, int(fitted.height * scale_factor))
        
        print(f"🔍 BACKEND SCALE DEBUG:")
        print(f"  Original image: {img.width}x{img.height}px")
        print(f"  Target canvas: {target_w_px}x{target_h_px}px")
        print(f"  After fit: {fitted.width}x{fitted.height}px")
        print(f"  Scale factor: {scale_factor} ({custom_scale}%)")
        print(f"  Final scaled: {scaled_w}x{scaled_h}px")
        
        scaled_img = fitted.resize((scaled_w, scaled_h), resample=Image.Resampling.LANCZOS)
        
        # Parse background color
        try:
            if bg_color_hex.startswith('#'):
                bg_color_hex = bg_color_hex[1:]
            r = int(bg_color_hex[0:2], 16)
            g = int(bg_color_hex[2:4], 16) 
            b = int(bg_color_hex[4:6], 16)
            
            bg_mode = img.mode
            if bg_mode == "CMYK":
                # Convert RGB to CMYK approximation
                bg_color = (255-r, 255-g, 255-b, 0)
            elif bg_mode == "RGBA":
                bg_color = (r, g, b, 255)
            else:
                bg_color = (r, g, b)
            print(f"[DEBUG] Background color: {bg_color} for mode {bg_mode}")
        except Exception as e:
            print(f"[ERROR] Color parsing failed: {e}")
            # Fallback to white
            bg_mode = img.mode
            if bg_mode == "CMYK":
                bg_color = (0, 0, 0, 0)
            elif bg_mode == "RGBA":
                bg_color = (255, 255, 255, 255)
            else:
                bg_color = (255, 255, 255)
        
        bg = Image.new(bg_mode, (target_w_px, target_h_px), bg_color)
        x = (target_w_px - scaled_img.width) // 2
        y = (target_h_px - scaled_img.height) // 2
        print(f"[DEBUG] Pasting at position: ({x}, {y})")
        
        if scaled_img.mode != bg_mode:
            if bg_mode == "RGBA" and scaled_img.mode == "RGB":
                scaled_img = scaled_img.convert("RGBA")
            elif bg_mode == "RGB" and scaled_img.mode == "RGBA":
                # Create white background for RGBA->RGB conversion
                white_bg = Image.new("RGB", scaled_img.size, (255, 255, 255))
                white_bg.paste(scaled_img, mask=scaled_img.split()[-1] if scaled_img.mode == "RGBA" else None)
                scaled_img = white_bg
        
        bg.paste(scaled_img, (x, y))
        res_img = bg
    
    if original_icc and 'icc_profile' not in res_img.info:
        res_img.info['icc_profile'] = original_icc
    
    return res_img


def convert_konica_color(img: Image.Image) -> Image.Image:
    """Convert image using Konica ICC profile"""
    if not os.path.exists(ICC_RGB_PATH):
        raise Exception(f"Thiếu file {ICC_RGB_PATH}")
    if not os.path.exists(ICC_CMYK_PATH):
        raise Exception(f"Thiếu file {ICC_CMYK_PATH}")
    
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    try:
        img = ImageCms.profileToProfile(
            img, ICC_RGB_PATH, ICC_CMYK_PATH,
            renderingIntent=0, outputMode='CMYK'
        )
    except Exception as e:
        raise Exception(f"Lỗi xử lý ICC Konica: {str(e)}")
    
    return img


def draw_crop_marks(
    canvas: Image.Image, 
    page_w_px: int, 
    page_h_px: int, 
    len_px: int, 
    dist_px: int, 
    thick_px: int, 
    draw_color: Tuple
):
    """Draw crop marks on canvas"""
    draw = ImageDraw.Draw(canvas)
    
    # Top-left
    draw.line([(dist_px, dist_px), (dist_px + len_px, dist_px)], fill=draw_color, width=thick_px)
    draw.line([(dist_px, dist_px), (dist_px, dist_px + len_px)], fill=draw_color, width=thick_px)
    
    # Top-right
    draw.line([(page_w_px - dist_px - len_px, dist_px), (page_w_px - dist_px, dist_px)], fill=draw_color, width=thick_px)
    draw.line([(page_w_px - dist_px, dist_px), (page_w_px - dist_px, dist_px + len_px)], fill=draw_color, width=thick_px)
    
    # Bottom-left
    draw.line([(dist_px, page_h_px - dist_px), (dist_px + len_px, page_h_px - dist_px)], fill=draw_color, width=thick_px)
    draw.line([(dist_px, page_h_px - dist_px - len_px), (dist_px, page_h_px - dist_px)], fill=draw_color, width=thick_px)
    
    # Bottom-right
    draw.line([(page_w_px - dist_px - len_px, page_h_px - dist_px), (page_w_px - dist_px, page_h_px - dist_px)], fill=draw_color, width=thick_px)
    draw.line([(page_w_px - dist_px, page_h_px - dist_px - len_px), (page_w_px - dist_px, page_h_px - dist_px)], fill=draw_color, width=thick_px)


def draw_info_text(
    canvas: Image.Image, 
    text: str, 
    page_w_px: int, 
    margin_px: int, 
    dpi: int, 
    color_mode: str
):
    """Draw info text at top center of page (7pt font)"""
    if not text:
        return
    
    draw = ImageDraw.Draw(canvas)
    
    # 7pt ≈ 2.47mm, use 2.5mm for clean calculation
    font_size_px = int((7 / 72) * dpi)  # 7pt to pixels
    
    font = None
    font_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/Arial.ttf",
        "arial.ttf", 
        "Arial.ttf", 
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    
    for path in font_paths:
        if os.path.exists(path):
            try:
                font = ImageFont.truetype(path, font_size_px)
                break
            except:
                continue
    
    if not font:
        try:
            font = ImageFont.load_default()
        except:
            return
    
    col = get_draw_color('#000000', color_mode)
    
    try:
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        text_x = (page_w_px - text_w) / 2  # Center horizontally
        text_y = (margin_px - text_h) / 2  # Center in top margin
        draw.text((text_x, max(2, text_y)), text, font=font, fill=col)
    except:
        pass


def render_preview_thumbnail(
    input_path: str,
    item_w: float,
    item_h: float,
    fit_mode: str = 'fill',
    max_size: int = 200,
    shape: str = 'rect',
    manual_rotate: str = 'auto',  # auto/portrait/landscape
    form_data: Optional[Dict] = None  # For advanced color management
) -> Dict[str, str]:
    """
    Render 2 preview thumbnails - Main fitted into Item
    - portrait: for non-rotated items (itemW × itemH)
    - landscape: for rotated items (itemH × itemW)
    
    manual_rotate controls how Main is fitted into Item:
      - 'auto': rotate Main if needed for best coverage
      - 'portrait': keep Main vertical
      - 'landscape': rotate Main horizontal
    """
    import base64
    from PIL import ImageDraw
    
    ext = os.path.splitext(input_path)[1].lower()
    
    # Load source
    if ext == '.pdf':
        doc = open_and_sanitize_pdf(input_path)
        page = doc.load_page(0)
        # Use higher DPI for better quality preview of vector PDFs
        pix = page.get_pixmap(dpi=300)
        src_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        doc.close()
    else:
        src_img = Image.open(input_path)
        src_img = ImageOps.exif_transpose(src_img)
        if src_img.mode != 'RGB':
            src_img = src_img.convert('RGB')
    
    # Apply advanced color management if enabled
    if form_data:
        src_img = apply_advanced_color_management(src_img, form_data)
    
    # Decide Main rotation based on manual_rotate setting
    src_landscape = src_img.width > src_img.height
    item_landscape = item_w > item_h
    
    should_rotate_main = False
    if manual_rotate == 'auto':
        should_rotate_main = src_landscape != item_landscape
    elif manual_rotate == 'landscape':
        should_rotate_main = not src_landscape
    elif manual_rotate == 'portrait':
        should_rotate_main = src_landscape
    
    # Apply Main rotation
    main_img = src_img.rotate(-90, expand=True) if should_rotate_main else src_img.copy()
    
    def apply_fit_mode(img: Image.Image, target_w: int, target_h: int, mode: str) -> Image.Image:
        if mode == 'stretch':
            return img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        elif mode == 'fill':
            return ImageOps.fit(img, (target_w, target_h), Image.Resampling.LANCZOS)
        elif mode == 'fit':
            result = ImageOps.contain(img, (target_w, target_h), Image.Resampling.LANCZOS)
            bg = Image.new('RGB', (target_w, target_h), (255, 255, 255))
            x = (target_w - result.width) // 2
            y = (target_h - result.height) // 2
            bg.paste(result, (x, y))
            return bg
        elif mode == 'actual':
            bg = Image.new('RGB', (target_w, target_h), (255, 255, 255))
            x = (target_w - img.width) // 2
            y = (target_h - img.height) // 2
            bg.paste(img, (x, y))
            return bg
        return img
    
    def apply_shape_mask_preview(img: Image.Image, shape: str) -> Image.Image:
        if shape in ('rect', 'rectangle'):
            return img
        
        # Use shared get_shape_mask function for 100% consistency with PDF Output
        mask = get_shape_mask(shape, img.width, img.height)
        
        result = Image.new('RGBA', img.size, (255, 255, 255, 0))
        result.paste(img, (0, 0))
        result.putalpha(mask)
        
        bg = Image.new('RGB', img.size, (255, 255, 255))
        bg.paste(result, mask=result.split()[3])
        return bg
    
    def calc_thumb_size(w: float, h: float) -> Tuple[int, int]:
        ratio = min(max_size / w, max_size / h)
        return (max(1, int(w * ratio)), max(1, int(h * ratio)))
    
    def img_to_base64(img: Image.Image) -> str:
        buffer = BytesIO()
        img.save(buffer, format='PNG', optimize=True)
        buffer.seek(0)
        return base64.b64encode(buffer.read()).decode('utf-8')
    
    # For circle, use 1:1 ratio
    effective_h = item_w if shape == 'circle' else item_h
    
    # Portrait thumbnail: Main fitted in Item (itemW × itemH)
    thumb_w, thumb_h = calc_thumb_size(item_w, effective_h)
    portrait_img = apply_fit_mode(main_img.copy(), thumb_w, thumb_h, fit_mode)
    
    # Apply Mask using shared logic
    portrait_img = apply_shape_mask_preview(portrait_img, shape)
    
    # Landscape thumbnail: Portrait rotated 90° (for when Item is rotated on Page)
    # This represents the same Item+Main unit, just rotated
    landscape_img = portrait_img.rotate(-90, expand=True)
    
    return {
        'portrait': img_to_base64(portrait_img),
        'landscape': img_to_base64(landscape_img),
        'rotated': should_rotate_main
    }


def calc_fit_rect(
    src_w: float, src_h: float, 
    target_w: float, target_h: float, 
    fit_mode: str
) -> Tuple[fitz.Rect, fitz.Rect]:
    """
    Calculate source clip rect and destination rect for fit mode
    Returns: (clip_rect for source, dest_rect adjusted)
    """
    src_ratio = src_w / src_h
    target_ratio = target_w / target_h
    
    if fit_mode == 'stretch':
        # Use full source, stretch to target
        return None, None  # No clipping needed
    
    elif fit_mode == 'fill':
        # Scale to cover, clip excess
        if src_ratio > target_ratio:
            # Source wider - clip sides
            new_src_w = src_h * target_ratio
            clip_x = (src_w - new_src_w) / 2
            clip_rect = fitz.Rect(clip_x, 0, clip_x + new_src_w, src_h)
        else:
            # Source taller - clip top/bottom
            new_src_h = src_w / target_ratio
            clip_y = (src_h - new_src_h) / 2
            clip_rect = fitz.Rect(0, clip_y, src_w, clip_y + new_src_h)
        return clip_rect, None
    
    elif fit_mode == 'fit':
        # Scale to contain, center in target
        if src_ratio > target_ratio:
            # Source wider - fit to width
            new_h = target_w / src_ratio
            offset_y = (target_h - new_h) / 2
            dest_rect = fitz.Rect(0, offset_y, target_w, offset_y + new_h)
        else:
            # Source taller - fit to height
            new_w = target_h * src_ratio
            offset_x = (target_w - new_w) / 2
            dest_rect = fitz.Rect(offset_x, 0, offset_x + new_w, target_h)
        return None, dest_rect
    
    elif fit_mode == 'actual':
        # Original size, centered
        offset_x = (target_w - src_w) / 2
        offset_y = (target_h - src_h) / 2
        dest_rect = fitz.Rect(offset_x, offset_y, offset_x + src_w, offset_y + src_h)
        return None, dest_rect
    
    return None, None


def get_shape_path(shape: str, x: float, y: float, w: float, h: float) -> List[Tuple[float, float]]:
    """Get polygon points for special shapes (Pointy Top Hexagon, Triangle, Trapezoid)"""
    cx = x + w / 2
    cy = y + h / 2
    
    if shape == 'hexagon':
        # Pointy Top Hexagon fitted to bounding box
        rx = w / 2
        ry = h / 2
        return [
            (cx, cy - ry),          # Top
            (cx + rx, cy - ry/2),   # TopRight
            (cx + rx, cy + ry/2),   # BottomRight
            (cx, cy + ry),          # Bottom
            (cx - rx, cy + ry/2),   # BottomLeft
            (cx - rx, cy - ry/2)    # TopLeft
        ]
    elif shape == 'triangle':
        # Triangle (Point Up)
        # Note: If item['rot'] is true, logic elsewhere handles rotation of content, 
        # but here we define the mask shape.
        # Frontend: Normal = Point Up. Rotated = Point Down.
        # Here we just return Point Up. If rotation is applied to the Page Item (including mask), it works.
        return [
            (cx, y),      # Top center
            (x + w, y + h), # Bottom right
            (x, y + h)    # Bottom left
        ]
    elif shape == 'trapezoid':
        # Trapezoid
        top_ratio = 0.7
        narrow_w = w * top_ratio
        offset = (w - narrow_w) / 2
        return [
            (x + offset, y),            # Top Left
            (x + offset + narrow_w, y), # Top Right
            (x + w, y + h),             # Bottom Right
            (x, y + h)                  # Bottom Left
        ]
    elif shape in ('circle', 'oval'):
        # For circle/oval, we can use rect with rx/ry in SVG, but path is generic
        # Use simple ellipse command approximation or just M... if complex
        # But SVG supports <ellipse>, we might use that directly in template instead of path
        # If we must return path d:
        # Ellipse path is complex in 'd'. Let's return None and handle in template.
        return ""
        
    return ""


def get_shape_mask(shape: str, width: int, height: int) -> Image.Image:
    """
    Create a grayscale mask for the specified shape.
    White = Visible, Black = Transparent
    """
    mask = Image.new('L', (width, height), 0)  # Start with black (transparent)
    draw = ImageDraw.Draw(mask)
    
    if shape in ('rect', 'rectangle'):
        draw.rectangle((0, 0, width, height), fill=255)
    
    elif shape in ('circle', 'oval'):
        draw.ellipse((0, 0, width, height), fill=255)
        
    elif shape == 'hexagon':
        # Pointy Top Hexagon
        rx = width / 2
        ry = height / 2
        cx, cy = width / 2, height / 2
        points = [
            (cx, cy - ry),          # Top
            (cx + rx, cy - ry/2),   # TopRight
            (cx + rx, cy + ry/2),   # BottomRight
            (cx, cy + ry),          # Bottom
            (cx - rx, cy + ry/2),   # BottomLeft
            (cx - rx, cy - ry/2)    # TopLeft
        ]
        draw.polygon(points, fill=255)
        
    elif shape == 'triangle':
        # Triangle (Point Up)
        points = [
            (width / 2, 0),      # Top center
            (width, height),     # Bottom right
            (0, height)          # Bottom left
        ]
        draw.polygon(points, fill=255)
        
    elif shape == 'trapezoid':
        # Trapezoid (Isosceles)
        top_ratio = 0.7
        narrow_w = width * top_ratio
        offset = (width - narrow_w) / 2
        points = [
            (offset, 0),            # Top Left
            (offset + narrow_w, 0), # Top Right
            (width, height),        # Bottom Right
            (0, height)             # Bottom Left
        ]
        draw.polygon(points, fill=255)
        
    return mask


def generate_pdf_vector(
    input_path: str,
    plan_items: List[Dict],
    page_w: float,
    page_h: float,
    item_w: float,
    item_h: float,
    auto_rotate: bool = False,
    fit_mode: str = 'fill',
    rotation: int = 0,  # Manual rotation from frontend
    use_crop: bool = False,
    crop_len: float = 10,
    crop_dist: float = 10,
    crop_thick: float = 0.5,
    crop_color: str = '#000000',
    info_text: str = '',
    shape: str = 'rect',
    # Page Crop Marks
    use_page_crop: bool = False,
    page_crop_len: float = 10,
    page_crop_dist: float = 10,
    page_crop_thick: float = 0.5,
    page_crop_color: str = '#000000',
    # 2-sided printing
    is_2sided: bool = False,
    rot_180_front: bool = False,
    rot_180_back: bool = False,
    # Output settings
    dpi: int = 300,
    color_mode: str = 'original',
    custom_scale: float = 100.0,
    background_color: str = '#ffffff'
) -> bytes:
    """
    Generate PDF in vector mode using ReportLab with native PDF Clipping Path.
    This ensures perfect transparency and no overlapping issues.
    """
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    
    ext = os.path.splitext(input_path)[1].lower()
    
    # Create PDF in memory
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=(page_w * mm, page_h * mm))
    
    # Load and prepare source image
    if ext == '.pdf':
        # Rasterize PDF to image at specified DPI
        src_doc = open_and_sanitize_pdf(input_path)
        pix = src_doc[0].get_pixmap(dpi=dpi, alpha=False)
        src_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        src_doc.close()
    else:
        src_img = Image.open(input_path)
        src_img = ImageOps.exif_transpose(src_img)
        if src_img.mode == 'RGBA':
            # Flatten alpha to white background for PDF
            bg = Image.new('RGB', src_img.size, (255, 255, 255))
            bg.paste(src_img, mask=src_img.split()[3])
            src_img = bg
        elif src_img.mode != 'RGB':
            src_img = src_img.convert('RGB')
    
    # Apply color mode conversion
    if color_mode == 'cmyk':
        src_img = src_img.convert('CMYK').convert('RGB')
    elif color_mode == 'rgb':
        src_img = src_img.convert('RGB')
    
    has_total_rotation = any(item.get('totalRotation') is not None for item in plan_items)
    
    # Apply rotation from frontend (manual or auto-calculated) only for legacy mode
    if rotation != 0 and not has_total_rotation:
        print(f"[DEBUG] Vector mode: Applying legacy rotation {rotation}° (auto_rotate={auto_rotate})")
        src_img = src_img.rotate(-rotation, expand=True)  # CSS -> PIL: đảo dấu
    
    # Fit image to item dimensions (legacy mode)
    effective_item_h = item_w if shape == 'circle' else item_h
    target_w_px = mm_to_px(item_w, dpi)
    target_h_px = mm_to_px(effective_item_h, dpi)
    processed_img = process_image_fit_mode(src_img, target_w_px, target_h_px, fit_mode, False, custom_scale, background_color)
    
    # Convert to bytes for ReportLab
    img_buffer = BytesIO()
    processed_img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    img_reader = ImageReader(img_buffer)
    
    raw_img_reader = None
    if has_total_rotation:
        raw_buffer = BytesIO()
        src_img.save(raw_buffer, format='PNG')
        raw_buffer.seek(0)
        raw_img_reader = ImageReader(raw_buffer)
    
    # Helper function to get clipping path points for a shape
    def get_clip_path_points(shape_type: str, x: float, y: float, w: float, h: float, rotated: bool = False):
        """
        Get clipping path points for different shapes.
        ReportLab uses bottom-left origin, so y is inverted.
        Returns list of (x, y) tuples for the path.
        """
        # Center point
        cx = x + w / 2
        cy = y + h / 2
        
        if shape_type in ('rect', 'rectangle'):
            return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        
        elif shape_type in ('circle', 'oval'):
            # For ellipse, we'll use bezier curves (handled separately)
            return None  # Signal to use ellipse drawing
        
        elif shape_type == 'hexagon':
            # Pointy Top Hexagon
            rx = w / 2
            ry = h / 2
            points = [
                (cx, y + h),        # Top (in PDF coords = bottom visually, but we flip later)
                (cx + rx, y + h - ry/2),
                (cx + rx, y + ry/2),
                (cx, y),            # Bottom
                (cx - rx, y + ry/2),
                (cx - rx, y + h - ry/2)
            ]
            if rotated:
                # Rotate 180 degrees around center
                points = [(2*cx - px, 2*cy - py) for px, py in points]
            return points
        
        elif shape_type == 'triangle':
            if rotated:
                # Point Down
                points = [
                    (x, y + h),         # Top Left
                    (x + w, y + h),     # Top Right
                    (cx, y)             # Bottom Center
                ]
            else:
                # Point Up
                points = [
                    (cx, y + h),        # Top Center
                    (x + w, y),         # Bottom Right
                    (x, y)              # Bottom Left
                ]
            return points
        
        elif shape_type == 'trapezoid':
            top_ratio = 0.7
            narrow_w = w * top_ratio
            offset = (w - narrow_w) / 2
            if rotated:
                # Flipped (wide at top)
                points = [
                    (x, y + h),                     # Top Left
                    (x + w, y + h),                 # Top Right
                    (x + offset + narrow_w, y),    # Bottom Right
                    (x + offset, y)                 # Bottom Left
                ]
            else:
                # Normal (narrow at top)
                points = [
                    (x + offset, y + h),            # Top Left
                    (x + offset + narrow_w, y + h), # Top Right
                    (x + w, y),                     # Bottom Right
                    (x, y)                          # Bottom Left
                ]
            return points
        
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]  # Default rect
    
    # Determine if shape needs 180° flip or 90° rotation
    is_flip_shape = shape in ('triangle', 'trapezoid', 'hexagon')
    
    # Draw each item with clipping
    for item in plan_items:
        # Convert mm to points (ReportLab uses points, 1mm = 2.834645669 points)
        x_pt = item['x'] * mm
        # ReportLab has origin at bottom-left, so flip Y
        # y_pt should be from bottom, but our data is from top
        # page_h * mm - item['y'] * mm - item_h * mm (for non-rotated)
        
        eff_item_h = item_w if shape == 'circle' else item_h
        if is_flip_shape:
            # For flip shapes, dimensions don't swap
            w_mm = item_w
            h_mm = eff_item_h
            is_rotated = item.get('rot', False)
        elif shape == 'circle':
            w_mm = item_w
            h_mm = item_w
            is_rotated = False
        else:
            # For rect/oval/circle, dimensions swap when rotated
            if item.get('rot'):
                w_mm = eff_item_h
                h_mm = item_w
            else:
                w_mm = item_w
                h_mm = eff_item_h
            is_rotated = item.get('rot', False)
        
        if 'w' in item and item['w'] is not None:
            w_mm = float(item['w'])
        if 'h' in item and item['h'] is not None:
            h_mm = float(item['h'])
        if shape == 'circle':
            h_mm = w_mm
        
        w_pt = w_mm * mm
        h_pt = h_mm * mm
        
        # Calculate Y from bottom (ReportLab coordinate system)
        y_pt = page_h * mm - item['y'] * mm - h_pt
        
        # Save graphics state before clipping
        c.saveState()
        
        # Create clipping path
        path = c.beginPath()
        
        if shape in ('circle', 'oval'):
            # Draw ellipse clipping path
            # ReportLab ellipse is drawn from center
            cx = x_pt + w_pt / 2
            cy = y_pt + h_pt / 2
            # Use bezier approximation for ellipse
            path.ellipse(x_pt, y_pt, x_pt + w_pt, y_pt + h_pt)
        else:
            # Get polygon points
            points = get_clip_path_points(shape, x_pt, y_pt, w_pt, h_pt, is_rotated if is_flip_shape else False)
            if points:
                path.moveTo(points[0][0], points[0][1])
                for px, py in points[1:]:
                    path.lineTo(px, py)
                path.close()
            else:
                path.rect(x_pt, y_pt, w_pt, h_pt)
        
        # Apply clipping path
        c.clipPath(path, stroke=0, fill=0)
        
        # Draw the image inside the clipped area
        if has_total_rotation and raw_img_reader is not None:
            tot_rot = float(item.get('totalRotation', 0)) % 360
            is_odd_90 = (tot_rot % 180) != 0
            
            elem_w_pt = h_pt if is_odd_90 else w_pt
            elem_h_pt = w_pt if is_odd_90 else h_pt
            
            scale_factor = (custom_scale / 100.0) if custom_scale != 100 else 1.0
            img_w = src_img.width
            img_h = src_img.height
            
            if fit_mode == 'stretch':
                dw = elem_w_pt * scale_factor
                dh = elem_h_pt * scale_factor
            elif fit_mode == 'fit':
                s = min(elem_w_pt / img_w, elem_h_pt / img_h) * scale_factor
                dw = img_w * s
                dh = img_h * s
            elif fit_mode == 'actual':
                s = (72.0 / dpi) * scale_factor
                dw = img_w * s
                dh = img_h * s
            else:  # 'fill' (cover)
                s = max(elem_w_pt / img_w, elem_h_pt / img_h) * scale_factor
                dw = img_w * s
                dh = img_h * s
                
            c.saveState()
            cx = x_pt + w_pt / 2
            cy = y_pt + h_pt / 2
            c.translate(cx, cy)
            if tot_rot != 0:
                c.rotate(-tot_rot)
                
            if background_color and background_color.lower() not in ('#ffffff', 'white', '') and fit_mode in ('fit', 'actual'):
                try:
                    hex_c = background_color.lstrip('#')
                    r = int(hex_c[0:2], 16) / 255.0
                    g = int(hex_c[2:4], 16) / 255.0
                    b = int(hex_c[4:6], 16) / 255.0
                    c.setFillColorRGB(r, g, b)
                    c.rect(-elem_w_pt/2, -elem_h_pt/2, elem_w_pt, elem_h_pt, fill=1, stroke=0)
                except:
                    pass
                    
            c.drawImage(raw_img_reader, -dw/2, -dh/2, width=dw, height=dh, mask='auto')
            c.restoreState()
        elif not is_flip_shape and item['rot']:
            # Slot is rotated: container is h×w, image is processed as w×h
            # Rotate -90° to fit image into rotated slot
            c.saveState()
            cx = x_pt + w_pt / 2
            cy = y_pt + h_pt / 2
            c.translate(cx, cy)
            c.rotate(-90)
            c.drawImage(img_reader, -h_pt/2, -w_pt/2, width=h_pt, height=w_pt, mask='auto')
            c.restoreState()
        elif is_flip_shape and item['rot']:
            # Rotate 180 degrees for flip shapes
            c.saveState()
            cx = x_pt + w_pt / 2
            cy = y_pt + h_pt / 2
            c.translate(cx, cy)
            c.rotate(180)
            c.drawImage(img_reader, -w_pt/2, -h_pt/2, width=w_pt, height=h_pt, mask='auto')
            c.restoreState()
        else:
            # No rotation needed
            c.drawImage(img_reader, x_pt, y_pt, width=w_pt, height=h_pt, mask='auto')
        
        # Restore graphics state (removes clipping)
        c.restoreState()
    
    # Initialize crop mark variables (needed for 2-sided even if use_crop is False)
    len_pt = crop_len * mm
    dist_pt = crop_dist * mm
    
    # Parse crop color
    try:
        r = int(crop_color[1:3], 16) / 255
        g = int(crop_color[3:5], 16) / 255
        b = int(crop_color[5:7], 16) / 255
    except:
        r, g, b = 0, 0, 0
    
    # Draw crop marks for each item
    if use_crop:
        c.setStrokeColorRGB(r, g, b)
        c.setLineWidth(crop_thick * mm)
        
        # Draw crop marks for each item
        for item in plan_items:
            # Get item dimensions
            eff_item_h = item_w if shape == 'circle' else item_h
            if is_flip_shape:
                w_mm = item_w
                h_mm = eff_item_h
            elif shape == 'circle':
                w_mm = item_w
                h_mm = item_w
            else:
                if item.get('rot'):
                    w_mm = eff_item_h
                    h_mm = item_w
                else:
                    w_mm = item_w
                    h_mm = eff_item_h
            if 'w' in item and item['w'] is not None:
                w_mm = float(item['w'])
            if 'h' in item and item['h'] is not None:
                h_mm = float(item['h'])
            if shape == 'circle':
                h_mm = w_mm
            
            # Item position in points (ReportLab Y from bottom)
            ix_pt = item['x'] * mm
            iy_pt = page_h * mm - item['y'] * mm - h_mm * mm
            iw_pt = w_mm * mm
            ih_pt = h_mm * mm
            
            # Top-left corner of item
            c.line(ix_pt - dist_pt - len_pt, iy_pt + ih_pt, ix_pt - dist_pt, iy_pt + ih_pt)  # horizontal
            c.line(ix_pt, iy_pt + ih_pt + dist_pt, ix_pt, iy_pt + ih_pt + dist_pt + len_pt)  # vertical
            
            # Top-right corner of item
            c.line(ix_pt + iw_pt + dist_pt, iy_pt + ih_pt, ix_pt + iw_pt + dist_pt + len_pt, iy_pt + ih_pt)  # horizontal
            c.line(ix_pt + iw_pt, iy_pt + ih_pt + dist_pt, ix_pt + iw_pt, iy_pt + ih_pt + dist_pt + len_pt)  # vertical
            
            # Bottom-left corner of item
            c.line(ix_pt - dist_pt - len_pt, iy_pt, ix_pt - dist_pt, iy_pt)  # horizontal
            c.line(ix_pt, iy_pt - dist_pt - len_pt, ix_pt, iy_pt - dist_pt)  # vertical
            
            # Bottom-right corner of item
            c.line(ix_pt + iw_pt + dist_pt, iy_pt, ix_pt + iw_pt + dist_pt + len_pt, iy_pt)  # horizontal
            c.line(ix_pt + iw_pt, iy_pt - dist_pt - len_pt, ix_pt + iw_pt, iy_pt - dist_pt)  # vertical
    
    # Initialize page crop mark variables (needed for 2-sided even if use_page_crop is False)
    page_w_pt = page_w * mm
    page_h_pt = page_h * mm
    pcl_pt = page_crop_len * mm
    pcd_pt = page_crop_dist * mm
    pct_pt = page_crop_thick * mm
    
    # Parse page crop color
    try:
        pr = int(page_crop_color[1:3], 16) / 255
        pg = int(page_crop_color[3:5], 16) / 255
        pb = int(page_crop_color[5:7], 16) / 255
    except:
        pr, pg, pb = 0, 0, 0
    
    # Draw Page Crop Marks (L-shaped at 4 corners of page)
    if use_page_crop:
        c.setStrokeColorRGB(pr, pg, pb)
        c.setLineWidth(pct_pt)
        
        # Top-left (Y from bottom in ReportLab)
        c.line(pcd_pt, page_h_pt - pcd_pt, pcd_pt + pcl_pt, page_h_pt - pcd_pt)
        c.line(pcd_pt, page_h_pt - pcd_pt, pcd_pt, page_h_pt - pcd_pt - pcl_pt)
        # Top-right
        c.line(page_w_pt - pcd_pt - pcl_pt, page_h_pt - pcd_pt, page_w_pt - pcd_pt, page_h_pt - pcd_pt)
        c.line(page_w_pt - pcd_pt, page_h_pt - pcd_pt, page_w_pt - pcd_pt, page_h_pt - pcd_pt - pcl_pt)
        # Bottom-left
        c.line(pcd_pt, pcd_pt, pcd_pt + pcl_pt, pcd_pt)
        c.line(pcd_pt, pcd_pt, pcd_pt, pcd_pt + pcl_pt)
        # Bottom-right
        c.line(page_w_pt - pcd_pt - pcl_pt, pcd_pt, page_w_pt - pcd_pt, pcd_pt)
        c.line(page_w_pt - pcd_pt, pcd_pt, page_w_pt - pcd_pt, pcd_pt + pcl_pt)
    
    # Draw info text
    if info_text:
        font_name = register_unicode_font()
        c.setFont(font_name, 7)
        c.setFillColorRGB(0, 0, 0)
        text_w = c.stringWidth(info_text, font_name, 7)
        tx = (page_w * mm - text_w) / 2
        ty = page_h * mm - 3 * mm  # 3mm from top
        c.drawString(tx, ty, info_text)
    
    # End first page
    c.showPage()
    
    # Generate back page for 2-sided printing
    if is_2sided:
        # Create back page with same layout but potentially rotated
        page_w_pt = page_w * mm
        page_h_pt = page_h * mm
        
        # Apply rotation to back page if needed
        if rot_180_back:
            c.saveState()
            c.translate(page_w_pt, page_h_pt)
            c.rotate(180)
        
        # Draw each item on back page (mirrored horizontally for 2-sided)
        for item in plan_items:
            if is_flip_shape:
                w_mm = item_w
                h_mm = item_h
                is_rotated = item['rot']
            else:
                if item['rot']:
                    w_mm = item_h
                    h_mm = item_w
                else:
                    w_mm = item_w
                    h_mm = item_h
                is_rotated = item['rot']
            
            w_pt = w_mm * mm
            h_pt = h_mm * mm
            
            # Mirror X position for back side
            x_pt = page_w_pt - item['x'] * mm - w_pt
            y_pt = page_h_pt - item['y'] * mm - h_pt
            
            c.saveState()
            
            # Create clipping path
            path = c.beginPath()
            if shape in ('circle', 'oval'):
                path.ellipse(x_pt, y_pt, x_pt + w_pt, y_pt + h_pt)
            else:
                points = get_clip_path_points(shape, x_pt, y_pt, w_pt, h_pt, is_rotated if is_flip_shape else False)
                if points:
                    path.moveTo(points[0][0], points[0][1])
                    for px, py in points[1:]:
                        path.lineTo(px, py)
                    path.close()
            
            c.clipPath(path, stroke=0, fill=0)
            
            # Draw image
            if not is_flip_shape and item['rot']:
                c.saveState()
                cx = x_pt + w_pt / 2
                cy = y_pt + h_pt / 2
                c.translate(cx, cy)
                c.rotate(-90)
                c.drawImage(img_reader, -h_pt/2, -w_pt/2, width=h_pt, height=w_pt, mask='auto')
                c.restoreState()
            elif is_flip_shape and item['rot']:
                c.saveState()
                cx = x_pt + w_pt / 2
                cy = y_pt + h_pt / 2
                c.translate(cx, cy)
                c.rotate(180)
                c.drawImage(img_reader, -w_pt/2, -h_pt/2, width=w_pt, height=h_pt, mask='auto')
                c.restoreState()
            else:
                c.drawImage(img_reader, x_pt, y_pt, width=w_pt, height=h_pt, mask='auto')
            
            c.restoreState()
        
        if rot_180_back:
            c.restoreState()
        
        # Draw crop marks on back page
        if use_crop:
            c.setStrokeColorRGB(r, g, b)
            c.setLineWidth(crop_thick * mm)
            
            for item in plan_items:
                if is_flip_shape:
                    w_mm = item_w
                    h_mm = item_h
                else:
                    if item['rot']:
                        w_mm = item_h
                        h_mm = item_w
                    else:
                        w_mm = item_w
                        h_mm = item_h
                
                # Mirror X position
                ix_pt = page_w_pt - item['x'] * mm - w_mm * mm
                iy_pt = page_h_pt - item['y'] * mm - h_mm * mm
                iw_pt = w_mm * mm
                ih_pt = h_mm * mm
                
                # Draw crop marks (same pattern as front)
                c.line(ix_pt - dist_pt - len_pt, iy_pt + ih_pt, ix_pt - dist_pt, iy_pt + ih_pt)
                c.line(ix_pt, iy_pt + ih_pt + dist_pt, ix_pt, iy_pt + ih_pt + dist_pt + len_pt)
                c.line(ix_pt + iw_pt + dist_pt, iy_pt + ih_pt, ix_pt + iw_pt + dist_pt + len_pt, iy_pt + ih_pt)
                c.line(ix_pt + iw_pt, iy_pt + ih_pt + dist_pt, ix_pt + iw_pt, iy_pt + ih_pt + dist_pt + len_pt)
                c.line(ix_pt - dist_pt - len_pt, iy_pt, ix_pt - dist_pt, iy_pt)
                c.line(ix_pt, iy_pt - dist_pt - len_pt, ix_pt, iy_pt - dist_pt)
                c.line(ix_pt + iw_pt + dist_pt, iy_pt, ix_pt + iw_pt + dist_pt + len_pt, iy_pt)
                c.line(ix_pt + iw_pt, iy_pt - dist_pt - len_pt, ix_pt + iw_pt, iy_pt - dist_pt)
        
        # Draw page crop marks on back
        if use_page_crop:
            c.setStrokeColorRGB(pr, pg, pb)
            c.setLineWidth(pct_pt)
            c.line(pcd_pt, page_h_pt - pcd_pt, pcd_pt + pcl_pt, page_h_pt - pcd_pt)
            c.line(pcd_pt, page_h_pt - pcd_pt, pcd_pt, page_h_pt - pcd_pt - pcl_pt)
            c.line(page_w_pt - pcd_pt - pcl_pt, page_h_pt - pcd_pt, page_w_pt - pcd_pt, page_h_pt - pcd_pt)
            c.line(page_w_pt - pcd_pt, page_h_pt - pcd_pt, page_w_pt - pcd_pt, page_h_pt - pcd_pt - pcl_pt)
            c.line(pcd_pt, pcd_pt, pcd_pt + pcl_pt, pcd_pt)
            c.line(pcd_pt, pcd_pt, pcd_pt, pcd_pt + pcl_pt)
            c.line(page_w_pt - pcd_pt - pcl_pt, pcd_pt, page_w_pt - pcd_pt, pcd_pt)
            c.line(page_w_pt - pcd_pt, pcd_pt, page_w_pt - pcd_pt, pcd_pt + pcl_pt)
        
        c.showPage()
    
    # Finalize PDF
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer.read()


def generate_pdf(
    input_path: str,
    plan_items: List[Dict],
    page_w: float,
    page_h: float,
    item_w: float,
    item_h: float,
    dpi: int = 300,
    fit_mode: str = 'fill',
    color_mode: str = 'original',
    use_crop: bool = False,
    crop_len: float = 10,
    crop_dist: float = 10,
    crop_thick: float = 0.5,
    crop_color: str = '#000000',
    auto_rotate: bool = False,
    info_text: str = '',
    process_mode: str = 'raster',
    shape: str = 'rect',
    rotation: int = 0,  # Manual rotation from frontend
    custom_scale: float = 100.0,
    background_color: str = '#ffffff',
    gcr_level: float = 1.0,  # GCR 0.0..1.0 (1.0 = max K, 0.22 = SWOP v2 style)
    # Advanced parameters
    use_page_crop: bool = False,
    page_crop_len: float = 10,
    page_crop_dist: float = 10,
    page_crop_thick: float = 0.5,
    page_crop_color: str = '#000000',
    is_2sided: bool = False,
    rot_180_front: bool = False,
    rot_180_back: bool = False,
    data_mode: int = 1,
    x_up_qty: int = 1,
    standard_qty: int = 1
) -> bytes:
    """
    Generate PDF from source image with layout
    
    Returns:
        PDF content as bytes
    """
    # Use vector mode - places each item individually (not full-page rasterization)
    if process_mode == 'vector':
        try:
            return generate_pdf_vector(
                input_path=input_path,
                plan_items=plan_items,
                page_w=page_w,
                page_h=page_h,
                item_w=item_w,
                item_h=item_h,
                auto_rotate=auto_rotate,
                fit_mode=fit_mode,
                rotation=rotation,  # Pass rotation
                use_crop=use_crop,
                crop_len=crop_len,
                crop_dist=crop_dist,
                crop_thick=crop_thick,
                crop_color=crop_color,
                info_text=info_text,
                shape=shape,
                # Advanced parameters
                use_page_crop=use_page_crop,
                page_crop_len=page_crop_len,
                page_crop_dist=page_crop_dist,
                page_crop_thick=page_crop_thick,
                page_crop_color=page_crop_color,
                # 2-sided printing
                is_2sided=is_2sided,
                rot_180_front=rot_180_front,
                rot_180_back=rot_180_back,
                # Output settings
                dpi=dpi,
                color_mode=color_mode,
                custom_scale=custom_scale,
                background_color=background_color
            )
        except Exception as e:
            print(f"Vector mode failed, falling back to raster: {e}")
    
    # Raster mode (default)
    # Load source image
    source_img = load_source_image(input_path, dpi)
    
    # Apply rotation from frontend (manual or auto-calculated)
    if rotation != 0:
        print(f"[DEBUG] Raster mode: Applying rotation {rotation}° (auto_rotate={auto_rotate})")
        source_img = source_img.rotate(-rotation, expand=True)  # CSS -> PIL: đảo dấu
    
    # Determine final mode
    final_mode = 'RGB'
    if color_mode in ('cmyk', 'cmyk_k100', 'konica'):
        final_mode = 'CMYK'
    elif color_mode == 'original' and source_img.mode == 'CMYK':
        final_mode = 'CMYK'
    
    # Initialize canvas
    page_w_px = mm_to_px(page_w, dpi)
    page_h_px = mm_to_px(page_h, dpi)
    bg_color = (0, 0, 0, 0) if final_mode == 'CMYK' else (255, 255, 255)
    canvas = Image.new(final_mode, (page_w_px, page_h_px), bg_color)
    
    # Process unit image
    item_w_px = mm_to_px(item_w, dpi)
    item_h_px = mm_to_px(item_h, dpi)
    
    # Don't pass auto_rotate to process_image_fit_mode - rotation already applied above
    processed_unit = process_image_fit_mode(source_img, item_w_px, item_h_px, fit_mode, False, custom_scale, background_color)
    
    # Apply color conversion
    if color_mode == 'konica':
        processed_unit = flatten_alpha(processed_unit)
        processed_unit = convert_konica_color(processed_unit)
    elif color_mode == 'cmyk_k100':
        processed_unit = flatten_alpha(processed_unit)
        processed_unit = convert_cmyk_k100(processed_unit, gcr_level=gcr_level)  # GCR-controlled
    elif color_mode == 'cmyk':
        processed_unit = flatten_alpha(processed_unit)
        processed_unit = processed_unit.convert('CMYK')
    elif color_mode == 'rgb':
        processed_unit = flatten_alpha(processed_unit)
        processed_unit = processed_unit.convert('RGB')
    elif color_mode == 'original':
        if source_img.mode != 'CMYK':
            processed_unit = flatten_alpha(processed_unit)
            processed_unit = processed_unit.convert('RGB')
    
    # Create rotated version
    processed_unit_rot = processed_unit.rotate(-90, expand=True)
    
    # Paste items onto canvas
    for item in plan_items:
        dest_x = mm_to_px(item['x'], dpi)
        dest_y = mm_to_px(item['y'], dpi)
        img_to_paste = processed_unit_rot if item['rot'] else processed_unit
        canvas.paste(img_to_paste, (dest_x, dest_y))
    
    # Draw crop marks
    if use_crop:
        c_len = mm_to_px(crop_len, dpi)
        c_dist = mm_to_px(crop_dist, dpi)
        c_thick = max(1, mm_to_px(crop_thick, dpi))
        col = get_draw_color(crop_color, final_mode)
        draw_crop_marks(canvas, page_w_px, page_h_px, c_len, c_dist, c_thick, col)
    
    # Always draw info text at top center (7pt font in margin area)
    if info_text:
        draw_info_text(canvas, info_text, page_w_px, mm_to_px(3, dpi), dpi, final_mode)
    
    # Save to PDF
    temp_jpg = BytesIO()
    canvas.save(temp_jpg, format='JPEG', quality=95, dpi=(dpi, dpi), subsampling=0)
    temp_jpg.seek(0)
    
    pdf_bytes = img2pdf.convert(temp_jpg)
    
    return pdf_bytes


def generate_svg(
    plan_items: List[Dict],
    page_w: float,
    page_h: float,
    item_w: float,
    item_h: float,
    shape: str = 'rect'
) -> str:
    """
    Generate SVG cut file from layout
    
    Returns:
        SVG content as string
    """
    content = ''
    
    if shape in ('circle', 'oval'):
        for item in plan_items:
            w = item_h if item['rot'] else item_w
            h = item_w if item['rot'] else item_h
            rx = w / 2
            ry = h / 2
            cx = item['x'] + rx
            cy = item['y'] + ry
            
            if shape == 'circle':
                content += f'<circle cx="{cx}" cy="{cy}" r="{rx}" class="cut-line" />'
            else:
                content += f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" class="cut-line" />'
    
    elif shape in ('hexagon', 'triangle', 'trapezoid'):
        poly_lines = []
        
        for item in plan_items:
            x = item['x']
            y = item['y']
            
            # Get points from helper
            pts = get_shape_path(shape, x, y, item_w, item_h)
            
            # Handle rotation
            if shape == 'trapezoid':
                top_ratio = 0.7
                narrow_w = item_w * top_ratio
                offset = (item_w - narrow_w) / 2
                if item['rot']:
                    # Flipped
                    pts = [
                        (x, y), (x + item_w, y), 
                        (x + offset + narrow_w, y + item_h), (x + offset, y + item_h)
                    ]
                else:
                    # Normal
                    pts = [
                        (x + offset, y), (x + offset + narrow_w, y), 
                        (x + item_w, y + item_h), (x, y + item_h)
                    ]
            elif shape == 'triangle':
                if item['rot']:
                    # Point Down
                    pts = [
                        (x, y), (x + item_w, y), (x + item_w/2, y + item_h)
                    ]
                else:
                    # Point Up
                    pts = [
                        (x + item_w/2, y), (x + item_w, y + item_h), (x, y + item_h)
                    ]
            # Hexagon is already correct in get_shape_path
            
            # Add to poly_lines
            for i in range(len(pts)):
                p1 = pts[i]
                p2 = pts[(i + 1) % len(pts)]
                poly_lines.append({'x1': p1[0], 'y1': p1[1], 'x2': p2[0], 'y2': p2[1]})
        
        # Deduplicate lines
        unique_lines = []
        EPSILON = 0.1
        
        for l in poly_lines:
            p1 = (l['x1'], l['y1'])
            p2 = (l['x2'], l['y2'])
            
            if p1[0] > p2[0] or (abs(p1[0] - p2[0]) < EPSILON and p1[1] > p2[1]):
                p1, p2 = p2, p1
            
            is_dup = False
            for u in unique_lines:
                if (abs(p1[0] - u[0][0]) < EPSILON and abs(p1[1] - u[0][1]) < EPSILON and
                    abs(p2[0] - u[1][0]) < EPSILON and abs(p2[1] - u[1][1]) < EPSILON):
                    is_dup = True
                    break
            
            if not is_dup:
                unique_lines.append((p1, p2))
        
        for p1, p2 in unique_lines:
            content += f'<line x1="{p1[0]:.3f}" y1="{p1[1]:.3f}" x2="{p2[0]:.3f}" y2="{p2[1]:.3f}" class="cut-line" />'
    
    else:
        lines = []
        
        for item in plan_items:
            w = item_h if item['rot'] else item_w
            h = item_w if item['rot'] else item_h
            x = item['x']
            y = item['y']
            
            lines.append({'x1': x, 'y1': y, 'x2': x + w, 'y2': y, 'type': 'H'})
            lines.append({'x1': x, 'y1': y + h, 'x2': x + w, 'y2': y + h, 'type': 'H'})
            lines.append({'x1': x, 'y1': y, 'x2': x, 'y2': y + h, 'type': 'V'})
            lines.append({'x1': x + w, 'y1': y, 'x2': x + w, 'y2': y + h, 'type': 'V'})
        
        # Merge lines (simplified logic for brevity, assume same merging logic as before)
        merged_lines = []
        h_groups = {}
        for l in lines:
            if l['type'] == 'H':
                key = f"{l['y1']:.4f}"
                if key not in h_groups: h_groups[key] = []
                h_groups[key].append(l)
        
        for group in h_groups.values():
            group.sort(key=lambda a: a['x1'])
            curr = group[0].copy()
            for i in range(1, len(group)):
                next_l = group[i]
                if next_l['x1'] <= curr['x2'] + 0.1:
                    curr['x2'] = max(curr['x2'], next_l['x2'])
                else:
                    merged_lines.append(curr)
                    curr = next_l.copy()
            merged_lines.append(curr)
            
        v_groups = {}
        for l in lines:
            if l['type'] == 'V':
                key = f"{l['x1']:.4f}"
                if key not in v_groups: v_groups[key] = []
                v_groups[key].append(l)
                
        for group in v_groups.values():
            group.sort(key=lambda a: a['y1'])
            curr = group[0].copy()
            for i in range(1, len(group)):
                next_l = group[i]
                if next_l['y1'] <= curr['y2'] + 0.1:
                    curr['y2'] = max(curr['y2'], next_l['y2'])
                else:
                    merged_lines.append(curr)
                    curr = next_l.copy()
            merged_lines.append(curr)
            
        if plan_items:
            bounds = {
                'minX': min(it['x'] for it in plan_items),
                'maxX': max(it['x'] + (item_h if it['rot'] else item_w) for it in plan_items),
                'minY': min(it['y'] for it in plan_items),
                'maxY': max(it['y'] + (item_w if it['rot'] else item_h) for it in plan_items)
            }
            BLEED = 2.0
            for l in merged_lines:
                if l['type'] == 'H':
                    if l['x1'] <= bounds['minX'] + 0.1: l['x1'] -= BLEED
                    if l['x2'] >= bounds['maxX'] - 0.1: l['x2'] += BLEED
                else:
                    if l['y1'] <= bounds['minY'] + 0.1: l['y1'] -= BLEED
                    if l['y2'] >= bounds['maxY'] - 0.1: l['y2'] += BLEED
                content += f'<line x1="{l["x1"]}" y1="{l["y1"]}" x2="{l["x2"]}" y2="{l["y2"]}" class="cut-line" />'
    
            # Handle rotation for Trapezoid/Triangle if needed
            # get_shape_path returns "Normal" shape.
            # If item['rot'], we need to rotate/flip points?
            # JS logic:
            #   Trapezoid: if rot -> Flipped (narrow bottom). Normal -> narrow top.
            #   Triangle: if rot -> Point Down. Normal -> Point Up.
            #   Hexagon: Symmetric (Pointy Top).
            
            if shape == 'trapezoid':
                # Re-calculate for Trapezoid specific logic
                top_ratio = 0.7
                narrow_w = item_w * top_ratio
                offset = (item_w - narrow_w) / 2
                if item['rot']:
                    # Flipped
                    pts = [
                        (x, y), (x + item_w, y), 
                        (x + offset + narrow_w, y + item_h), (x + offset, y + item_h)
                    ]
                else:
                    # Normal
                    pts = [
                        (x + offset, y), (x + offset + narrow_w, y), 
                        (x + item_w, y + item_h), (x, y + item_h)
                    ]
            elif shape == 'triangle':
                # Re-calculate for Triangle
                if item['rot']:
                    # Point Down
                    pts = [
                        (x, y), (x + item_w, y), (x + item_w/2, y + item_h)
                    ]
                else:
                    # Point Up
                    pts = [
                        (x + item_w/2, y), (x + item_w, y + item_h), (x, y + item_h)
                    ]
            # Hexagon is already correct in get_shape_path (Pointy Top)
            
            # Add to poly_lines
            for i in range(len(pts)):
                p1 = pts[i]
                p2 = pts[(i + 1) % len(pts)]
                poly_lines.append({'x1': p1[0], 'y1': p1[1], 'x2': p2[0], 'y2': p2[1]})
        
        # Deduplicate lines
        unique_lines = []
        EPSILON = 0.1
        
        for l in poly_lines:
            # Normalize
            p1 = (l['x1'], l['y1'])
            p2 = (l['x2'], l['y2'])
            
            # Sort points
            if p1[0] > p2[0] or (abs(p1[0] - p2[0]) < EPSILON and p1[1] > p2[1]):
                p1, p2 = p2, p1
            
            # Check duplicate
            is_dup = False
            for u in unique_lines:
                # u is already normalized (p1, p2) tuple
                if (abs(p1[0] - u[0][0]) < EPSILON and abs(p1[1] - u[0][1]) < EPSILON and
                    abs(p2[0] - u[1][0]) < EPSILON and abs(p2[1] - u[1][1]) < EPSILON):
                    is_dup = True
                    break
            
            if not is_dup:
                unique_lines.append((p1, p2))
        
        # Generate content
        for p1, p2 in unique_lines:
            content += f'<line x1="{p1[0]:.3f}" y1="{p1[1]:.3f}" x2="{p2[0]:.3f}" y2="{p2[1]:.3f}" class="cut-line" />'

    svg = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="{page_w}mm" height="{page_h}mm" viewBox="0 0 {page_w} {page_h}" version="1.1" xmlns="http://www.w3.org/2000/svg">
<style>.cut-line {{ fill: none; stroke: #000000; stroke-width: 0.1; vector-effect: non-scaling-stroke; }}</style>
{content}
</svg>'''
    
    return svg


def generate_pdf_multipage(
    input_paths: List[str],
    pages_meta: List[Dict],
    plan_items: List[Dict],
    page_w: float,
    page_h: float,
    item_w: float,
    item_h: float,
    dpi: int = 300,
    fit_mode: str = 'fill',
    color_mode: str = 'original',
    use_crop: bool = False,
    crop_len: float = 10,
    crop_dist: float = 10,
    crop_thick: float = 0.5,
    crop_color: str = '#000000',
    auto_rotate: bool = False,
    info_text: str = '',
    process_mode: str = 'raster',
    shape: str = 'rect',
    custom_scale: float = 100.0,
    background_color: str = '#ffffff',
    # Advanced parameters
    use_page_crop: bool = False,
    page_crop_len: float = 10,
    page_crop_dist: float = 10,
    page_crop_thick: float = 0.5,
    page_crop_color: str = '#000000',
    is_2sided: bool = False,
    rot_180_front: bool = False,
    rot_180_back: bool = False,
    data_mode: int = 1,
    x_up_qty: int = 1,
    standard_qty: int = 1,
    total_sheets: int = 1,
    target_sheet_index: int = None
) -> bytes:
    """
    Generate multi-page PDF from multiple source images with layout.
    Each output sheet can have different source images based on data_mode.
    
    Returns:
        PDF content as bytes
    """
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    
    # Create PDF in memory
    pdf_buffer = BytesIO()
    c = canvas.Canvas(pdf_buffer, pagesize=(page_w * mm, page_h * mm))
    
    # Load all source images - preserve original color profile
    source_images = []
    source_modes = []  # Track original color mode for each image
    
    print(f"[DEBUG] Loading {len(input_paths)} images, pages_meta length: {len(pages_meta)}")
    
    for i, path in enumerate(input_paths):
        print(f"[DEBUG] Processing image {i}: {path}")
        ext = os.path.splitext(path)[1].lower()
        original_mode = None
        
        if ext == '.pdf':
            src_doc = open_and_sanitize_pdf(path)
            # For PDF, try to preserve colorspace
            page = src_doc[0]
            # Check if PDF has CMYK content by trying to get CMYK pixmap
            try:
                pix = page.get_pixmap(dpi=dpi, alpha=False, colorspace=fitz.csRGB)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                original_mode = 'RGB'
            except:
                pix = page.get_pixmap(dpi=dpi, alpha=False)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                original_mode = 'RGB'
            src_doc.close()
        else:
            img = Image.open(path)
            img = ImageOps.exif_transpose(img)
            original_mode = img.mode
            
            # Handle alpha channel
            if img.mode == 'RGBA':
                bg = Image.new('RGB', img.size, (255, 255, 255))
                bg.paste(img, mask=img.split()[3])
                img = bg
                original_mode = 'RGB'
            elif img.mode == 'CMYK':
                # Keep CMYK as-is when color_mode is 'original'
                pass
            elif img.mode not in ('RGB', 'CMYK'):
                img = img.convert('RGB')
                original_mode = 'RGB'
        
        # Apply color mode conversion based on user preference
        if color_mode == 'konica':
            # Convert using Konica ICC profile
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img = convert_konica_color(img)
            original_mode = 'CMYK'
        elif color_mode == 'cmyk' and img.mode != 'CMYK':
            # Force convert to CMYK
            img = img.convert('CMYK')
            original_mode = 'CMYK'
        elif color_mode == 'rgb' and img.mode != 'RGB':
            # Force convert to RGB
            if img.mode == 'CMYK':
                img = img.convert('RGB')
            original_mode = 'RGB'
        # color_mode == 'original': keep as-is
        
        has_total_rotation = any(item.get('totalRotation') is not None for item in plan_items)
        
        # Apply rotation from metadata only for legacy mode (when totalRotation is not in plan_items)
        if not has_total_rotation:
            if i < len(pages_meta) and pages_meta[i].get('rotation', 0) != 0:
                rotation_deg = pages_meta[i]['rotation']
                print(f"[DEBUG] Page {i}: Applying legacy rotation {rotation_deg}°")
                img = img.rotate(-rotation_deg, expand=True)  # CSS -> PIL: đảo dấu
            elif auto_rotate:
                src_ratio = img.width / img.height
                eff_h = item_w if shape == 'circle' else item_h
                dst_ratio = item_w / eff_h
                if (src_ratio > 1 and dst_ratio < 1) or (src_ratio < 1 and dst_ratio > 1):
                    print(f"[DEBUG] Page {i}: Auto-rotating 90° based on aspect ratio")
                    img = img.rotate(-90, expand=True)
                else:
                    print(f"[DEBUG] Page {i}: No rotation (meta={pages_meta[i] if i < len(pages_meta) else 'missing'})")
            else:
                print(f"[DEBUG] Page {i}: No rotation (meta={pages_meta[i] if i < len(pages_meta) else 'missing'})")
        
        source_images.append(img)
        source_modes.append(original_mode if original_mode else img.mode)
    
    if not source_images:
        raise ValueError("No valid source images")
    
    # Prepare processed images for each source
    processed_images = []
    # For circle shape, use itemW for both dimensions
    effective_item_h = item_w if shape == 'circle' else item_h
    target_w_px = mm_to_px(item_w, dpi)
    target_h_px = mm_to_px(effective_item_h, dpi)
    
    for idx, img in enumerate(source_images):
        img_mode = source_modes[idx] if idx < len(source_modes) else img.mode

        # No auto-rotate - frontend already calculated final rotation
        # Just apply fit mode
        processed = process_image_fit_mode(img, target_w_px, target_h_px, fit_mode, False, custom_scale, background_color)
        
        # Convert to ImageReader - use TIFF for CMYK, PNG for RGB
        img_buffer = BytesIO()
        if processed.mode == 'CMYK':
            # TIFF supports CMYK natively
            processed.save(img_buffer, format='TIFF', compression='none')
        else:
            # PNG for RGB images
            if processed.mode != 'RGB':
                processed = processed.convert('RGB')
            processed.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        processed_images.append(ImageReader(img_buffer))
    
    raw_img_readers = []
    if has_total_rotation:
        for idx, img in enumerate(source_images):
            raw_buf = BytesIO()
            if img.mode == 'CMYK':
                img.save(raw_buf, format='TIFF', compression='none')
            else:
                save_img = img if img.mode == 'RGB' else img.convert('RGB')
                save_img.save(raw_buf, format='PNG')
            raw_buf.seek(0)
            raw_img_readers.append(ImageReader(raw_buf))
    
    # Helper function to get page index for a slot based on data_mode
    def get_page_for_slot(sheet_index: int, slot_index: int) -> int:
        items_per_sheet = len(plan_items)
        num_pages = len(source_images)
        
        if num_pages == 0:
            return -1
        
        if data_mode == 1:
            # Standard (AABBCC): repeat each page standardQty times
            global_index = sheet_index * items_per_sheet + slot_index
            page_index = (global_index // standard_qty) % num_pages
            return page_index
        elif data_mode == 4:
            # X-Up: same page fills entire sheet
            page_index = (sheet_index // x_up_qty) % num_pages
            return page_index
        elif data_mode == 5 or data_mode == 6:
            # 2-Sided Same / Symmetric: sequential pages
            global_index = sheet_index * items_per_sheet + slot_index
            return global_index % num_pages
        else:
            # Default: sequential
            global_index = sheet_index * items_per_sheet + slot_index
            return global_index % num_pages
    
    # Determine if shape needs 180° flip
    is_flip_shape = shape in ('triangle', 'trapezoid', 'hexagon')
    
    # Helper function to get clipping path points
    def get_clip_points(shape_type: str, x: float, y: float, w: float, h: float, rotated: bool = False):
        cx = x + w / 2
        cy = y + h / 2
        
        if shape_type in ('rect', 'rectangle'):
            return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        elif shape_type in ('circle', 'oval'):
            return None
        elif shape_type == 'hexagon':
            rx = w / 2
            ry = h / 2
            points = [
                (cx, y + h), (cx + rx, y + h - ry/2), (cx + rx, y + ry/2),
                (cx, y), (cx - rx, y + ry/2), (cx - rx, y + h - ry/2)
            ]
            if rotated:
                points = [(2*cx - px, 2*cy - py) for px, py in points]
            return points
        elif shape_type == 'triangle':
            if rotated:
                return [(x, y + h), (x + w, y + h), (cx, y)]
            else:
                return [(cx, y + h), (x + w, y), (x, y)]
        elif shape_type == 'trapezoid':
            top_ratio = 0.7
            narrow_w = w * top_ratio
            offset = (w - narrow_w) / 2
            if rotated:
                return [(x, y + h), (x + w, y + h), (x + offset + narrow_w, y), (x + offset, y)]
            else:
                return [(x + offset, y + h), (x + offset + narrow_w, y + h), (x + w, y), (x, y)]
        return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
    
    # Parse colors
    try:
        cr = int(crop_color[1:3], 16) / 255
        cg = int(crop_color[3:5], 16) / 255
        cb = int(crop_color[5:7], 16) / 255
    except:
        cr, cg, cb = 0, 0, 0
    
    try:
        pr = int(page_crop_color[1:3], 16) / 255
        pg = int(page_crop_color[3:5], 16) / 255
        pb = int(page_crop_color[5:7], 16) / 255
    except:
        pr, pg, pb = 0, 0, 0
    
    # Generate each output sheet
    sheets_to_process = [target_sheet_index] if target_sheet_index is not None else range(total_sheets)
    for sheet_idx in sheets_to_process:
        # Draw each item on this sheet
        for slot_idx, item in enumerate(plan_items):
            # Check sheetIndex: if item belongs to another sheet, skip it
            if item.get('sheetIndex') is not None and item.get('sheetIndex') != sheet_idx:
                continue

            page_idx = get_page_for_slot(sheet_idx, slot_idx)
            if page_idx < 0 or page_idx >= len(processed_images):
                continue
            
            img_reader = processed_images[page_idx]
            
            # Calculate dimensions
            eff_item_h = item_w if shape == 'circle' else item_h
            if is_flip_shape:
                w_mm = item_w
                h_mm = eff_item_h
                is_rotated = item.get('rot', False)
            elif shape == 'circle':
                w_mm = item_w
                h_mm = item_w
                is_rotated = False
            else:
                if item.get('rot'):
                    w_mm = eff_item_h
                    h_mm = item_w
                else:
                    w_mm = item_w
                    h_mm = eff_item_h
                is_rotated = item.get('rot', False)
            
            if 'w' in item and item['w'] is not None:
                w_mm = float(item['w'])
            if 'h' in item and item['h'] is not None:
                h_mm = float(item['h'])
            if shape == 'circle':
                h_mm = w_mm
            
            w_pt = w_mm * mm
            h_pt = h_mm * mm
            x_pt = item['x'] * mm
            y_pt = page_h * mm - item['y'] * mm - h_pt
            
            c.saveState()
            
            # Create clipping path
            path = c.beginPath()
            if shape in ('circle', 'oval'):
                path.ellipse(x_pt, y_pt, x_pt + w_pt, y_pt + h_pt)
            else:
                points = get_clip_points(shape, x_pt, y_pt, w_pt, h_pt, is_rotated if is_flip_shape else False)
                if points:
                    path.moveTo(points[0][0], points[0][1])
                    for px, py in points[1:]:
                        path.lineTo(px, py)
                    path.close()
                else:
                    path.rect(x_pt, y_pt, w_pt, h_pt)
            
            c.clipPath(path, stroke=0, fill=0)
            
            # Draw image
            if has_total_rotation and page_idx < len(raw_img_readers) and raw_img_readers[page_idx] is not None:
                raw_reader = raw_img_readers[page_idx]
                src_raw = source_images[page_idx]
                tot_rot = float(item.get('totalRotation', 0)) % 360
                is_odd_90 = (tot_rot % 180) != 0
                
                elem_w_pt = h_pt if is_odd_90 else w_pt
                elem_h_pt = w_pt if is_odd_90 else h_pt
                
                scale_factor = (custom_scale / 100.0) if custom_scale != 100 else 1.0
                img_w = src_raw.width
                img_h = src_raw.height
                
                if fit_mode == 'stretch':
                    dw = elem_w_pt * scale_factor
                    dh = elem_h_pt * scale_factor
                elif fit_mode == 'fit':
                    s = min(elem_w_pt / img_w, elem_h_pt / img_h) * scale_factor
                    dw = img_w * s
                    dh = img_h * s
                elif fit_mode == 'actual':
                    s = (72.0 / dpi) * scale_factor
                    dw = img_w * s
                    dh = img_h * s
                else:  # 'fill' (cover)
                    s = max(elem_w_pt / img_w, elem_h_pt / img_h) * scale_factor
                    dw = img_w * s
                    dh = img_h * s
                    
                c.saveState()
                cx = x_pt + w_pt / 2
                cy = y_pt + h_pt / 2
                c.translate(cx, cy)
                if tot_rot != 0:
                    c.rotate(-tot_rot)
                    
                if background_color and background_color.lower() not in ('#ffffff', 'white', '') and fit_mode in ('fit', 'actual'):
                    try:
                        hex_c = background_color.lstrip('#')
                        r = int(hex_c[0:2], 16) / 255.0
                        g = int(hex_c[2:4], 16) / 255.0
                        b = int(hex_c[4:6], 16) / 255.0
                        c.setFillColorRGB(r, g, b)
                        c.rect(-elem_w_pt/2, -elem_h_pt/2, elem_w_pt, elem_h_pt, fill=1, stroke=0)
                    except:
                        pass
                        
                c.drawImage(raw_reader, -dw/2, -dh/2, width=dw, height=dh, mask='auto')
                c.restoreState()
            elif is_flip_shape and item.get('rot'):
                # Special shapes: 180° flip
                c.saveState()
                cx = x_pt + w_pt / 2
                cy = y_pt + h_pt / 2
                c.translate(cx, cy)
                c.rotate(180)
                c.drawImage(img_reader, -w_pt/2, -h_pt/2, width=w_pt, height=h_pt, mask='auto')
                c.restoreState()
            elif item.get('rot') and not is_flip_shape:
                # Rect/oval/circle with layout rotation
                c.saveState()
                cx = x_pt + w_pt / 2
                cy = y_pt + h_pt / 2
                c.translate(cx, cy)
                c.rotate(-90)
                orig_w_pt = item_w * mm
                orig_h_pt = item_h * mm
                c.drawImage(img_reader, -orig_w_pt/2, -orig_h_pt/2, width=orig_w_pt, height=orig_h_pt, mask='auto')
                c.restoreState()
            else:
                c.drawImage(img_reader, x_pt, y_pt, width=w_pt, height=h_pt, mask='auto')
            
            c.restoreState()
        
        # Draw crop marks for each item
        if use_crop:
            len_pt = crop_len * mm
            dist_pt = crop_dist * mm
            c.setStrokeColorRGB(cr, cg, cb)
            c.setLineWidth(crop_thick * mm)
            
            for item in plan_items:
                if item.get('sheetIndex') is not None and item.get('sheetIndex') != sheet_idx:
                    continue

                eff_item_h = item_w if shape == 'circle' else item_h
                if is_flip_shape:
                    w_mm = item_w
                    h_mm = eff_item_h
                elif shape == 'circle':
                    w_mm = item_w
                    h_mm = item_w
                else:
                    w_mm = eff_item_h if item.get('rot') else item_w
                    h_mm = item_w if item.get('rot') else eff_item_h
                if 'w' in item and item['w'] is not None:
                    w_mm = float(item['w'])
                if 'h' in item and item['h'] is not None:
                    h_mm = float(item['h'])
                if shape == 'circle':
                    h_mm = w_mm
                
                ix_pt = item['x'] * mm
                iy_pt = page_h * mm - item['y'] * mm - h_mm * mm
                iw_pt = w_mm * mm
                ih_pt = h_mm * mm
                
                # Crop marks at 4 corners
                c.line(ix_pt - dist_pt - len_pt, iy_pt + ih_pt, ix_pt - dist_pt, iy_pt + ih_pt)
                c.line(ix_pt, iy_pt + ih_pt + dist_pt, ix_pt, iy_pt + ih_pt + dist_pt + len_pt)
                c.line(ix_pt + iw_pt + dist_pt, iy_pt + ih_pt, ix_pt + iw_pt + dist_pt + len_pt, iy_pt + ih_pt)
                c.line(ix_pt + iw_pt, iy_pt + ih_pt + dist_pt, ix_pt + iw_pt, iy_pt + ih_pt + dist_pt + len_pt)
                c.line(ix_pt - dist_pt - len_pt, iy_pt, ix_pt - dist_pt, iy_pt)
                c.line(ix_pt, iy_pt - dist_pt - len_pt, ix_pt, iy_pt - dist_pt)
                c.line(ix_pt + iw_pt + dist_pt, iy_pt, ix_pt + iw_pt + dist_pt + len_pt, iy_pt)
                c.line(ix_pt + iw_pt, iy_pt - dist_pt - len_pt, ix_pt + iw_pt, iy_pt - dist_pt)
        
        # Draw page crop marks
        if use_page_crop:
            page_w_pt = page_w * mm
            page_h_pt = page_h * mm
            pcl_pt = page_crop_len * mm
            pcd_pt = page_crop_dist * mm
            c.setStrokeColorRGB(pr, pg, pb)
            c.setLineWidth(page_crop_thick * mm)
            
            c.line(pcd_pt, page_h_pt - pcd_pt, pcd_pt + pcl_pt, page_h_pt - pcd_pt)
            c.line(pcd_pt, page_h_pt - pcd_pt, pcd_pt, page_h_pt - pcd_pt - pcl_pt)
            c.line(page_w_pt - pcd_pt - pcl_pt, page_h_pt - pcd_pt, page_w_pt - pcd_pt, page_h_pt - pcd_pt)
            c.line(page_w_pt - pcd_pt, page_h_pt - pcd_pt, page_w_pt - pcd_pt, page_h_pt - pcd_pt - pcl_pt)
            c.line(pcd_pt, pcd_pt, pcd_pt + pcl_pt, pcd_pt)
            c.line(pcd_pt, pcd_pt, pcd_pt, pcd_pt + pcl_pt)
            c.line(page_w_pt - pcd_pt - pcl_pt, pcd_pt, page_w_pt - pcd_pt, pcd_pt)
            c.line(page_w_pt - pcd_pt, pcd_pt, page_w_pt - pcd_pt, pcd_pt + pcl_pt)
        
        # Draw info text on first page
        if sheet_idx == 0 and info_text:
            font_name = register_unicode_font()
            c.setFont(font_name, 7)
            c.setFillColorRGB(0, 0, 0)
            text_w = c.stringWidth(info_text, font_name, 7)
            tx = (page_w * mm - text_w) / 2
            ty = page_h * mm - 3 * mm
            c.drawString(tx, ty, info_text)
        
        c.showPage()
        
        # Generate back page for 2-sided printing
        if is_2sided:
            page_w_pt = page_w * mm
            page_h_pt = page_h * mm
            
            if rot_180_back:
                c.saveState()
                c.translate(page_w_pt, page_h_pt)
                c.rotate(180)
            
            for slot_idx, item in enumerate(plan_items):
                page_idx = get_page_for_slot(sheet_idx, slot_idx)
                if page_idx < 0 or page_idx >= len(processed_images):
                    continue
                
                img_reader = processed_images[page_idx]
                
                if is_flip_shape:
                    w_mm = item_w
                    h_mm = item_h
                    is_rotated = item['rot']
                else:
                    w_mm = item_h if item['rot'] else item_w
                    h_mm = item_w if item['rot'] else item_h
                    is_rotated = item['rot']
                
                w_pt = w_mm * mm
                h_pt = h_mm * mm
                x_pt = page_w_pt - item['x'] * mm - w_pt  # Mirror X
                y_pt = page_h_pt - item['y'] * mm - h_pt
                
                c.saveState()
                
                path = c.beginPath()
                if shape in ('circle', 'oval'):
                    path.ellipse(x_pt, y_pt, x_pt + w_pt, y_pt + h_pt)
                else:
                    points = get_clip_points(shape, x_pt, y_pt, w_pt, h_pt, is_rotated if is_flip_shape else False)
                    if points:
                        path.moveTo(points[0][0], points[0][1])
                        for px, py in points[1:]:
                            path.lineTo(px, py)
                        path.close()
                
                c.clipPath(path, stroke=0, fill=0)
                
                # Draw image - same logic as front side
                if is_flip_shape and item['rot']:
                    # Special shapes: 180° flip
                    c.saveState()
                    cx = x_pt + w_pt / 2
                    cy = y_pt + h_pt / 2
                    c.translate(cx, cy)
                    c.rotate(180)
                    c.drawImage(img_reader, -w_pt/2, -h_pt/2, width=w_pt, height=h_pt, mask='auto')
                    c.restoreState()
                elif item['rot'] and not is_flip_shape:
                    # Rect/oval/circle with layout rotation
                    c.saveState()
                    cx = x_pt + w_pt / 2
                    cy = y_pt + h_pt / 2
                    c.translate(cx, cy)
                    c.rotate(-90)
                    orig_w_pt = item_w * mm
                    orig_h_pt = item_h * mm
                    c.drawImage(img_reader, -orig_w_pt/2, -orig_h_pt/2, width=orig_w_pt, height=orig_h_pt, mask='auto')
                    c.restoreState()
                else:
                    c.drawImage(img_reader, x_pt, y_pt, width=w_pt, height=h_pt, mask='auto')
                
                c.restoreState()
            
            if rot_180_back:
                c.restoreState()
            
            c.showPage()
    
    c.save()
    pdf_buffer.seek(0)
    return pdf_buffer.read()
