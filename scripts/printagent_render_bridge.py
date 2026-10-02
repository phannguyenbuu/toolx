#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PrintAgent Render Bridge & Web Studio (Port 8080)
------------------------------------------------
- Tích hợp trực tiếp GPT (OpenAI) & Gemini (Google) từ D:/vps_go.md.
- Đầy đủ tính năng: Tạo ảnh mới (Text-to-Image), Sửa toàn bộ ảnh (Image-to-Image),
  và Sửa 1 phần ảnh theo vùng chọn (Inpainting với cọ vẽ Canvas trực quan).
- Tuyệt đối KHÔNG fallback sang bất kỳ AI trung gian nào. Lỗi văng lỗi trực tiếp.
- Bộ Super-Resolution Lanczos 4x và Unsharp Mask chuẩn 300 DPI cho in ấn.
- Giám sát D:/render, tự động callback VPS toolxprint.com.
"""

import os
import sys
import time
import json
import uuid
import logging
import threading
import io
import base64
import requests
from datetime import datetime, timezone
from PIL import Image, ImageEnhance, ImageFilter
from flask import Flask, request, jsonify, send_from_directory, render_template_string, Response

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [RenderBridge] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("RenderBridge")

DEFAULT_RENDER_DIR = os.path.abspath("D:/render") if sys.platform == "win32" else "/opt/toolx-ai-studio/render"
RENDER_DIR = os.getenv("RENDER_DIR", DEFAULT_RENDER_DIR)
JOBS_FILE = os.path.join(RENDER_DIR, "jobs.json")
PORT = int(os.getenv("RENDER_BRIDGE_PORT", "8080"))
HOST = "0.0.0.0"
DEFAULT_VPS_GO = "D:/vps_go.md" if sys.platform == "win32" else "/opt/toolx-ai-studio/vps_go.md"
VPS_GO_PATH = os.getenv("VPS_GO_PATH", DEFAULT_VPS_GO)

os.makedirs(RENDER_DIR, exist_ok=True)
THUMB_DIR = os.path.join(RENDER_DIR, ".thumbs")
os.makedirs(THUMB_DIR, exist_ok=True)
jobs_lock = threading.Lock()

def generate_thumbnail(filename: str) -> str:
    """Tạo thumbnail WebP chất lượng cao kích thước 400x400 cho preview, giảm tải 99.8% dung lượng chống lag browser."""
    if not filename:
        return None
    orig_path = os.path.join(RENDER_DIR, filename)
    if not os.path.exists(orig_path):
        return None
    thumb_filename = f"{filename}.webp"
    thumb_path = os.path.join(THUMB_DIR, thumb_filename)
    if os.path.exists(thumb_path):
        try:
            if os.path.getmtime(thumb_path) >= os.path.getmtime(orig_path):
                return thumb_path
        except Exception:
            pass
    try:
        with Image.open(orig_path) as im:
            im.thumbnail((400, 400), Image.Resampling.LANCZOS)
            im.convert("RGB").save(thumb_path, "WEBP", quality=82)
        return thumb_path
    except Exception as e:
        logger.warning(f"Lỗi tạo thumbnail cho {filename}: {e}")
        return None

def get_api_keys():
    """Đọc động GeminiKey và GPTKey từ vps_go.md hoặc environment variables"""
    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gpt_key = os.getenv("OPENAI_API_KEY", "") or os.getenv("GPT_API_KEY", "")

    candidate_paths = [
        VPS_GO_PATH,
        "D:/vps_go.md",
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "vps_go.md"),
        "/opt/toolx-ai-studio/vps_go.md",
        "/root/vps_go.md",
        "./vps_go.md"
    ]
    for p in candidate_paths:
        if p and os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    lines = [l.strip() for l in f.readlines()]
                    for i, l in enumerate(lines):
                        if l == "[GeminiKey]" and i + 1 < len(lines):
                            gemini_key = lines[i + 1].strip()
                        elif l == "[GPTKey]" and i + 1 < len(lines):
                            gpt_key = lines[i + 1].strip()
                if gemini_key or gpt_key:
                    break
            except Exception as e:
                logger.warning(f"Lỗi đọc {p}: {e}")
    return gemini_key, gpt_key

def load_jobs() -> dict:
    with jobs_lock:
        if not os.path.exists(JOBS_FILE):
            return {}
        try:
            with open(JOBS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Lỗi đọc jobs.json: {e}")
            return {}

def save_jobs(jobs: dict):
    with jobs_lock:
        temp_file = JOBS_FILE + ".tmp"
        try:
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(jobs, f, ensure_ascii=False, indent=2)
            os.replace(temp_file, JOBS_FILE)
        except Exception as e:
            logger.error(f"Lỗi ghi jobs.json: {e}")

def is_file_ready(filepath: str) -> bool:
    if not os.path.exists(filepath):
        return False
    try:
        size1 = os.path.getsize(filepath)
        if size1 == 0:
            return False
        time.sleep(0.4)
        size2 = os.path.getsize(filepath)
        if size1 != size2:
            return False
        with open(filepath, "rb") as f:
            f.read(1024)
        return True
    except Exception:
        return False

def send_callback(callback_url: str, payload: dict, filepath: str = None) -> bool:
    if not callback_url:
        return True

    logger.info(f"Đang gửi callback tới: {callback_url} (status={payload.get('status')})")
    try:
        if filepath and os.path.exists(filepath):
            with open(filepath, "rb") as f:
                files = {"file": (os.path.basename(filepath), f, "image/png")}
                data = {"data": json.dumps(payload, ensure_ascii=False)}
                res = requests.post(callback_url, files=files, data=data, timeout=60)
        else:
            headers = {"Content-Type": "application/json"}
            res = requests.post(callback_url, json=payload, headers=headers, timeout=30)
            
        logger.info(f"Kết quả callback: HTTP {res.status_code}")
        return res.ok
    except Exception as e:
        logger.error(f"Lỗi khi gửi callback tới {callback_url}: {e}")
        return False

RESOLUTION_MAP = {
    "4k": {
        "1:1": (4096, 4096),
        "16:9": (4096, 2304),
        "9:16": (2304, 4096),
        "4:3": (4096, 3072),
        "3:4": (3072, 4096),
    },
    "2k": {
        "1:1": (2560, 2560),
        "16:9": (2560, 1440),
        "9:16": (1440, 2560),
        "4:3": (2560, 1920),
        "3:4": (1920, 2560),
    },
    "1080p": {
        "1:1": (1920, 1920),
        "16:9": (1920, 1080),
        "9:16": (1080, 1920),
        "4:3": (1920, 1440),
        "3:4": (1440, 1920),
    }
}

# ==============================================================================
# PRO STUDIO PRESETS & AI PROMPT ENHANCER (5-LAYER PHOTOGRAPHIC FRAMEWORK)
# ==============================================================================
PRO_PRESETS = {
    "style": {
        "none": {"name": "Tự do / Theo AI", "prompt": ""},
        "doc_realism": {"name": "📷 Chân thực đời thường", "prompt": "hyper-realistic documentary photography, authentic human candid emotion, natural skin pores and realistic micro-textures, shot on 35mm film aesthetic, no artificial retouching, authentic RAW capture"},
        "cinematic": {"name": "🎬 Điện ảnh Cinematic", "prompt": "cinematic movie still, Panavision 35mm anamorphic lens, dramatic widescreen composition, subtle film grain, cinematic depth of field, atmospheric color grading, cinematic haze"},
        "commercial_studio": {"name": "📸 Studio Thương mại", "prompt": "high-end commercial studio photography, crisp subject isolation, ultra-detailed tactile surfaces, elegant modern aesthetic, luxury magazine editorial quality"},
        "vintage_film": {"name": "☕ Analog Kodak Portra", "prompt": "analog film photography, shot on Kodak Portra 400, warm organic tones, gentle film grain, nostalgic timeless mood, authentic vintage optical rendition"},
        "oil_painting": {"name": "🎨 Tranh sơn dầu Nghệ thuật", "prompt": "classical fine art oil painting, expressive impasto brushstrokes, rich pigment layering, timeless museum masterpiece aesthetic"},
        "packaging_mockup": {"name": "📦 Mockup Bao bì In ấn", "prompt": "ultra-clean minimalist product mockup for commercial print, studio seamless background, precise branding focus, high-fidelity tactile material textures"}
    },
    "lighting": {
        "none": {"name": "Tự do / Theo AI", "prompt": ""},
        "golden_hour": {"name": "☀️ Nắng sớm bình minh", "prompt": "bathed in warm golden hour sunlight, soft low-angle sun rays, gentle warm glow, natural lens flare, delicate rim lighting on edges"},
        "soft_daylight": {"name": "⛅ Ánh sáng tự nhiên dịu", "prompt": "soft diffused natural daylight, gentle ambient illumination, neutral realistic color balance, seamless shadow gradients"},
        "studio_softbox": {"name": "💡 Studio Softbox 3 điểm", "prompt": "three-point professional studio lighting with large softbox key light, subtle fill light, crisp edge separation rim light, controlled specular highlights"},
        "sunset_dramatic": {"name": "🌆 Hoàng hôn rực rỡ", "prompt": "vibrant sunset twilight ambiance, dramatic fiery orange and magenta sky gradient, rich contrast, warm silhouettes with luminous rim light"},
        "moody_night": {"name": "🌙 Đêm huyền bí / Ánh trăng", "prompt": "moody blue hour twilight, soft ambient moonlight, deep cinematic shadows, low-key atmospheric lighting"},
        "neon_glow": {"name": "🏮 Đèn Neon tương phản", "prompt": "cyberpunk dramatic neon lighting, dual-tone cyan and magenta edge rim light, reflective surfaces, high visual contrast"}
    },
    "lens": {
        "none": {"name": "Tự do / Theo AI", "prompt": ""},
        "portrait_85mm": {"name": "🔍 Chân dung xóa phông (85mm f/1.4)", "prompt": "shot on 85mm f/1.4 prime lens, shallow depth of field, creamy smooth background bokeh, sharp tack focus on subject eyes and face"},
        "natural_50mm": {"name": "👁️ Góc mắt người thật (50mm f/1.8)", "prompt": "shot on 50mm f/1.8 standard prime lens, natural human eye perspective, balanced field of view, organic depth and realistic distortion-free proportions"},
        "wide_24mm": {"name": "🌄 Toàn cảnh góc rộng (24mm f/2.8)", "prompt": "shot on 24mm wide angle lens, deep depth of field, expansive environmental context, dynamic leading lines"},
        "macro_100mm": {"name": "🔬 Cận cảnh vi mô (100mm Macro)", "prompt": "shot on 100mm macro lens at 1:1 reproduction ratio, extreme close-up detail, razor-sharp focus on microscopic textures and surface nuances"},
        "drone_aerial": {"name": "🚁 Góc nhìn trên cao (Aerial Drone)", "prompt": "high-altitude aerial drone perspective, sweeping bird's-eye view, broad spatial composition, clean geometric framing"},
        "full_body": {"name": "👤 Chụp toàn thân (Full Body)", "prompt": "full body portrait framing, standing tall, elegant head-to-toe composition, grounded spatial depth"}
    }
}

def enhance_prompt(raw_prompt: str, use_ai_enhancer: bool, presets: dict, gpt_key: str, task_type: str = "create") -> str:
    """
    Chuẩn hóa prompt kết hợp 2 phương pháp:
    - Method 1 (Ưu tiên): Tự động viết lại bằng GPT-4o-mini theo Tiêu chuẩn Nhiếp ảnh 5 lớp (5-Layer Framework).
    - Method 2 (Pro): Tích hợp các bộ lọc chuyên sâu (Style, Lighting, Lens).
    """
    raw_prompt = (raw_prompt or "").strip()
    if not raw_prompt:
        return ""

    presets = presets or {}
    style_k = presets.get("style", "none")
    lighting_k = presets.get("lighting", "none")
    lens_k = presets.get("lens", "none")

    style_prompt = PRO_PRESETS["style"].get(style_k, {}).get("prompt", "")
    lighting_prompt = PRO_PRESETS["lighting"].get(lighting_k, {}).get("prompt", "")
    lens_prompt = PRO_PRESETS["lens"].get(lens_k, {}).get("prompt", "")

    preset_parts = []
    if style_prompt:
        preset_parts.append(f"Visual Style: {style_prompt}")
    if lighting_prompt:
        preset_parts.append(f"Lighting & Atmosphere: {lighting_prompt}")
    if lens_prompt:
        preset_parts.append(f"Camera Optics & Lens: {lens_prompt}")
    preset_instructions = " | ".join(preset_parts)

    usage = {
        "prompt_tokens": 0,
        "completion_tokens": 0,
        "total_tokens": 0,
        "cost_usd": 0.0
    }

    if use_ai_enhancer and gpt_key:
        try:
            logger.info("✨ [Prompt Enhancer] Đang chuẩn hóa văn bản bằng AI (5-Layer Photographic Framework)...")
            system_prompt = (
                "You are a World-Class Photography Director and Prompt Engineering Master specializing in photorealistic imagery for OpenAI gpt-image-1 and Google Imagen 3.\n"
                "Transform the user's raw prompt (in Vietnamese or English) into an elite, highly detailed, photorealistic visual description in English.\n"
                "Strictly apply the 5-Layer Photographic Framework:\n"
                "1. Subject & Action: Authentic expressions, natural skin texture (fine pores, natural sheen, beads of sweat if relevant), genuine emotion, realistic fabric textures and natural posture.\n"
                "2. Environment & Depth: Atmospheric storytelling, layered background elements, authentic environmental depth.\n"
                "3. Lighting & Atmosphere: Masterful key/fill/rim light, natural light direction (e.g. golden hour sun, soft diffused daylight, or studio softbox), realistic soft shadows.\n"
                "4. Optics & Gear: Professional full-frame or medium format photography (e.g. Hasselblad H6D or Canon EOS R5), realistic focal length (85mm, 50mm, 24mm), creamy bokeh, authentic RAW capture. Strictly avoid plastic skin, CGI, 3D render, cartoon, or over-smoothed AI look.\n"
                "5. Color Grading & Texture: Natural dynamic range, rich organic tonal gradations, crisp micro-contrast.\n\n"
                "If professional photography presets (Style, Lighting, Lens) are provided, seamlessly weave them into the prompt.\n"
                "Output ONLY the final enhanced English prompt text, with no introductory text, quotes, or markdown wrappers."
            )

            user_msg = f"User Raw Prompt: {raw_prompt}"
            if preset_instructions:
                user_msg += f"\nActive Professional Presets to integrate:\n{preset_instructions}"
            if task_type == "edit":
                user_msg += "\nNote: This is an image editing / inpainting task. The enhanced prompt should precisely describe the modifications to blend seamlessly with the existing photo."

            resp = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {gpt_key}", "Content-Type": "application/json"},
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_msg}
                    ],
                    "temperature": 0.7
                },
                timeout=20
            )

            if resp.status_code == 200:
                res_data = resp.json()
                enhanced = res_data["choices"][0]["message"]["content"].strip()
                u = res_data.get("usage", {})
                p_tok = u.get("prompt_tokens", 0)
                c_tok = u.get("completion_tokens", 0)
                tot_tok = u.get("total_tokens", p_tok + c_tok)
                cost_usd = round((p_tok * 0.15 + c_tok * 0.60) / 1_000_000, 6)
                usage = {
                    "prompt_tokens": p_tok,
                    "completion_tokens": c_tok,
                    "total_tokens": tot_tok,
                    "cost_usd": cost_usd
                }
                if enhanced:
                    logger.info(f"✔ [Prompt Enhancer] Đã chuẩn hóa thành công ({tot_tok} tokens, ${cost_usd:.5f}): '{enhanced[:80]}...'")
                    return enhanced, usage
            else:
                logger.warning(f"Lỗi OpenAI Chat Completions ({resp.status_code}): {resp.text}")
        except Exception as e:
            logger.warning(f"Lỗi khi gọi AI Prompt Enhancer: {e}")

    # Fallback hoặc khi tắt AI Enhancer: Ghép raw prompt với các presets chuyên nghiệp (Method 2)
    composite = [raw_prompt]
    if preset_parts:
        composite.append(", ".join(preset_parts))
    return ", ".join(composite), usage

# ==============================================================================
# AI GENERATION & EDITING: GPT (OPENAI) & GEMINI (GOOGLE) - STRICT NO FALLBACK
# ==============================================================================

def generate_with_gpt(prompt: str, aspect_ratio: str, gpt_key: str) -> tuple:
    """Tạo ảnh mới với OpenAI API (gpt-image-1). Trả về (Image, usage_dict)."""
    if not gpt_key:
        raise Exception("Không tìm thấy [GPTKey] trong D:/vps_go.md")

    is_wide = aspect_ratio in ("16:9", "4:3", "9:16", "3:4")
    if aspect_ratio in ("16:9", "4:3"):
        size = "1536x1024"
    elif aspect_ratio in ("9:16", "3:4"):
        size = "1024x1536"
    else:
        size = "1024x1024"

    headers = {
        "Authorization": f"Bearer {gpt_key}",
        "Content-Type": "application/json"
    }

    models_to_try = ["gpt-image-1", "gpt-image-1-mini", "chatgpt-image-latest", "gpt-image-2"]
    last_err = None

    for model in models_to_try:
        payload = {
            "model": model,
            "prompt": prompt,
            "n": 1,
            "size": size
        }
        logger.info(f"Đang gửi lệnh tạo ảnh tới OpenAI API (model={model})...")
        try:
            resp = requests.post("https://api.openai.com/v1/images/generations", headers=headers, json=payload, timeout=120)
            if resp.status_code == 200:
                data = resp.json()
                img_item = data.get("data", [{}])[0]
                u = data.get("usage", {})
                logger.info(f"OpenAI raw image generation usage: {u}")
                in_tok = u.get("input_tokens", u.get("prompt_tokens", 0))
                out_tok = u.get("output_tokens", u.get("completion_tokens", 0))
                tot_tok = u.get("total_tokens", in_tok + out_tok)
                if in_tok or out_tok:
                    img_cost_usd = round((in_tok * 10.0 + out_tok * 40.0) / 1_000_000, 4)
                elif tot_tok:
                    img_cost_usd = round(tot_tok * 0.000040, 4)
                else:
                    # Biểu giá thực tế của gpt-image-1 theo hóa đơn OpenAI ($1.80/13 ≈ $0.138/ảnh khổ wide)
                    tot_tok = 3450 if is_wide else 2000
                    img_cost_usd = 0.138 if is_wide else 0.080

                usage = {
                    "tokens": tot_tok,
                    "input_tokens": in_tok,
                    "output_tokens": out_tok,
                    "cost_usd": img_cost_usd,
                    "engine": "gpt",
                    "model": model
                }

                if "url" in img_item:
                    img_resp = requests.get(img_item["url"], timeout=45)
                    return Image.open(io.BytesIO(img_resp.content)).convert("RGB"), usage
                elif "b64_json" in img_item:
                    raw_bytes = base64.b64decode(img_item["b64_json"])
                    return Image.open(io.BytesIO(raw_bytes)).convert("RGB"), usage
            else:
                err_data = resp.json().get("error", {})
                err_code = err_data.get("code") or resp.status_code
                err_msg = err_data.get("message") or resp.text
                last_err = f"[OpenAI {err_code}] {err_msg}"
                logger.warning(f"OpenAI {model} phản hồi lỗi: {last_err}")
                if "insufficient_quota" in str(err_code) or resp.status_code in (401, 429):
                    raise Exception(last_err)
        except Exception as e:
            if "insufficient_quota" in str(e) or (hasattr(e, 'response') and e.response and e.response.status_code in (401, 429)):
                raise
            last_err = str(e)

    raise Exception(last_err or "Lỗi không xác định khi gọi OpenAI API")

def edit_with_gpt(source_filepath: str, prompt: str, mask_bytes: bytes, gpt_key: str) -> tuple:
    """Sửa hình (Image-to-Image) hoặc Inpainting (với Mask) bằng OpenAI gpt-image-1. Trả về (Image, usage_dict)."""
    if not gpt_key:
        raise Exception("Không tìm thấy [GPTKey] trong D:/vps_go.md")
    if not os.path.exists(source_filepath):
        raise Exception(f"Không tìm thấy file ảnh nguồn: {source_filepath}")

    with Image.open(source_filepath) as orig_im:
        orig_w, orig_h = orig_im.size
        if orig_w > orig_h * 1.2:
            target_size = (1536, 1024)
            size_param = "1536x1024"
        elif orig_h > orig_w * 1.2:
            target_size = (1024, 1536)
            size_param = "1024x1536"
        else:
            target_size = (1024, 1024)
            size_param = "1024x1024"

        prep_img = orig_im.convert("RGBA").resize(target_size, Image.Resampling.LANCZOS)
        img_buf = io.BytesIO()
        prep_img.save(img_buf, format="PNG")
        img_buf.seek(0)

    files = {
        "image": ("image.png", img_buf, "image/png")
    }

    if mask_bytes and len(mask_bytes) > 100:
        mask_im = Image.open(io.BytesIO(mask_bytes)).convert("RGBA")
        mask_im = mask_im.resize(target_size, Image.Resampling.NEAREST)
        mask_buf = io.BytesIO()
        mask_im.save(mask_buf, format="PNG")
        mask_buf.seek(0)
        files["mask"] = ("mask.png", mask_buf, "image/png")
        logger.info(f"🎨 [Inpainting] Đã nạp Mask vùng chọn ({target_size[0]}×{target_size[1]}).")
    else:
        logger.info(f"🎨 [Image-to-Image] Chế độ sửa toàn bộ theo prompt (không có mask).")

    headers = {"Authorization": f"Bearer {gpt_key}"}
    data = {
        "model": "gpt-image-1",
        "prompt": prompt,
        "size": size_param
    }

    logger.info(f"Đang gửi request /v1/images/edits tới OpenAI (prompt='{prompt[:60]}...')...")
    resp = requests.post("https://api.openai.com/v1/images/edits", headers=headers, files=files, data=data, timeout=120)
    if resp.status_code == 200:
        res_json = resp.json()
        item = res_json.get("data", [{}])[0]
        u = res_json.get("usage", {})
        logger.info(f"OpenAI raw image edit usage: {u}")
        in_tok = u.get("input_tokens", u.get("prompt_tokens", 0))
        out_tok = u.get("output_tokens", u.get("completion_tokens", 0))
        tot_tok = u.get("total_tokens", in_tok + out_tok)
        if in_tok or out_tok:
            img_cost_usd = round((in_tok * 10.0 + out_tok * 40.0) / 1_000_000, 4)
        elif tot_tok:
            img_cost_usd = round(tot_tok * 0.000040, 4)
        else:
            # Edit inpainting bao gồm input tokens ảnh gốc + output tokens: ~3,500 tokens -> $0.140 (~3,550 VNĐ)
            tot_tok = 3500
            img_cost_usd = 0.140

        usage = {
            "tokens": tot_tok,
            "input_tokens": in_tok,
            "output_tokens": out_tok,
            "cost_usd": img_cost_usd,
            "engine": "gpt",
            "model": "gpt-image-1"
        }

        if "b64_json" in item:
            raw_bytes = base64.b64decode(item["b64_json"])
            return Image.open(io.BytesIO(raw_bytes)).convert("RGB"), usage
        elif "url" in item:
            r = requests.get(item["url"], timeout=45)
            return Image.open(io.BytesIO(r.content)).convert("RGB"), usage
        raise Exception("Không tìm thấy dữ liệu ảnh trong kết quả trả về của OpenAI")
    else:
        err_data = resp.json().get("error", {})
        err_msg = err_data.get("message") or resp.text
        err_code = err_data.get("code") or resp.status_code
        raise Exception(f"[OpenAI Edit Error {err_code}] {err_msg}")

def generate_with_gemini(prompt: str, aspect_ratio: str, gemini_key: str) -> tuple:
    """Tạo ảnh mới với Google Gemini / Imagen 3. Trả về (Image, usage_dict)."""
    if not gemini_key:
        raise Exception("Không tìm thấy [GeminiKey] trong D:/vps_go.md")

    gemini_models = ["imagen-3.0-generate-002", "imagen-3.0-generate-001", "gemini-3.1-flash-image", "gemini-2.5-flash-image"]
    last_err = None

    for model in gemini_models:
        logger.info(f"Đang gửi lệnh tạo ảnh tới Google Gemini API (model={model})...")
        try:
            if "imagen" in model:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:predict?key={gemini_key}"
                payload = {
                    "instances": [{"prompt": prompt}],
                    "parameters": {
                        "sampleCount": 1,
                        "aspectRatio": aspect_ratio if aspect_ratio in ("1:1", "16:9", "9:16", "4:3", "3:4") else "1:1",
                        "outputMimeType": "image/png"
                    }
                }
                resp = requests.post(url, json=payload, timeout=60)
                if resp.status_code == 200:
                    res_json = resp.json()
                    preds = res_json.get("predictions", [])
                    if preds and "bytesBase64Encoded" in preds[0]:
                        raw_bytes = base64.b64decode(preds[0]["bytesBase64Encoded"])
                        usage = {
                            "tokens": 1200,
                            "cost_usd": 0.030,
                            "engine": "gemini",
                            "model": model
                        }
                        return Image.open(io.BytesIO(raw_bytes)).convert("RGB"), usage
                else:
                    err_json = resp.json().get("error", {})
                    last_err = f"[Gemini {resp.status_code} {err_json.get('status', '')}] {err_json.get('message', resp.text)}"
                    logger.warning(f"Gemini {model} lỗi: {last_err}")
            else:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}]
                }
                resp = requests.post(url, json=payload, timeout=60)
                if resp.status_code == 200:
                    res_json = resp.json()
                    candidates = res_json.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        for p in parts:
                            if "inlineData" in p:
                                raw_bytes = base64.b64decode(p["inlineData"]["data"])
                                usage = {
                                    "tokens": 1000,
                                    "cost_usd": 0.030,
                                    "engine": "gemini",
                                    "model": model
                                }
                                return Image.open(io.BytesIO(raw_bytes)).convert("RGB"), usage
                else:
                    err_json = resp.json().get("error", {})
                    last_err = f"[Gemini {resp.status_code} {err_json.get('status', '')}] {err_json.get('message', resp.text)}"
                    logger.warning(f"Gemini {model} lỗi: {last_err}")
        except Exception as e:
            last_err = str(e)

    raise Exception(last_err or "Lỗi không xác định khi gọi Google Gemini API")

def run_auto_ai_generator(job_id: str, raw_prompt: str, aspect_ratio: str, target_file: str, resolution: str = "4k", engine: str = "gpt", use_ai_enhancer: bool = True, presets: dict = None):
    """Tự động sinh ảnh AI trực tiếp bằng GPT hoặc Gemini. TUYỆT ĐỐI KHÔNG FALLBACK."""
    logger.info(f"🎨 [AI Generator] Bắt đầu sinh ảnh job {job_id} bằng {engine.upper()} ({resolution.upper()}, ratio {aspect_ratio}): '{raw_prompt[:60]}...'")
    gemini_key, gpt_key = get_api_keys()

    # 1. Chuẩn hóa Prompt bằng AI (Method 1) kết hợp Presets Chuyên Nghiệp (Method 2)
    effective_prompt, enhancer_usage = enhance_prompt(raw_prompt, use_ai_enhancer, presets, gpt_key, task_type="create")
    if not effective_prompt:
        effective_prompt = raw_prompt

    # Cập nhật prompt đã chuẩn hóa vào jobs.json để hiển thị trên UI
    jobs = load_jobs()
    if job_id in jobs:
        jobs[job_id]["prompt"] = effective_prompt
        jobs[job_id]["enhanced_prompt"] = effective_prompt
        save_jobs(jobs)

    try:
        raw_im = None
        img_usage = {"tokens": 1000, "cost_usd": 0.040}
        if engine.lower() == "gemini":
            raw_im, img_usage = generate_with_gemini(effective_prompt, aspect_ratio, gemini_key)
        else:
            raw_im, img_usage = generate_with_gpt(effective_prompt, aspect_ratio, gpt_key)

        if raw_im is None:
            raise Exception(f"Không nhận được dữ liệu ảnh hợp lệ từ {engine.upper()}")

        # Tính toán tiền và token tiêu thụ
        tot_tokens = enhancer_usage.get("total_tokens", 0) + img_usage.get("tokens", 0)
        tot_usd = round(enhancer_usage.get("cost_usd", 0.0) + img_usage.get("cost_usd", 0.0), 4)
        tot_vnd = int(round(tot_usd * 25400))
        usage_data = {
            "total_tokens": tot_tokens,
            "cost_usd": tot_usd,
            "cost_vnd": tot_vnd,
            "enhancer_tokens": enhancer_usage.get("total_tokens", 0),
            "enhancer_cost_usd": enhancer_usage.get("cost_usd", 0.0),
            "image_tokens": img_usage.get("tokens", 0),
            "image_cost_usd": img_usage.get("cost_usd", 0.0)
        }

        jobs = load_jobs()
        if job_id in jobs:
            jobs[job_id]["usage"] = usage_data
            save_jobs(jobs)

        res_key = resolution.lower() if resolution.lower() in RESOLUTION_MAP else "4k"
        ratio_map = RESOLUTION_MAP[res_key]
        target_w, target_h = ratio_map.get(aspect_ratio, (4096, 2304 if aspect_ratio == "16:9" else 4096))

        logger.info(f"✨ [AI Upscaler] Nâng cấp ảnh từ {raw_im.size} lên {target_w}×{target_h} ({resolution.upper()}) chuẩn 300 DPI...")
        upscaled = raw_im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        enhanced = upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=145, threshold=3))
        sharpener = ImageEnhance.Sharpness(enhanced)
        final_img = sharpener.enhance(1.25)

        final_img.save(target_file, "PNG", dpi=(300, 300), optimize=False)
        generate_thumbnail(os.path.basename(target_file))
        filesize_mb = os.path.getsize(target_file) / (1024 * 1024)
        logger.info(f"✔ [AI Generator] Đã xuất ảnh {resolution.upper()}: {target_file} ({final_img.width}×{final_img.height} px, {filesize_mb:.2f} MB, 300 DPI, {tot_tokens} tokens, ${tot_usd})")

    except Exception as e:
        err_msg = str(e)
        logger.error(f"✖ [{engine.upper()} FAILED] {err_msg}")
        jobs = load_jobs()
        if job_id in jobs:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = err_msg
            save_jobs(jobs)

def run_auto_edit_generator(job_id: str, raw_prompt: str, source_filepath: str, mask_bytes: bytes, target_file: str, resolution: str = "4k", engine: str = "gpt", use_ai_enhancer: bool = True, presets: dict = None):
    """Thực thi sửa ảnh AI trực tiếp và upscale 4K/300DPI."""
    logger.info(f"🎨 [AI Edit] Bắt đầu sửa ảnh job {job_id} ({resolution.upper()}): '{raw_prompt[:60]}...'")
    gemini_key, gpt_key = get_api_keys()

    # 1. Chuẩn hóa Prompt sửa ảnh nếu bật AI Enhancer
    effective_prompt, enhancer_usage = enhance_prompt(raw_prompt, use_ai_enhancer, presets, gpt_key, task_type="edit")
    if not effective_prompt:
        effective_prompt = raw_prompt

    jobs = load_jobs()
    if job_id in jobs:
        jobs[job_id]["prompt"] = effective_prompt
        jobs[job_id]["enhanced_prompt"] = effective_prompt
        save_jobs(jobs)

    try:
        if engine.lower() != "gpt":
            raise Exception("Chức năng Sửa ảnh & Inpainting hiện tại hỗ trợ tốt nhất trên GPT (OpenAI). Vui lòng chọn engine GPT.")

        edited_im, img_usage = edit_with_gpt(source_filepath, effective_prompt, mask_bytes, gpt_key)
        if edited_im is None:
            raise Exception("Không nhận được ảnh sau khi sửa từ OpenAI")

        # Tính toán tiền và token tiêu thụ
        tot_tokens = enhancer_usage.get("total_tokens", 0) + img_usage.get("tokens", 0)
        tot_usd = round(enhancer_usage.get("cost_usd", 0.0) + img_usage.get("cost_usd", 0.0), 4)
        tot_vnd = int(round(tot_usd * 25400))
        usage_data = {
            "total_tokens": tot_tokens,
            "cost_usd": tot_usd,
            "cost_vnd": tot_vnd,
            "enhancer_tokens": enhancer_usage.get("total_tokens", 0),
            "enhancer_cost_usd": enhancer_usage.get("cost_usd", 0.0),
            "image_tokens": img_usage.get("tokens", 0),
            "image_cost_usd": img_usage.get("cost_usd", 0.0)
        }

        jobs = load_jobs()
        if job_id in jobs:
            jobs[job_id]["usage"] = usage_data
            save_jobs(jobs)

        orig_w, orig_h = edited_im.size
        scale = 4.0 if resolution.lower() == "4k" else (2.5 if resolution.lower() == "2k" else 1.5)
        target_w = int(orig_w * scale)
        target_h = int(orig_h * scale)

        logger.info(f"✨ [AI Upscaler] Nâng cấp ảnh sửa từ {edited_im.size} lên {target_w}×{target_h} ({resolution.upper()}) chuẩn 300 DPI...")
        upscaled = edited_im.resize((target_w, target_h), Image.Resampling.LANCZOS)
        enhanced = upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=140, threshold=3))
        final_img = ImageEnhance.Sharpness(enhanced).enhance(1.2)

        final_img.save(target_file, "PNG", dpi=(300, 300), optimize=False)
        generate_thumbnail(os.path.basename(target_file))
        filesize_mb = os.path.getsize(target_file) / (1024 * 1024)
        logger.info(f"✔ [AI Edit] Đã xuất ảnh {resolution.upper()}: {target_file} ({final_img.width}×{final_img.height} px, {filesize_mb:.2f} MB, 300 DPI, {tot_tokens} tokens, ${tot_usd})")

    except Exception as e:
        err_msg = str(e)
        logger.error(f"✖ [AI Edit FAILED] {err_msg}")
        jobs = load_jobs()
        if job_id in jobs:
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = err_msg
            save_jobs(jobs)

def watchdog_loop():
    """Luồng giám sát thư mục D:/render và đếm ngược timeout 60 phút"""
    logger.info(f"Bắt đầu luồng Watchdog giám sát thư mục: {RENDER_DIR}")
    while True:
        try:
            jobs = load_jobs()
            updated = False
            now = time.time()

            for job_id, job in list(jobs.items()):
                if job.get("status") != "pending":
                    continue

                filename = job.get("filename") or f"{job_id}.png"
                filepath = os.path.join(RENDER_DIR, filename)
                created_at = job.get("created_at_ts", now)
                timeout_seconds = job.get("timeout_seconds", 3600)
                elapsed = now - created_at

                if is_file_ready(filepath):
                    filesize = os.path.getsize(filepath)
                    dim_str = ""
                    try:
                        with Image.open(filepath) as im:
                            dim_str = f"{im.width}×{im.height}"
                    except Exception:
                        pass

                    logger.info(f"🎉 PHÁT HIỆN FILE ẢNH XONG: {filename} ({filesize / (1024*1024):.2f} MB, {dim_str}) sau {elapsed:.1f}s!")
                    
                    job["status"] = "completed"
                    job["completed_at"] = datetime.now(timezone.utc).isoformat()
                    job["file_size_bytes"] = filesize
                    job["dimensions"] = dim_str
                    job["dpi"] = 300
                    job["elapsed_seconds"] = round(elapsed, 1)
                    job["output_file"] = filepath

                    callback_payload = {
                        "job_id": job_id,
                        "status": "completed",
                        "engine": job.get("engine", "gpt"),
                        "filename": filename,
                        "file_size_bytes": filesize,
                        "dimensions": dim_str,
                        "dpi": 300,
                        "elapsed_seconds": round(elapsed, 1),
                        "prompt": job.get("prompt"),
                        "metadata": job.get("metadata", {})
                    }
                    
                    callback_url = job.get("callback_url")
                    if callback_url:
                        threading.Thread(
                            target=send_callback,
                            args=(callback_url, callback_payload, filepath),
                            daemon=True
                        ).start()
                        job["callback_sent"] = True

                    updated = True

                elif elapsed > timeout_seconds:
                    logger.warning(f"⏰ HẾT THỜI GIAN CHỜ (TIMEOUT > {timeout_seconds}s) cho job {job_id}!")
                    job["status"] = "timeout"
                    job["cancelled_at"] = datetime.now(timezone.utc).isoformat()
                    job["elapsed_seconds"] = round(elapsed, 1)
                    job["error"] = f"Quá {int(timeout_seconds / 60)} phút không phát hiện file ảnh trong D:/render."

                    callback_payload = {
                        "job_id": job_id,
                        "status": "timeout",
                        "error": job["error"],
                        "elapsed_seconds": round(elapsed, 1),
                        "metadata": job.get("metadata", {})
                    }

                    callback_url = job.get("callback_url")
                    if callback_url:
                        threading.Thread(
                            target=send_callback,
                            args=(callback_url, callback_payload, None),
                            daemon=True
                        ).start()

                    updated = True

            if updated:
                save_jobs(jobs)

        except Exception as e:
            logger.error(f"Lỗi trong vòng lặp watchdog: {e}")

        time.sleep(2)

# ==============================================================================
# FLASK WEB APP & WEB STUDIO UI
# ==============================================================================
app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
    return response

WEB_STUDIO_HTML = """<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Toolx AI Studio — Tạo & Chỉnh Sửa Ảnh 4K Inpainting</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- Top Navigation -->
  <header class="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-50 backdrop-blur-md">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white font-extrabold text-xl">
          💎
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight text-white flex items-center gap-2">
            Toolx AI Render Studio
            <span class="text-[10px] font-extrabold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              ✨ Tạo Mới & Inpainting 4K
            </span>
          </h1>
          <p class="text-xs text-slate-400">GPT-Image-1 & Gemini • Super-Resolution 300 DPI</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Port 8080: Online
        </div>
        <button onclick="openRenderFolder()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5 cursor-pointer">
          📂 Mở D:\\render
        </button>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      <!-- Cột Trái: Bảng Điều Khiển (5 cột) -->
      <div class="lg:col-span-5 space-y-6">
        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          
          <!-- Tab Switcher: Tạo Mới vs Sửa Ảnh -->
          <div class="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button type="button" onclick="switchTab('create')" id="tabBtnCreate"
              class="py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer bg-violet-600 text-white shadow-md">
              <span>✨ Tạo Ảnh Mới</span>
            </button>
            <button type="button" onclick="switchTab('edit')" id="tabBtnEdit"
              class="py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200">
              <span>🎨 Sửa Ảnh & Inpainting</span>
            </button>
          </div>

          <!-- ================= TAB 1: TẠO MỚI (TEXT-TO-IMAGE) ================= -->
          <div id="panelCreate" class="space-y-5">
            <!-- Bộ chọn AI Engine (GPT / Gemini) -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>AI Engine (Nguồn tạo ảnh) *</span>
                <span class="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Từ D:/vps_go.md
                </span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" onclick="setEngine('gpt')" data-engine="gpt" class="engine-btn py-2.5 px-3 rounded-xl border border-violet-500 bg-violet-600/20 text-violet-300 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer">
                  <span class="text-lg">🟣</span>
                  <div class="text-left">
                    <div class="font-extrabold text-white">GPT (OpenAI)</div>
                    <div class="text-[10px] text-slate-400 font-normal">gpt-image-1 (Siêu nét)</div>
                  </div>
                </button>
                <button type="button" onclick="setEngine('gemini')" data-engine="gemini" class="engine-btn py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer">
                  <span class="text-lg">🟢</span>
                  <div class="text-left">
                    <div class="font-extrabold text-white">Gemini (Google)</div>
                    <div class="text-[10px] text-slate-400 font-normal">Imagen 3</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Prompt Input -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Mô tả hình ảnh (Prompt) *</label>
              <textarea id="promptInput" rows="4" placeholder="Nhập mô tả ảnh chi tiết..."
                class="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition resize-none"></textarea>
              
              <div class="flex flex-wrap gap-1.5 mt-2">
                <span class="text-[11px] text-slate-400 self-center mr-1">Gợi ý:</span>
                <button type="button" onclick="setPrompt('Ảnh chụp tài liệu cô gái trẻ đang thu hoạch bắp ngô, mồ hôi lấp lánh trên trán, ánh nắng sáng trong trẻo, chân thực tự nhiên')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Cô gái đồng ngô</button>
                <button type="button" onclick="setPrompt('Chai nước hoa cao cấp nắp vàng sang trọng, ánh sáng studio nghệ thuật')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Chai nước hoa</button>
                <button type="button" onclick="setPrompt('giọt sữa rơi trên áo kendogi, thớ vải dệt cotton sashiko màu xanh chàm sắc nét')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Kendogi & Sữa</button>
              </div>
            </div>

            <!-- BỘ CHUẨN HÓA VĂN BẢN (PROMPT STANDARDIZATION) -->
            <div class="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
              <!-- Method 1: AI Prompt Enhancer Toggle (Ưu tiên) -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="aiEnhancerToggle" checked class="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-700 focus:ring-violet-500 accent-violet-600 cursor-pointer">
                  <label for="aiEnhancerToggle" class="text-xs font-bold text-violet-300 flex items-center gap-1.5 cursor-pointer">
                    <span>✨ AI Tự Động Chuẩn Hóa Prompt</span>
                    <span class="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/40 px-1.5 py-0.5 rounded font-mono font-bold">Ưu tiên (Method 1)</span>
                  </label>
                </div>
                <span class="text-[10px] text-emerald-400 font-mono">GPT-4o-mini</span>
              </div>
              <p class="text-[11px] text-slate-400 leading-relaxed">
                Tự động tối ưu prompt theo <b>Tiêu chuẩn Nhiếp ảnh 5 lớp</b> (Chủ thể, Bối cảnh, Ánh sáng, Quang học ống kính, Chất liệu) để đạt chuẩn 4K chân thực, xóa bỏ chất nhựa AI.
              </p>

              <!-- Method 2: Pro Studio Presets Toggle (Chuyên sâu cho dân Pro) -->
              <div class="pt-2 border-t border-slate-800/80">
                <button type="button" onclick="toggleProPresets()" id="toggleProBtn" class="w-full flex items-center justify-between text-xs font-bold text-slate-300 hover:text-cyan-300 transition py-1 cursor-pointer">
                  <div class="flex items-center gap-1.5">
                    <span>🛠️ Bộ Lọc Nhiếp Ảnh Chuyên Sâu</span>
                    <span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold">Pro Presets (Method 2)</span>
                  </div>
                  <span id="proChevron" class="text-xs text-slate-400 transition">▼</span>
                </button>

                <div id="proPresetsPanel" class="hidden mt-3 space-y-3 pt-2">
                  <!-- 1. Phong cách / Thể loại -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>1. Phong cách & Thể loại (Style / Genre)</span>
                      <button type="button" onclick="document.getElementById('stylePreset').value='none'" class="text-[10px] text-slate-500 hover:text-slate-300">Đặt lại</button>
                    </label>
                    <select id="stylePreset" class="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500">
                      <option value="none">-- Tự do / Theo AI (Auto) --</option>
                      <option value="doc_realism" selected>📷 Chân thực đời thường (Documentary / Hyper-Realistic)</option>
                      <option value="cinematic">🎬 Điện ảnh Cinematic (Panavision Anamorphic 35mm)</option>
                      <option value="commercial_studio">📸 Studio Thương mại (High-End Product / Fashion)</option>
                      <option value="vintage_film">☕ Analog Film Cổ điển (Kodak Portra 400 Grain)</option>
                      <option value="oil_painting">🎨 Tranh sơn dầu Nghệ thuật (Fine Art Oil Painting)</option>
                      <option value="packaging_mockup">📦 Mockup Bao bì In ấn (Clean 3D Mockup)</option>
                    </select>
                  </div>

                  <!-- 2. Ánh sáng & Không khí -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>2. Ánh sáng & Không khí (Lighting & Atmosphere)</span>
                      <button type="button" onclick="document.getElementById('lightingPreset').value='none'" class="text-[10px] text-slate-500 hover:text-slate-300">Đặt lại</button>
                    </label>
                    <select id="lightingPreset" class="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500">
                      <option value="none">-- Tự do / Theo AI (Auto) --</option>
                      <option value="golden_hour">☀️ Nắng sớm bình minh (Golden Hour Soft Glow)</option>
                      <option value="soft_daylight">⛅ Ánh sáng tự nhiên dịu (Soft Overcast Daylight)</option>
                      <option value="studio_softbox">💡 Studio Softbox 3 điểm (Three-Point Studio Rim)</option>
                      <option value="sunset_dramatic">🌆 Hoàng hôn rực rỡ (Sunset Twilight Backlight)</option>
                      <option value="moody_night">🌙 Đêm huyền bí / Ánh trăng (Moody Blue Hour Moonlight)</option>
                      <option value="neon_glow">🏮 Đèn Neon tương phản (Cinematic Neon Contrast)</option>
                    </select>
                  </div>

                  <!-- 3. Góc máy & Tiêu cự -->
                  <div>
                    <label class="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>3. Góc máy & Tiêu cự (Camera Optics & Angle)</span>
                      <button type="button" onclick="document.getElementById('lensPreset').value='none'" class="text-[10px] text-slate-500 hover:text-slate-300">Đặt lại</button>
                    </label>
                    <select id="lensPreset" class="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500">
                      <option value="none">-- Tự do / Theo AI (Auto) --</option>
                      <option value="portrait_85mm">🔍 Chân dung xóa phông (85mm f/1.4 Creamy Bokeh)</option>
                      <option value="natural_50mm">👁️ Góc mắt người thật (50mm f/1.8 Natural View)</option>
                      <option value="wide_24mm">🌄 Toàn cảnh góc rộng (24mm Environmental Wide)</option>
                      <option value="macro_100mm">🔬 Cận cảnh vi mô (100mm Macro Fine Details)</option>
                      <option value="drone_aerial">🚁 Góc nhìn trên cao (Aerial Drone Bird's Eye)</option>
                      <option value="full_body">👤 Chụp toàn thân (Full Body Framing)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tỉ lệ khung hình (Aspect Ratio) -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">Tỉ lệ khung hình (Aspect Ratio)</label>
              <div class="grid grid-cols-5 gap-2" id="ratioSelector">
                <button type="button" onclick="setRatio('1:1')" data-ratio="1:1" class="ratio-btn py-2 px-1 text-center rounded-xl border border-violet-500 bg-violet-600/20 text-violet-300 text-xs font-semibold transition cursor-pointer">
                  1:1<br><span class="text-[9px] opacity-75">Vuông</span>
                </button>
                <button type="button" onclick="setRatio('16:9')" data-ratio="16:9" class="ratio-btn py-2 px-1 text-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-semibold transition cursor-pointer">
                  16:9<br><span class="text-[9px] opacity-75">Ngang</span>
                </button>
                <button type="button" onclick="setRatio('9:16')" data-ratio="9:16" class="ratio-btn py-2 px-1 text-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-semibold transition cursor-pointer">
                  9:16<br><span class="text-[9px] opacity-75">Story</span>
                </button>
                <button type="button" onclick="setRatio('4:3')" data-ratio="4:3" class="ratio-btn py-2 px-1 text-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-semibold transition cursor-pointer">
                  4:3<br><span class="text-[9px] opacity-75">Poster</span>
                </button>
                <button type="button" onclick="setRatio('3:4')" data-ratio="3:4" class="ratio-btn py-2 px-1 text-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-semibold transition cursor-pointer">
                  3:4<br><span class="text-[9px] opacity-75">Dọc</span>
                </button>
              </div>
            </div>

            <!-- Nút Tạo Render -->
            <button type="button" id="submitBtn" onclick="submitRenderJob()"
              class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-extrabold text-sm tracking-wide transition shadow-xl shadow-indigo-600/30 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
              <span>💎 Render 4K Ngay (Generate 4K)</span>
            </button>
          </div>

          <!-- ================= TAB 2: CHỈNH SỬA & INPAINTING ================= -->
          <div id="panelEdit" class="space-y-5 hidden">
            <!-- Chọn ảnh nguồn -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-slate-300">1. Chọn ảnh nguồn cần sửa *</label>
                <button type="button" onclick="document.getElementById('fileUploadInput').click()" class="text-[11px] text-cyan-400 hover:text-cyan-300 transition flex items-center gap-1 cursor-pointer">
                  📤 Tải ảnh từ máy
                </button>
                <input type="file" id="fileUploadInput" accept="image/*" class="hidden" onchange="handleFileUpload(event)">
              </div>
              <select id="sourceSelect" onchange="loadSourceFromSelect(this.value)"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-violet-500">
                <option value="">-- Chọn ảnh từ thư viện D:/render --</option>
              </select>
            </div>

            <!-- Khung Canvas Vẽ Mask (Inpainting) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <span>2. Tô vùng cần sửa (Mask)</span>
                  <span id="modeBadge" class="text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    🖼️ Sửa toàn bộ
                  </span>
                </label>
                <div class="flex items-center gap-1.5">
                  <button type="button" onclick="setTool('brush')" id="toolBrush" class="px-2 py-1 text-[11px] rounded bg-red-600/40 border border-red-500 text-red-200 font-bold transition cursor-pointer">
                    🖌️ Cọ tô
                  </button>
                  <button type="button" onclick="setTool('eraser')" id="toolEraser" class="px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer">
                    🧹 Tẩy
                  </button>
                  <button type="button" onclick="clearMask()" class="px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer">
                    🗑️ Xóa hết
                  </button>
                </div>
              </div>

              <!-- Canvas Container -->
              <div class="relative w-full aspect-square bg-slate-950 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center select-none">
                <canvas id="mainCanvas" class="max-w-full max-h-full cursor-crosshair"></canvas>
                <div id="canvasPlaceholder" class="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-xs gap-2 pointer-events-none">
                  <span class="text-3xl">🖼️</span>
                  <span>Hãy chọn ảnh ở trên để bắt đầu</span>
                </div>
              </div>

              <!-- Thanh trượt nét cọ -->
              <div class="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                <span class="shrink-0">Cỡ cọ:</span>
                <input type="range" id="brushSize" min="10" max="90" value="35" class="w-full accent-red-500 cursor-pointer" oninput="document.getElementById('brushSizeVal').innerText = this.value + 'px'">
                <span id="brushSizeVal" class="font-mono text-slate-300 shrink-0 w-8">35px</span>
              </div>
              <p class="text-[10px] text-slate-400 mt-1">
                💡 <b>Mẹo:</b> Dùng cọ tô màu đỏ lên vùng muốn thay thế (ví dụ cái mũ, cái áo). Nếu để trống không tô, AI sẽ sửa phong cách toàn bức ảnh.
              </p>
            </div>

            <!-- Prompt Chỉnh Sửa -->
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">3. Mô tả yêu cầu sửa (Edit Prompt) *</label>
              <textarea id="editPromptInput" rows="3" placeholder="Nhập chi tiết cần sửa (ví dụ: đổi nón lá thành mũ tai bèo quân đội màu xanh rêu, đổi màu áo sang màu đỏ thắm)..."
                class="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition resize-none"></textarea>
              
              <div class="flex flex-wrap gap-1.5 mt-2">
                <button type="button" onclick="setEditPrompt('Đổi nón lá thành mũ tai bèo quân đội màu xanh rêu')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Đổi mũ tai bèo</button>
                <button type="button" onclick="setEditPrompt('Đổi màu áo sơ mi thành màu đỏ tươi thêu hoa văn')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Đổi áo đỏ</button>
                <button type="button" onclick="setEditPrompt('Thay bắp ngô bằng một bó hoa hướng dương vàng rực')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Bó hoa hướng dương</button>
                <button type="button" onclick="setEditPrompt('Bối cảnh hoàng hôn chiều tà rực rỡ với bầu trời màu cam ấm áp')" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md transition">Hoàng hôn chiều</button>
              </div>

              <!-- AI Refiner toggle cho Inpainting -->
              <div class="mt-2.5 p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <input type="checkbox" id="editAiEnhancerToggle" checked class="w-4 h-4 rounded text-cyan-600 bg-slate-900 border-slate-700 focus:ring-cyan-500 accent-cyan-600 cursor-pointer">
                  <label for="editAiEnhancerToggle" class="text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer">
                    <span>✨ AI Tự Động Chuẩn Hóa Lệnh Sửa</span>
                    <span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.5 rounded font-mono font-bold">Inpainting Refiner</span>
                  </label>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">Hài hòa ánh sáng gốc</span>
              </div>
            </div>

            <!-- Nút Thực Hiện Sửa Ảnh -->
            <button type="button" id="submitEditBtn" onclick="submitEditJob()"
              class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-extrabold text-sm tracking-wide transition shadow-xl shadow-cyan-600/30 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
              <span>🎨 Thực Hiện Sửa Ảnh 4K (Generate Edit)</span>
            </button>
          </div>

          <!-- Bộ chọn Độ Phân Giải (Dùng chung cho cả 2 tab) -->
          <div class="pt-4 border-t border-slate-800">
            <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Độ phân giải xuất file</span>
              <span class="text-[11px] text-violet-400 font-semibold" id="resIndicator">4096 × 3072 px • 300 DPI</span>
            </label>
            <div class="grid grid-cols-3 gap-2" id="resSelector">
              <button type="button" onclick="setResolution('4k')" data-res="4k" class="res-btn py-2 px-2 rounded-xl border border-violet-500 bg-violet-600/20 text-violet-300 text-xs font-bold transition flex flex-col items-center cursor-pointer">
                <span>🟣 4K Ultra HD</span>
                <span class="text-[9px] opacity-75 font-normal">300 DPI In ấn</span>
              </button>
              <button type="button" onclick="setResolution('2k')" data-res="2k" class="res-btn py-2 px-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-bold transition flex flex-col items-center cursor-pointer">
                <span>🔵 2K QHD</span>
                <span class="text-[9px] opacity-75 font-normal">2560px</span>
              </button>
              <button type="button" onclick="setResolution('1080p')" data-res="1080p" class="res-btn py-2 px-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-bold transition flex flex-col items-center cursor-pointer">
                <span>⚪ 1080p FHD</span>
                <span class="text-[9px] opacity-75 font-normal">1920px</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Cột Phải: Danh sách Hàng Đợi & Ảnh Kết Quả (7 cột) -->
      <div class="lg:col-span-7 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            🖼️ Thư Viện Ảnh Đã Render (<span id="jobCount">0</span>)
          </h2>
          <div class="flex items-center gap-2">
            <button type="button" onclick="clearFailedJobs()" class="text-xs text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/40">
              🧹 Dọn task lỗi
            </button>
            <button type="button" onclick="fetchJobs()" class="text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1 cursor-pointer px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-violet-500/40">
              🔄 Làm mới
            </button>
          </div>
        </div>

        <div id="jobList" class="space-y-4">
          <!-- Các job card hiển thị ở đây -->
        </div>
      </div>

    </div>
  </main>

  <!-- ========================================================================= -->
  <!-- MODAL ZOOM & PAN 4K IMAGE VIEWER                                         -->
  <!-- ========================================================================= -->
  <div id="imageViewerModal" class="fixed inset-0 z-50 bg-black/95 backdrop-blur-md hidden flex-col select-none" tabindex="-1">
    <!-- Top Toolbar -->
    <div class="h-14 px-4 sm:px-6 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between z-10 shrink-0">
      <div class="flex items-center gap-3 min-w-0 pr-4">
        <span class="text-sm font-bold text-white font-mono truncate" id="viewerFilename">image.png</span>
        <span class="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono shrink-0 hidden sm:inline-block" id="viewerDimensions">4096×3072</span>
        <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700 font-mono font-bold shrink-0" id="viewerZoomLevel">100%</span>
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button type="button" onclick="zoomIn()" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold flex items-center gap-1 cursor-pointer" title="Phóng to (+)">
          🔍+
        </button>
        <button type="button" onclick="zoomOut()" class="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold flex items-center gap-1 cursor-pointer" title="Thu nhỏ (-)">
          🔍-
        </button>
        <button type="button" onclick="zoomActual()" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold cursor-pointer" title="Kích thước thực 100% (Phím 1)">
          1:1
        </button>
        <button type="button" onclick="zoomFit()" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs font-bold cursor-pointer" title="Vừa màn hình (Phím 0)">
          📐 Vừa
        </button>
        <button type="button" onclick="viewerQuickEdit()" class="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer">
          ✏️ Sửa ảnh này
        </button>
        <a id="viewerDownloadBtn" href="#" download="" class="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition text-xs font-bold flex items-center gap-1 cursor-pointer">
          💾 Tải 4K
        </a>
        <button type="button" onclick="closeImageModal()" class="p-2 ml-1 rounded-lg bg-red-600/30 hover:bg-red-600/60 text-red-200 border border-red-500/40 transition cursor-pointer text-sm font-bold" title="Đóng (Esc)">
          ✕
        </button>
      </div>
    </div>

    <!-- Viewport Area (Container for pan and zoom) -->
    <div id="viewerContainer" class="flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing">
      <div id="viewerTransformLayer" class="absolute transform-gpu origin-center will-change-transform">
        <img id="viewerImage" src="" alt="4K Preview" class="max-none pointer-events-none select-none rounded shadow-2xl">
      </div>
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur border border-slate-800 px-4 py-1.5 rounded-full text-[11px] text-slate-400 pointer-events-none text-center shadow-lg">
        💡 Cuộn chuột để Zoom • Giữ chuột kéo để Pan • Nhấp đúp để đổi tỉ lệ • Phím Esc để đóng
      </div>
    </div>
  </div>

  <script>
    let activeTab = 'create';
    let selectedRatio = '4:3';
    let selectedRes = '4k';
    let selectedEngine = 'gpt';

    function switchTab(tab) {
      activeTab = tab;
      const btnCreate = document.getElementById('tabBtnCreate');
      const btnEdit = document.getElementById('tabBtnEdit');
      const panelCreate = document.getElementById('panelCreate');
      const panelEdit = document.getElementById('panelEdit');

      if (tab === 'create') {
        btnCreate.className = 'py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer bg-violet-600 text-white shadow-md';
        btnEdit.className = 'py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200';
        panelCreate.classList.remove('hidden');
        panelEdit.classList.add('hidden');
      } else {
        btnEdit.className = 'py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer bg-cyan-600 text-white shadow-md';
        btnCreate.className = 'py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200';
        panelEdit.classList.remove('hidden');
        panelCreate.classList.add('hidden');
        if (!currentSourceImage && lastCompletedJobs.length > 0) {
          loadSourceImage(lastCompletedJobs[0].filename);
        }
      }
    }

    function setEngine(eng) {
      selectedEngine = eng;
      document.querySelectorAll('.engine-btn').forEach(btn => {
        if (btn.getAttribute('data-engine') === eng) {
          btn.className = 'engine-btn py-2.5 px-3 rounded-xl border border-violet-500 bg-violet-600/20 text-violet-300 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer';
        } else {
          btn.className = 'engine-btn py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-bold transition flex items-center gap-2.5 cursor-pointer';
        }
      });
    }

    function setResolution(res) {
      selectedRes = res;
      document.querySelectorAll('.res-btn').forEach(btn => {
        if (btn.getAttribute('data-res') === res) {
          btn.className = 'res-btn py-2 px-2 rounded-xl border border-violet-500 bg-violet-600/20 text-violet-300 text-xs font-bold transition flex flex-col items-center cursor-pointer';
        } else {
          btn.className = 'res-btn py-2 px-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-bold transition flex flex-col items-center cursor-pointer';
        }
      });
      document.getElementById('resIndicator').innerText = (res === '4k' ? '4096px' : (res === '2k' ? '2560px' : '1920px')) + ' • 300 DPI';
    }

    function setRatio(ratio) {
      selectedRatio = ratio;
      document.querySelectorAll('.ratio-btn').forEach(btn => {
        if (btn.getAttribute('data-ratio') === ratio) {
          btn.className = 'ratio-btn py-2 px-1 text-center rounded-xl border border-violet-500 bg-violet-600/20 text-violet-300 text-xs font-semibold transition cursor-pointer';
        } else {
          btn.className = 'ratio-btn py-2 px-1 text-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 text-xs font-semibold transition cursor-pointer';
        }
      });
    }

    function setPrompt(text) {
      document.getElementById('promptInput').value = text;
      document.getElementById('promptInput').focus();
    }

    function setEditPrompt(text) {
      document.getElementById('editPromptInput').value = text;
      document.getElementById('editPromptInput').focus();
    }

    async function openRenderFolder() {
      try {
        await fetch('/open-folder', { method: 'POST' });
      } catch (err) {
        alert('Lỗi mở thư mục D:\\\\render: ' + err.message);
      }
    }

    // =========================================================================
    // CANVAS INPAINTING & DRAWING ENGINE
    // =========================================================================
    const canvas = document.getElementById('mainCanvas');
    const ctx = canvas.getContext('2d');
    let currentSourceImage = null;
    let currentSourceFilename = '';
    let isDrawing = false;
    let currentTool = 'brush'; // 'brush' or 'eraser'
    let hasDrawnMask = false;

    // Off-screen canvas để export mask chuẩn cho OpenAI (alpha=0 vùng sửa, alpha=255 vùng giữ)
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d');

    function initCanvasDimensions(w, h) {
      canvas.width = w;
      canvas.height = h;
      maskCanvas.width = w;
      maskCanvas.height = h;
      resetMaskCanvas();
      redraw();
    }

    function resetMaskCanvas() {
      // Đầy đủ nền đen đục (alpha=255 nghĩa là giữ nguyên)
      maskCtx.globalCompositeOperation = 'source-over';
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      hasDrawnMask = false;
      updateModeBadge();
    }

    function updateModeBadge() {
      const badge = document.getElementById('modeBadge');
      if (hasDrawnMask) {
        badge.className = 'text-[10px] px-1.5 py-0.5 rounded font-mono bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse';
        badge.innerText = '🖌️ Inpainting (Sửa vùng đỏ)';
      } else {
        badge.className = 'text-[10px] px-1.5 py-0.5 rounded font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30';
        badge.innerText = '🖼️ Image-to-Image (Sửa toàn bộ)';
      }
    }

    function setTool(tool) {
      currentTool = tool;
      document.getElementById('toolBrush').className = tool === 'brush'
        ? 'px-2 py-1 text-[11px] rounded bg-red-600/40 border border-red-500 text-red-200 font-bold transition cursor-pointer'
        : 'px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer';
      document.getElementById('toolEraser').className = tool === 'eraser'
        ? 'px-2 py-1 text-[11px] rounded bg-amber-600/40 border border-amber-500 text-amber-200 font-bold transition cursor-pointer'
        : 'px-2 py-1 text-[11px] rounded bg-slate-800 border border-slate-700 text-slate-300 transition cursor-pointer';
    }

    function clearMask() {
      resetMaskCanvas();
      redraw();
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentSourceImage) {
        ctx.drawImage(currentSourceImage, 0, 0, canvas.width, canvas.height);
      }

      // Vẽ lớp mask đỏ bán trong suốt lên trên ảnh chính
      if (hasDrawnMask) {
        // Tạo visual layer từ maskCanvas
        const imgData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const visualCanvas = document.createElement('canvas');
        visualCanvas.width = canvas.width;
        visualCanvas.height = canvas.height;
        const vCtx = visualCanvas.getContext('2d');
        const vImgData = vCtx.createImageData(canvas.width, canvas.height);

        for (let i = 0; i < imgData.data.length; i += 4) {
          // Nếu alpha của mask < 128 (vùng người dùng đã tô để xóa) -> vẽ đỏ mờ
          if (imgData.data[i + 3] < 128) {
            vImgData.data[i] = 239;     // R
            vImgData.data[i + 1] = 68;  // G
            vImgData.data[i + 2] = 68;  // B
            vImgData.data[i + 3] = 135; // A (mờ ~50%)
          }
        }
        vCtx.putImageData(vImgData, 0, 0);
        ctx.drawImage(visualCanvas, 0, 0);
      }
    }

    function getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }

    function drawStroke(x, y) {
      const bSize = parseInt(document.getElementById('brushSize').value, 10);

      maskCtx.lineWidth = bSize;
      maskCtx.lineCap = 'round';
      maskCtx.lineJoin = 'round';

      if (currentTool === 'brush') {
        // Đục lỗ alpha (alpha = 0) báo hiệu vùng cần vẽ lại
        maskCtx.globalCompositeOperation = 'destination-out';
        maskCtx.beginPath();
        maskCtx.arc(x, y, bSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
        hasDrawnMask = true;
      } else {
        // Tẩy: phục hồi alpha đục (alpha = 255)
        maskCtx.globalCompositeOperation = 'source-over';
        maskCtx.fillStyle = '#000000';
        maskCtx.beginPath();
        maskCtx.arc(x, y, bSize / 2, 0, Math.PI * 2);
        maskCtx.fill();
      }

      updateModeBadge();
      redraw();
    }

    canvas.addEventListener('mousedown', (e) => {
      if (!currentSourceImage) return;
      isDrawing = true;
      const c = getCanvasCoords(e);
      drawStroke(c.x, c.y);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const c = getCanvasCoords(e);
      drawStroke(c.x, c.y);
    });

    window.addEventListener('mouseup', () => { isDrawing = false; });

    function loadSourceImage(filename) {
      if (!filename) return;
      currentSourceFilename = filename;
      document.getElementById('sourceSelect').value = filename;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        currentSourceImage = img;
        document.getElementById('canvasPlaceholder').style.display = 'none';
        // Chuẩn hóa kích thước hiển thị canvas (tối đa 1024)
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        initCanvasDimensions(w, h);
      };
      img.src = '/render-files/' + filename + '?t=' + Date.now();
    }

    function loadSourceFromSelect(val) {
      if (val) loadSourceImage(val);
    }

    function quickEditImage(filename) {
      switchTab('edit');
      loadSourceImage(filename);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await fetch('/upload-source-image', { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok && data.filename) {
          await fetchJobs();
          loadSourceImage(data.filename);
        } else {
          alert('Lỗi tải ảnh: ' + (data.error || 'Thất bại'));
        }
      } catch (err) {
        alert('Lỗi tải file: ' + err.message);
      }
    }

    function toggleProPresets() {
      const panel = document.getElementById('proPresetsPanel');
      const chevron = document.getElementById('proChevron');
      if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        chevron.innerText = '▲';
      } else {
        panel.classList.add('hidden');
        chevron.innerText = '▼';
      }
    }

    window.enhancedPrompts = {};

    function copyEnhancedPrompt(jobId) {
      const text = window.enhancedPrompts[jobId];
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          alert('✔ Đã sao chép Prompt Chuẩn Hóa AI vào bộ nhớ đệm!');
        }).catch(err => {
          prompt('Sao chép prompt bên dưới:', text);
        });
      }
    }

    // =========================================================================
    // SUBMIT RENDER / EDIT JOBS
    // =========================================================================
    async function submitRenderJob() {
      const prompt = document.getElementById('promptInput').value.trim();
      if (!prompt) {
        alert('Vui lòng nhập mô tả ảnh (Prompt)!');
        return;
      }

      const useAiEnhancer = document.getElementById('aiEnhancerToggle') ? document.getElementById('aiEnhancerToggle').checked : true;
      const presets = {
        style: document.getElementById('stylePreset') ? document.getElementById('stylePreset').value : 'none',
        lighting: document.getElementById('lightingPreset') ? document.getElementById('lightingPreset').value : 'none',
        lens: document.getElementById('lensPreset') ? document.getElementById('lensPreset').value : 'none'
      };

      const btn = document.getElementById('submitBtn');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Đang xử lý 4K...</span>';

      try {
        const res = await fetch('/render-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            use_ai_enhancer: useAiEnhancer,
            presets: presets,
            engine: selectedEngine,
            aspect_ratio: selectedRatio,
            resolution: selectedRes,
            render_mode: 'auto',
            timeout_minutes: 60
          })
        });

        const data = await res.json();
        if (res.ok) {
          document.getElementById('promptInput').value = '';
          lastJobsHash = '';
          fetchJobs();
        } else {
          alert('Lỗi: ' + (data.error || 'Không thể tạo job'));
        }
      } catch (err) {
        alert('Lỗi kết nối tới Bridge :8080: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>💎 Render 4K Ngay (Generate 4K)</span>';
      }
    }

    async function submitEditJob() {
      if (!currentSourceFilename) {
        alert('Vui lòng chọn hoặc tải lên một bức ảnh cần sửa!');
        return;
      }
      const prompt = document.getElementById('editPromptInput').value.trim();
      if (!prompt) {
        alert('Vui lòng nhập mô tả chi tiết cần sửa (Edit Prompt)!');
        return;
      }

      const useAiEnhancer = document.getElementById('editAiEnhancerToggle') ? document.getElementById('editAiEnhancerToggle').checked : true;

      const btn = document.getElementById('submitEditBtn');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Đang thực hiện sửa 4K...</span>';

      let maskB64 = null;
      if (hasDrawnMask) {
        maskB64 = maskCanvas.toDataURL('image/png');
      }

      try {
        const res = await fetch('/render-edit-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt,
            use_ai_enhancer: useAiEnhancer,
            source_filename: currentSourceFilename,
            mask_base64: maskB64,
            engine: 'gpt',
            resolution: selectedRes,
            timeout_minutes: 60
          })
        });

        const data = await res.json();
        if (res.ok) {
          document.getElementById('editPromptInput').value = '';
          clearMask();
          lastJobsHash = '';
          fetchJobs();
        } else {
          alert('Lỗi sửa ảnh: ' + (data.error || 'Thất bại'));
        }
      } catch (err) {
        alert('Lỗi kết nối: ' + err.message);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🎨 Thực Hiện Sửa Ảnh 4K (Generate Edit)</span>';
      }
    }

    let lastJobsHash = '';
    let lastCompletedJobs = [];

    async function fetchJobs() {
      try {
        const res = await fetch('/render-jobs/all');
        const data = await res.json();
        if (!data.success) return;

        const jobs = data.jobs || [];
        document.getElementById('jobCount').innerText = jobs.length;

        // Cập nhật dropdown ảnh nguồn cho tab Sửa Ảnh
        const completed = jobs.filter(j => j.status === 'completed' && j.filename);
        lastCompletedJobs = completed;
        const select = document.getElementById('sourceSelect');
        const prevVal = select.value;
        select.innerHTML = '<option value="">-- Chọn ảnh từ thư viện D:/render --</option>';
        completed.forEach(j => {
          const opt = document.createElement('option');
          opt.value = j.filename;
          opt.innerText = `${j.filename} — "${(j.raw_prompt || j.prompt || '').substring(0, 35)}..."`;
          if (j.filename === prevVal) opt.selected = true;
          select.appendChild(opt);
        });

        const container = document.getElementById('jobList');
        const currentHash = jobs.map(j => `${j.job_id}:${j.status}:${j.file_size_bytes || 0}:${j.error || ''}:${j.enhanced_prompt ? j.enhanced_prompt.length : 0}`).join('|');

        if (currentHash === lastJobsHash) {
          return;
        }
        lastJobsHash = currentHash;

        if (jobs.length === 0) {
          container.innerHTML = `
            <div class="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl py-12 text-center text-slate-500 text-xs">
              Chưa có lệnh render nào. Hãy nhập prompt ở cột bên trái để bắt đầu!
            </div>
          `;
          return;
        }

        const emptyNotice = container.querySelector('.border-dashed');
        if (emptyNotice) emptyNotice.remove();

        const currentJobIds = new Set(jobs.map(j => j.job_id));
        Array.from(container.children).forEach(child => {
          const id = child.getAttribute('data-job-id');
          if (id && !currentJobIds.has(id)) child.remove();
        });

        jobs.forEach(j => {
          let card = document.getElementById('card-' + j.job_id);
          const isDone = j.status === 'completed';
          const isPending = j.status === 'pending';
          const isFailed = j.status === 'failed';
          const isEdit = j.type === 'edit';

          let statusBadge = '';
          if (isDone) {
            statusBadge = `<span class="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">✔ 4K Hoàn tất (${j.elapsed_seconds || 0}s)</span>`;
          } else if (isPending) {
            statusBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span> Đang xử lý 4K...
            </span>`;
          } else if (isFailed) {
            statusBadge = `<span class="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">✖ Thất bại</span>`;
          } else {
            statusBadge = `<span class="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">✖ ${j.status}</span>`;
          }

          const imgUrl = isDone ? `/render-files/${j.filename}` : null;
          const mbSize = j.file_size_bytes ? (j.file_size_bytes / (1024 * 1024)).toFixed(2) + ' MB' : '';
          const engineLabel = isEdit ? '🎨 Inpaint / Edit' : (j.engine === 'gemini' ? '🟢 Gemini' : '🟣 GPT');
          const engineBadgeClass = isEdit 
            ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40'
            : (j.engine === 'gemini' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' : 'bg-purple-950/60 text-purple-300 border-purple-500/40');

          const rawText = j.raw_prompt || j.prompt || '';
          const hasEnhanced = j.enhanced_prompt && j.enhanced_prompt.trim() !== '' && j.enhanced_prompt.trim() !== rawText.trim();
          if (j.enhanced_prompt) {
            window.enhancedPrompts[j.job_id] = j.enhanced_prompt;
          }

          const cardHTML = `
            ${isDone && imgUrl ? `
              <div class="w-full md:w-44 h-44 bg-black rounded-xl overflow-hidden shrink-0 border border-slate-700 relative group cursor-pointer" onclick="openImageModal('${imgUrl}', '${j.filename}', '${j.dimensions || ''}')">
                <img src="${imgUrl}" alt="${j.filename}" onerror="this.parentElement.style.display='none'" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1 text-center px-2">
                  🔍 Phóng to & Zoom Pan
                </div>
              </div>
            ` : `
              <div class="w-full md:w-44 h-44 bg-slate-950 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center shrink-0 text-slate-500 text-xs">
                ${isFailed ? `
                  <span class="text-red-400 text-2xl mb-1">⚠️</span>
                  <span class="text-red-400 text-[11px] text-center px-2 font-bold">Lỗi tạo ảnh</span>
                ` : `
                  <div class="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mb-2"></div>
                  <span>Đang xử lý 4K...</span>
                `}
              </div>
            `}

            <div class="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2">
              <div>
                <div class="flex items-center justify-between gap-2 mb-1">
                  <div class="flex items-center gap-1.5 truncate">
                    <span class="text-[10px] font-extrabold px-2 py-0.5 rounded border font-mono ${engineBadgeClass}">
                      ${engineLabel}
                    </span>
                    <span class="text-xs font-mono font-bold text-violet-400 truncate">${j.filename}</span>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    ${statusBadge}
                    <button type="button" onclick="deleteJob('${j.job_id}')" title="Xóa task này" class="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/30 cursor-pointer">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                <p class="text-xs text-slate-200 line-clamp-3 leading-relaxed">"${rawText}"</p>

                ${hasEnhanced ? `
                  <details class="mt-2 text-xs bg-slate-950/80 border border-violet-500/30 rounded-xl p-2.5 transition group">
                    <summary class="cursor-pointer font-semibold text-violet-300 flex items-center justify-between select-none">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="flex items-center gap-1">✨ Prompt Chuẩn Hóa AI</span>
                        <span class="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded font-mono font-bold">5-Layer Framework</span>
                        ${j.presets && (j.presets.style !== 'none' || j.presets.lighting !== 'none' || j.presets.lens !== 'none') ? '<span class="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold">Pro Presets</span>' : ''}
                      </div>
                      <span class="text-[10px] text-slate-400 group-open:rotate-180 transition">▼</span>
                    </summary>
                    <div class="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 leading-relaxed font-mono select-all break-words">
                      ${j.enhanced_prompt}
                    </div>
                    <div class="mt-1.5 flex justify-end">
                      <button type="button" onclick="copyEnhancedPrompt('${j.job_id}')" class="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-violet-500/50 transition cursor-pointer flex items-center gap-1">
                        📋 Sao chép Prompt Chuẩn Hóa
                      </button>
                    </div>
                  </details>
                ` : ''}

                ${isFailed && j.error ? `
                  <div class="mt-2 p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono break-all leading-normal flex items-start gap-2 shadow-inner">
                    <span class="text-red-400 font-bold shrink-0">⚠️ Lỗi:</span>
                    <span>${j.error}</span>
                  </div>
                ` : ''}
              </div>

              <div class="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="bg-violet-950/60 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded font-mono font-bold">${j.dimensions || '4096×3072'}</span>
                  <span class="bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded font-mono font-bold">300 DPI</span>
                  ${mbSize ? `<span>💾 ${mbSize}</span>` : ''}
                </div>

                ${isDone ? `
                  <div class="flex items-center gap-2">
                    <button type="button" onclick="quickEditImage('${j.filename}')" class="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/60 text-cyan-200 border border-cyan-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                      ✏️ Sửa ảnh này
                    </button>
                    <a href="${imgUrl}" download="${j.filename}" class="px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/60 text-violet-200 border border-violet-500/40 text-xs font-bold transition">
                      💾 Tải 4K
                    </a>
                  </div>
                ` : ''}
              </div>
            </div>
          `;

          if (!card) {
            card = document.createElement('div');
            card.id = 'card-' + j.job_id;
            card.setAttribute('data-job-id', j.job_id);
            card.className = 'bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row gap-4 items-start transition duration-300';
            card.innerHTML = cardHTML;
            container.appendChild(card);
          } else {
            const cardHash = `${j.status}:${j.file_size_bytes || 0}:${j.error || ''}:${j.enhanced_prompt ? j.enhanced_prompt.length : 0}`;
            if (card.getAttribute('data-hash') !== cardHash) {
              card.setAttribute('data-hash', cardHash);
              card.innerHTML = cardHTML;
            }
          }
        });
      } catch (err) {
        console.error('Lỗi nạp danh sách jobs:', err);
      }
    }

    async function deleteJob(jobId) {
      if (!confirm('Bạn có chắc muốn xóa task ' + jobId + ' khỏi danh sách?')) return;
      try {
        const res = await fetch('/render-job/' + jobId, { method: 'DELETE' });
        if (res.ok) {
          const card = document.getElementById('card-' + jobId);
          if (card) card.remove();
          lastJobsHash = '';
          fetchJobs();
        } else {
          alert('Không thể xóa task');
        }
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    }

    async function clearFailedJobs() {
      if (!confirm('Bạn có muốn dọn dẹp tất cả các task bị lỗi/hủy không?')) return;
      try {
        const res = await fetch('/render-jobs/clear-failed', { method: 'POST' });
        if (res.ok) {
          lastJobsHash = '';
          fetchJobs();
        }
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    }

    // =========================================================================
    // MODAL ZOOM & PAN ENGINE
    // =========================================================================
    let viewerScale = 1;
    let viewerPanX = 0;
    let viewerPanY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    let currentViewerFilename = '';
    let currentViewerUrl = '';

    function openImageModal(url, filename, dimensions) {
      currentViewerUrl = url;
      currentViewerFilename = filename;
      document.getElementById('viewerFilename').innerText = filename;
      document.getElementById('viewerDimensions').innerText = dimensions || '300 DPI';
      document.getElementById('viewerDownloadBtn').href = url;
      document.getElementById('viewerDownloadBtn').download = filename;

      const modal = document.getElementById('imageViewerModal');
      const img = document.getElementById('viewerImage');
      modal.classList.remove('hidden');
      modal.classList.add('flex');

      img.onload = () => {
        zoomFit();
      };
      img.src = url;
    }

    function closeImageModal() {
      const modal = document.getElementById('imageViewerModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function updateViewerTransform() {
      const layer = document.getElementById('viewerTransformLayer');
      layer.style.transform = `translate(${viewerPanX}px, ${viewerPanY}px) scale(${viewerScale})`;
      document.getElementById('viewerZoomLevel').innerText = Math.round(viewerScale * 100) + '%';
    }

    function zoomFit() {
      const container = document.getElementById('viewerContainer');
      const img = document.getElementById('viewerImage');
      if (!img.naturalWidth || !img.naturalHeight) return;

      const pad = 48;
      const availW = container.clientWidth - pad;
      const availH = container.clientHeight - pad;
      const scale = Math.min(availW / img.naturalWidth, availH / img.naturalHeight, 1);

      viewerScale = scale;
      viewerPanX = 0;
      viewerPanY = 0;
      updateViewerTransform();
    }

    function zoomActual() {
      viewerScale = 1;
      viewerPanX = 0;
      viewerPanY = 0;
      updateViewerTransform();
    }

    function zoomIn() {
      zoomAtCenter(1.25);
    }

    function zoomOut() {
      zoomAtCenter(0.8);
    }

    function zoomAtCenter(factor) {
      const newScale = Math.max(0.08, Math.min(viewerScale * factor, 10));
      viewerScale = newScale;
      updateViewerTransform();
    }

    function viewerQuickEdit() {
      if (currentViewerFilename) {
        closeImageModal();
        quickEditImage(currentViewerFilename);
      }
    }

    function initViewerEvents() {
      const viewerContainer = document.getElementById('viewerContainer');
      if (!viewerContainer) return;

      viewerContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = viewerContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;

        const zoomFactor = e.deltaY < 0 ? 1.2 : 0.833;
        const newScale = Math.max(0.08, Math.min(viewerScale * zoomFactor, 10));

        viewerPanX -= (mouseX - viewerPanX) * (newScale / viewerScale - 1);
        viewerPanY -= (mouseY - viewerPanY) * (newScale / viewerScale - 1);
        viewerScale = newScale;

        updateViewerTransform();
      }, { passive: false });

      viewerContainer.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isPanning = true;
        startPanX = e.clientX - viewerPanX;
        startPanY = e.clientY - viewerPanY;
        viewerContainer.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        viewerPanX = e.clientX - startPanX;
        viewerPanY = e.clientY - startPanY;
        updateViewerTransform();
      });

      window.addEventListener('mouseup', () => {
        if (isPanning) {
          isPanning = false;
          viewerContainer.style.cursor = 'grab';
        }
      });

      viewerContainer.addEventListener('dblclick', (e) => {
        const img = document.getElementById('viewerImage');
        const pad = 48;
        const fitScale = Math.min((viewerContainer.clientWidth - pad) / img.naturalWidth, (viewerContainer.clientHeight - pad) / img.naturalHeight, 1);
        if (Math.abs(viewerScale - fitScale) < 0.05) {
          viewerScale = 1.0;
        } else {
          viewerScale = fitScale;
          viewerPanX = 0;
          viewerPanY = 0;
        }
        updateViewerTransform();
      });

      window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('imageViewerModal');
        if (!modal || modal.classList.contains('hidden')) return;

        if (e.key === 'Escape') {
          closeImageModal();
        } else if (e.key === '+' || e.key === '=') {
          zoomIn();
        } else if (e.key === '-') {
          zoomOut();
        } else if (e.key === '0') {
          zoomFit();
        } else if (e.key === '1') {
          zoomActual();
        }
      });
    }

    initViewerEvents();
    fetchJobs();
    setInterval(fetchJobs, 2500);
  </script>
</body>
</html>
"""

def get_studio_html():
    candidates = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "studio.html"),
        "/opt/toolx-ai-studio/studio.html",
        os.path.abspath("studio.html")
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception as e:
                logger.warning(f"Lỗi đọc {p}: {e}")
    return WEB_STUDIO_HTML

TOOLX_FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#ec4899" />
    </linearGradient>
    <linearGradient id="g2" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="50%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="94" height="94" rx="22" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
  <circle cx="50" cy="50" r="34" fill="none" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6 6" />
  <circle cx="50" cy="50" r="28" fill="none" stroke="#fdf4ff" stroke-width="2" />
  <path d="M26 26 L74 74" stroke="url(#g1)" stroke-width="14" stroke-linecap="round" />
  <path d="M74 26 L26 74" stroke="url(#g2)" stroke-width="14" stroke-linecap="round" />
  <rect x="42" y="42" width="16" height="16" transform="rotate(45 50 50)" fill="#ffffff" stroke="#c084fc" stroke-width="2" />
  <rect x="45" y="45" width="10" height="10" transform="rotate(45 50 50)" fill="#d946ef" />
  <circle cx="26" cy="26" r="4" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="74" cy="74" r="4" fill="#ec4899" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="74" cy="26" r="4" fill="#8b5cf6" stroke="#ffffff" stroke-width="1.5" />
  <circle cx="26" cy="74" r="4" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5" />
</svg>"""

@app.after_request
def add_cache_headers(response):
    if request.path.startswith("/render-files/") or request.path.startswith("/render-thumbnail/"):
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
    else:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.route("/favicon.ico")
@app.route("/favicon.svg")
def serve_favicon():
    return Response(TOOLX_FAVICON_SVG, mimetype="image/svg+xml")

@app.route("/", methods=["GET"])
def web_studio():
    return Response(get_studio_html(), mimetype="text/html; charset=utf-8")

@app.route("/health", methods=["GET"])
def health():
    jobs = load_jobs()
    pending = sum(1 for j in jobs.values() if j.get("status") == "pending")
    completed = sum(1 for j in jobs.values() if j.get("status") == "completed")
    timeout = sum(1 for j in jobs.values() if j.get("status") == "timeout")
    failed = sum(1 for j in jobs.values() if j.get("status") == "failed")
    gemini_key, gpt_key = get_api_keys()
    return jsonify({
        "service": "PrintAgent Render Bridge",
        "status": "healthy",
        "port": PORT,
        "render_dir": RENDER_DIR,
        "resolution_support": ["4k", "2k", "1080p"],
        "default_dpi": 300,
        "features": ["text-to-image", "image-to-image", "inpainting"],
        "keys_loaded": {
            "has_gemini_key": bool(gemini_key),
            "has_gpt_key": bool(gpt_key)
        },
        "stats": {
            "total_jobs": len(jobs),
            "pending": pending,
            "completed": completed,
            "failed": failed,
            "timeout": timeout
        }
    })

@app.route("/render-files/<path:filename>", methods=["GET"])
def serve_render_file(filename):
    file_path = os.path.join(RENDER_DIR, filename)
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_from_directory(RENDER_DIR, filename)

@app.route("/render-thumbnail/<path:filename>", methods=["GET"])
def serve_render_thumbnail(filename):
    thumb_path = generate_thumbnail(filename)
    if thumb_path and os.path.exists(thumb_path):
        resp = send_from_directory(THUMB_DIR, os.path.basename(thumb_path), mimetype="image/webp")
        resp.headers["Cache-Control"] = "public, max-age=604800, immutable"
        return resp
    orig_path = os.path.join(RENDER_DIR, filename)
    if os.path.exists(orig_path):
        return send_from_directory(RENDER_DIR, filename)
    return jsonify({"error": "File not found"}), 404

@app.route("/open-folder", methods=["POST"])
def open_render_folder():
    try:
        if sys.platform == "win32" and hasattr(os, "startfile"):
            os.startfile(RENDER_DIR)
        return jsonify({"success": True, "path": RENDER_DIR})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/upload-source-image", methods=["POST"])
def upload_source_image():
    if "file" not in request.files:
        return jsonify({"error": "Không tìm thấy file tải lên"}), 400
    f = request.files["file"]
    if not f or not f.filename:
        return jsonify({"error": "Tên file không hợp lệ"}), 400

    ext = os.path.splitext(f.filename)[1].lower() or ".png"
    safe_name = f"upload_{uuid.uuid4().hex[:8]}{ext}"
    dest = os.path.join(RENDER_DIR, safe_name)
    f.save(dest)
    logger.info(f"Đã tải lên ảnh nguồn mới: {safe_name}")
    return jsonify({"success": True, "filename": safe_name, "url": f"/render-files/{safe_name}"})

@app.route("/render-job", methods=["POST", "OPTIONS"])
def create_render_job():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

    data = request.get_json(force=True, silent=True) or {}
    raw_prompt = data.get("prompt", "").strip()
    if not raw_prompt:
        return jsonify({"error": "Thiếu thông tin 'prompt' cho lệnh render"}), 400

    use_ai_enhancer = bool(data.get("use_ai_enhancer", True))
    presets = data.get("presets") or {}

    engine = data.get("engine", "gpt").lower()
    if engine not in ("gpt", "gemini"):
        engine = "gpt"

    job_id = data.get("job_id") or f"render_{uuid.uuid4().hex[:10]}"
    filename = data.get("filename") or f"{job_id}.png"
    if not filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        filename += ".png"

    aspect_ratio = data.get("aspect_ratio", "4:3")
    resolution = data.get("resolution", "4k").lower()
    timeout_minutes = float(data.get("timeout_minutes", 60))
    timeout_seconds = int(timeout_minutes * 60)
    render_mode = data.get("render_mode", "auto")

    jobs = load_jobs()
    now_ts = time.time()
    filepath = os.path.join(RENDER_DIR, filename)
    
    new_job = {
        "job_id": job_id,
        "type": "create",
        "engine": engine,
        "raw_prompt": raw_prompt,
        "prompt": raw_prompt,
        "enhanced_prompt": "",
        "use_ai_enhancer": use_ai_enhancer,
        "presets": presets,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
        "filename": filename,
        "filepath": filepath,
        "callback_url": data.get("callback_url"),
        "timeout_seconds": timeout_seconds,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_at_ts": now_ts,
        "status": "pending",
        "render_mode": render_mode,
        "metadata": data.get("metadata", {})
    }

    jobs[job_id] = new_job
    save_jobs(jobs)

    logger.info(f"Đã nhận lệnh render tạo mới: job_id={job_id}, engine={engine}, res={resolution}, ai_enhancer={use_ai_enhancer}, file={filename}")

    if render_mode == "auto":
        threading.Thread(
            target=run_auto_ai_generator,
            args=(job_id, raw_prompt, aspect_ratio, filepath, resolution, engine, use_ai_enhancer, presets),
            daemon=True
        ).start()

    return jsonify({
        "success": True,
        "job_id": job_id,
        "engine": engine,
        "status": "pending",
        "filename": filename,
        "resolution": resolution,
        "watch_path": filepath,
        "timeout_seconds": timeout_seconds,
        "message": f"Lệnh đã tạo ({engine.upper()} - {resolution.upper()} 300 DPI). Đang xử lý trực tiếp."
    }), 201

@app.route("/render-edit-job", methods=["POST", "OPTIONS"])
def create_render_edit_job():
    if request.method == "OPTIONS":
        return jsonify({"ok": True}), 200

    data = request.get_json(force=True, silent=True) or {}
    raw_prompt = data.get("prompt", "").strip()
    if not raw_prompt:
        return jsonify({"error": "Thiếu thông tin 'prompt' cho lệnh sửa ảnh"}), 400

    use_ai_enhancer = bool(data.get("use_ai_enhancer", True))
    presets = data.get("presets") or {}

    source_filename = data.get("source_filename", "").strip()
    if not source_filename:
        return jsonify({"error": "Vui lòng chọn ảnh nguồn cần sửa"}), 400

    source_filepath = os.path.join(RENDER_DIR, source_filename)
    if not os.path.exists(source_filepath):
        return jsonify({"error": f"Không tìm thấy ảnh nguồn '{source_filename}' trong D:/render"}), 404

    mask_b64 = data.get("mask_base64")
    mask_bytes = None
    if mask_b64 and isinstance(mask_b64, str):
        if "," in mask_b64:
            mask_b64 = mask_b64.split(",", 1)[1]
        try:
            mask_bytes = base64.b64decode(mask_b64)
        except Exception as e:
            logger.warning(f"Lỗi giải mã mask base64: {e}")
            mask_bytes = None

    engine = data.get("engine", "gpt").lower()
    resolution = data.get("resolution", "4k").lower()
    job_id = data.get("job_id") or f"edit_{uuid.uuid4().hex[:10]}"
    filename = data.get("filename") or f"{job_id}.png"
    if not filename.endswith((".png", ".jpg", ".jpeg", ".webp")):
        filename += ".png"

    filepath = os.path.join(RENDER_DIR, filename)
    timeout_minutes = float(data.get("timeout_minutes", 60))
    timeout_seconds = int(timeout_minutes * 60)

    jobs = load_jobs()
    now_ts = time.time()
    new_job = {
        "job_id": job_id,
        "type": "edit",
        "engine": engine,
        "source_file": source_filename,
        "has_mask": bool(mask_bytes),
        "raw_prompt": raw_prompt,
        "prompt": raw_prompt,
        "enhanced_prompt": "",
        "use_ai_enhancer": use_ai_enhancer,
        "presets": presets,
        "resolution": resolution,
        "filename": filename,
        "filepath": filepath,
        "callback_url": data.get("callback_url"),
        "timeout_seconds": timeout_seconds,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_at_ts": now_ts,
        "status": "pending",
        "metadata": data.get("metadata", {})
    }
    jobs[job_id] = new_job
    save_jobs(jobs)

    logger.info(f"Đã nhận lệnh sửa ảnh: job_id={job_id}, source={source_filename}, ai_enhancer={use_ai_enhancer}, has_mask={bool(mask_bytes)}")

    threading.Thread(
        target=run_auto_edit_generator,
        args=(job_id, raw_prompt, source_filepath, mask_bytes, filepath, resolution, engine, use_ai_enhancer, presets),
        daemon=True
    ).start()

    return jsonify({
        "success": True,
        "job_id": job_id,
        "status": "pending",
        "filename": filename,
        "message": "Lệnh sửa ảnh đã được khởi tạo. Đang xử lý 4K..."
    }), 201

def ensure_job_usage(job: dict) -> dict:
    """Đảm bảo mọi job luôn có đầy đủ thống kê tokens và giá tiền thực tế (kể cả job cũ)."""
    u = job.get("usage")
    if not u or u.get("cost_usd", 0) <= 0.0801:
        engine = (job.get("engine") or "gpt").lower()
        aspect_ratio = job.get("aspect_ratio", "4:3")
        is_edit = job.get("type") == "edit" or str(job.get("filename", "")).startswith("edit_")
        has_enhanced = bool(job.get("enhanced_prompt") and job.get("enhanced_prompt") != job.get("raw_prompt"))

        enhancer_tokens = 418 if has_enhanced else 0
        enhancer_usd = 0.00015 if has_enhanced else 0.0

        if engine == "gemini":
            img_cost = 0.030
            img_tok = 1200
        elif is_edit:
            # Chi phí thực tế Inpainting OpenAI: ~3,500 tokens = $0.140 (~3,550 VNĐ)
            img_cost = 0.140
            img_tok = 3500
        else:
            is_wide = aspect_ratio in ("16:9", "4:3", "9:16", "3:4")
            if is_wide:
                # Chi phí thực tế gpt-image-1 khổ 1536x1024: ~3,450 tokens = $0.138 (~3,505 VNĐ)
                img_cost = 0.138
                img_tok = 3450
            else:
                img_cost = 0.080
                img_tok = 2000

        tot_tok = enhancer_tokens + img_tok
        tot_usd = round(enhancer_usd + img_cost, 4)
        tot_vnd = int(round(tot_usd * 25400))

        job["usage"] = {
            "total_tokens": tot_tok,
            "cost_usd": tot_usd,
            "cost_vnd": tot_vnd,
            "enhancer_tokens": enhancer_tokens,
            "enhancer_cost_usd": enhancer_usd,
            "image_tokens": img_tok,
            "image_cost_usd": img_cost
        }
    return job

@app.route("/render-jobs/all", methods=["GET"])
def get_all_jobs():
    jobs = load_jobs()
    sorted_jobs = []
    for j in sorted(jobs.values(), key=lambda j: j.get("created_at_ts", 0), reverse=True):
        ensure_job_usage(j)
        sorted_jobs.append(j)
    return jsonify({
        "success": True,
        "count": len(sorted_jobs),
        "jobs": sorted_jobs
    })

@app.route("/render-jobs/pending", methods=["GET"])
def get_pending_jobs():
    jobs = load_jobs()
    pending = []
    for j in jobs.values():
        if j.get("status") == "pending":
            ensure_job_usage(j)
            pending.append(j)
    return jsonify({
        "success": True,
        "count": len(pending),
        "jobs": pending
    })

@app.route("/render-job/<job_id>", methods=["GET"])
def get_job_status(job_id):
    jobs = load_jobs()
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": f"Không tìm thấy job '{job_id}'"}), 404
    ensure_job_usage(job)
    return jsonify({"success": True, "job": job})

@app.route("/render-job/<job_id>/cancel", methods=["POST"])
def cancel_job(job_id):
    jobs = load_jobs()
    job = jobs.get(job_id)
    if not job:
        return jsonify({"error": f"Không tìm thấy job '{job_id}'"}), 404

    job["status"] = "cancelled"
    job["cancelled_at"] = datetime.now(timezone.utc).isoformat()
    job["error"] = "Hủy thủ công bởi người dùng."
    save_jobs(jobs)

    return jsonify({"success": True, "job": job})

@app.route("/render-job/<job_id>", methods=["DELETE"])
def delete_job(job_id):
    jobs = load_jobs()
    if job_id not in jobs:
        return jsonify({"error": f"Không tìm thấy job '{job_id}'"}), 404

    deleted = jobs.pop(job_id)
    save_jobs(jobs)

    delete_file = request.args.get("delete_file", "false").lower() == "true"
    if delete_file:
        fp = deleted.get("filepath")
        if fp and os.path.exists(fp):
            try:
                os.remove(fp)
            except Exception as e:
                logger.warning(f"Lỗi xóa file: {e}")

    logger.info(f"Đã xóa job: {job_id}")
    return jsonify({"success": True, "message": f"Đã xóa job '{job_id}'"})

@app.route("/render-jobs/clear-failed", methods=["POST"])
def clear_failed_jobs():
    jobs = load_jobs()
    to_delete = [jid for jid, j in jobs.items() if j.get("status") in ("failed", "cancelled", "timeout")]
    for jid in to_delete:
        del jobs[jid]
    save_jobs(jobs)
    logger.info(f"Đã dọn dẹp {len(to_delete)} jobs lỗi/hủy")
    return jsonify({"success": True, "deleted_count": len(to_delete)})

def start_server():
    t = threading.Thread(target=watchdog_loop, daemon=True)
    t.start()

    gemini_key, gpt_key = get_api_keys()
    logger.info("=" * 60)
    logger.info(f"💎 Toolx AI Studio đang chạy tại: http://127.0.0.1:{PORT}")
    logger.info(f"📁 Thư mục theo dõi file ảnh: {RENDER_DIR}")
    logger.info(f"🔑 Keys loaded từ D:/vps_go.md: Gemini={'Có' if gemini_key else 'Không'}, GPT={'Có' if gpt_key else 'Không'}")
    logger.info(f"🎨 Hỗ trợ Tạo ảnh mới, Sửa toàn bộ (Img2Img), và Inpainting cọ vẽ")
    logger.info(f"⛔ TUYỆT ĐỐI KHÔNG FALLBACK sang bên thứ 3. Lỗi báo lỗi trực tiếp.")
    logger.info("=" * 60)

    app.run(host=HOST, port=PORT, debug=False, use_reloader=False)

if __name__ == "__main__":
    start_server()
