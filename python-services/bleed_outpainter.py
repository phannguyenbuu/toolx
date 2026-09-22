"""
BleedOutpainter - CPU-optimized AI Outpainting for Print Bleed Expansion
Specialized for ID photos (ảnh thẻ học sinh/sinh viên), portraits, and print media.
Powered by LaMa (Large Mask Inpainting with Fast Fourier Convolutions).
"""

import os
import sys
import time
import urllib.request
import logging
from pathlib import Path
from typing import Union, Tuple, Optional, List

import numpy as np
from PIL import Image, ImageFilter
import torch
import cv2

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("BleedOutpainter")

# Default model download URLs (TorchScript format - ~205 MB)
MODEL_URLS = [
    "https://huggingface.co/fashn-ai/LaMa/resolve/main/big-lama.pt",
    "https://github.com/enesmsdn/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt",
]

DEFAULT_CACHE_DIR = Path(__file__).parent / "models"
DEFAULT_MODEL_PATH = DEFAULT_CACHE_DIR / "big-lama.pt"


def download_model(target_path: Path = DEFAULT_MODEL_PATH) -> Path:
    """Download the LaMa TorchScript model if not already present."""
    if target_path.exists() and target_path.stat().st_size > 100_000_000:
        return target_path

    target_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = target_path.with_suffix(".tmp")

    last_error = None
    for url in MODEL_URLS:
        try:
            logger.info(f"Downloading LaMa model from: {url}")
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )

            with urllib.request.urlopen(req, timeout=300) as response, open(temp_path, "wb") as out_file:
                total_size = int(response.headers.get("Content-Length", 0))
                downloaded = 0
                chunk_size = 1024 * 1024  # 1MB chunks
                start_time = time.time()

                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        pct = downloaded / total_size * 100
                        mb = downloaded / (1024 * 1024)
                        total_mb = total_size / (1024 * 1024)
                        elapsed = time.time() - start_time
                        speed = mb / elapsed if elapsed > 0 else 0
                        print(f"\rDownloading model: {mb:.1f}/{total_mb:.1f} MB ({pct:.1f}%) @ {speed:.1f} MB/s", end="", flush=True)

            print("\n")
            if temp_path.exists() and temp_path.stat().st_size > 100_000_000:
                temp_path.replace(target_path)
                logger.info(f"Model saved to: {target_path}")
                return target_path
            else:
                raise RuntimeError("Downloaded file is incomplete or too small")
        except Exception as e:
            logger.warning(f"Failed to download from {url}: {e}")
            last_error = e
            if temp_path.exists():
                temp_path.unlink()

    raise RuntimeError(f"Could not download LaMa model from any mirror: {last_error}")


class BleedOutpainter:
    """
    High-performance CPU Outpainter using LaMa TorchScript model.
    Designed for adding bleed margins (10% - 50% expansion) to ID photos and print materials.
    """

    def __init__(self, model_path: Optional[Union[str, Path]] = None, num_threads: Optional[int] = None):
        """
        Initialize the outpainter model on CPU.

        Args:
            model_path: Path to big-lama.pt model file. If None, auto-downloads.
            num_threads: CPU threads to use for PyTorch inference. If None, uses all available.
        """
        if model_path is None:
            self.model_path = download_model(DEFAULT_MODEL_PATH)
        else:
            self.model_path = Path(model_path)
            if not self.model_path.exists():
                self.model_path = download_model(self.model_path)

        if num_threads:
            torch.set_num_threads(num_threads)

        logger.info(f"Loading LaMa model on CPU (Torch threads: {torch.get_num_threads()})...")
        t0 = time.time()
        self.model = torch.jit.load(str(self.model_path), map_location="cpu")
        self.model.eval()
        logger.info(f"LaMa model loaded in {time.time() - t0:.2f}s")

    @torch.inference_mode()
    def _inpaint_tensor(self, img_np: np.ndarray, mask_np: np.ndarray) -> np.ndarray:
        """
        Run LaMa model on CPU numpy arrays.
        img_np: (H, W, 3) uint8 RGB
        mask_np: (H, W) uint8 with 255 for inpaint region, 0 for original
        Returns: (H, W, 3) uint8 RGB
        """
        orig_h, orig_w = img_np.shape[:2]

        # LaMa requires dimensions divisible by 8
        pad_h = (8 - (orig_h % 8)) % 8
        pad_w = (8 - (orig_w % 8)) % 8

        if pad_h > 0 or pad_w > 0:
            img_np = np.pad(img_np, ((0, pad_h), (0, pad_w), (0, 0)), mode="reflect")
            mask_np = np.pad(mask_np, ((0, pad_h), (0, pad_w)), mode="reflect")

        # Convert to tensors
        # Image: [1, 3, H, W], float32 [0.0, 1.0]
        img_t = torch.from_numpy(img_np).float().permute(2, 0, 1).unsqueeze(0) / 255.0
        # Mask: [1, 1, H, W], float32 {0.0, 1.0}
        mask_t = (torch.from_numpy(mask_np).float().unsqueeze(0).unsqueeze(0) > 0.5).float()

        # Run model inference on CPU
        out_t = self.model(img_t, mask_t)

        # Convert back to uint8 RGB
        out_np = (out_t[0].permute(1, 2, 0).clamp(0, 1).numpy() * 255.0).astype(np.uint8)

        # Crop back to original dimensions if padded for divisibility
        if pad_h > 0 or pad_w > 0:
            out_np = out_np[:orig_h, :orig_w, :]

        return out_np

    def outpaint(
        self,
        image: Union[str, Path, Image.Image, np.ndarray],
        bleed_percent: float = 0.30,
        pad_ratios: Optional[Tuple[float, float, float, float]] = None,
        pad_pixels: Optional[Tuple[int, int, int, int]] = None,
        pre_fill_method: str = "reflect",
        feather_edge: int = 3,
        preserve_center: bool = True
    ) -> Image.Image:
        """
        Expand image outwards (outpaint bleed) to prevent die-cutting clipping.

        Args:
            image: Input image (file path, PIL Image, or uint8 RGB numpy array).
            bleed_percent: Overall expansion percentage (e.g. 0.30 = 30% expansion, split equally ~15% each side).
            pad_ratios: Optional specific (top, right, bottom, left) ratios, e.g. (0.15, 0.15, 0.15, 0.15).
            pad_pixels: Optional specific (top, right, bottom, left) pixels.
            pre_fill_method: How to prefill bleed area before AI pass:
                - "reflect": cv2.BORDER_REFLECT_101 (best for natural gradient & textures)
                - "replicate": cv2.BORDER_REPLICATE (edge clamping)
                - "wrap": cv2.BORDER_WRAP
            feather_edge: Pixel width of seamless blending border between original and outpainted area.
            preserve_center: If True, paste 100% untouched original photo in the center to preserve sharpness.

        Returns:
            PIL.Image containing the expanded image with seamless bleed.
        """
        # 1. Load image to numpy RGB
        if isinstance(image, (str, Path)):
            pil_img = Image.open(image).convert("RGB")
        elif isinstance(image, Image.Image):
            pil_img = image.convert("RGB")
        elif isinstance(image, np.ndarray):
            pil_img = Image.fromarray(image)
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")

        orig_w, orig_h = pil_img.size
        img_np = np.array(pil_img)

        # 2. Determine padding pixels (top, right, bottom, left)
        if pad_pixels is not None:
            pad_top, pad_right, pad_bottom, pad_left = pad_pixels
        elif pad_ratios is not None:
            r_top, r_right, r_bottom, r_left = pad_ratios
            pad_top = int(round(orig_h * r_top))
            pad_right = int(round(orig_w * r_right))
            pad_bottom = int(round(orig_h * r_bottom))
            pad_left = int(round(orig_w * r_left))
        else:
            # Distribute bleed_percent evenly (bleed_percent / 2 on each opposite side)
            half = bleed_percent / 2.0
            pad_top = int(round(orig_h * half))
            pad_bottom = int(round(orig_h * half))
            pad_left = int(round(orig_w * half))
            pad_right = int(round(orig_w * half))

        new_w = orig_w + pad_left + pad_right
        new_h = orig_h + pad_top + pad_bottom

        logger.info(f"Outpainting: {orig_w}x{orig_h} -> {new_w}x{new_h} (Bleed: T={pad_top}px, R={pad_right}px, B={pad_bottom}px, L={pad_left}px)")

        # 3. Create pre-filled canvas using OpenCV border extrapolation
        if pre_fill_method == "smart_portrait":
            # Smart portrait mode: Reflect top/left/right (for background/hair), Replicate bottom (for shirt/uniform)
            temp = cv2.copyMakeBorder(
                img_np,
                top=pad_top,
                bottom=0,
                left=pad_left,
                right=pad_right,
                borderType=cv2.BORDER_REFLECT_101
            )
            canvas_np = cv2.copyMakeBorder(
                temp,
                top=0,
                bottom=pad_bottom,
                left=0,
                right=0,
                borderType=cv2.BORDER_REPLICATE
            )
        else:
            border_modes = {
                "reflect": cv2.BORDER_REFLECT_101,
                "replicate": cv2.BORDER_REPLICATE,
                "wrap": cv2.BORDER_WRAP,
            }
            b_mode = border_modes.get(pre_fill_method, cv2.BORDER_REPLICATE)
            canvas_np = cv2.copyMakeBorder(
                img_np,
                top=pad_top,
                bottom=pad_bottom,
                left=pad_left,
                right=pad_right,
                borderType=b_mode
            )

        # 4. Create binary mask (0 = original image, 255 = bleed area to synthesize)
        mask_np = np.ones((new_h, new_w), dtype=np.uint8) * 255
        # The inner original region is 0
        inner_y1 = pad_top
        inner_y2 = pad_top + orig_h
        inner_x1 = pad_left
        inner_x2 = pad_left + orig_w
        mask_np[inner_y1:inner_y2, inner_x1:inner_x2] = 0

        # Overlap mask slightly into original image (feathering) to avoid harsh seams
        if feather_edge > 0:
            # Dilate mask inward into the original region by feather_edge pixels
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (feather_edge * 2 + 1, feather_edge * 2 + 1))
            dilated_mask = cv2.dilate(mask_np, kernel, iterations=1)
        else:
            dilated_mask = mask_np

        # 5. Run LaMa inference on CPU
        t_start = time.time()
        inpainted_np = self._inpaint_tensor(canvas_np, dilated_mask)
        logger.info(f"Inference completed in {time.time() - t_start:.2f}s")

        # 6. Preserve 100% original center (face, crisp details) with alpha blend at borders
        if preserve_center:
            # Create a soft alpha mask for smooth transition
            blend_mask = np.zeros((new_h, new_w), dtype=np.float32)
            blend_mask[inner_y1:inner_y2, inner_x1:inner_x2] = 1.0

            if feather_edge > 1:
                # Erode slightly and blur to get ultra-smooth transition
                erode_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (feather_edge * 2 + 1, feather_edge * 2 + 1))
                eroded = cv2.erode(blend_mask, erode_k, iterations=1)
                blend_mask = cv2.GaussianBlur(eroded, (feather_edge * 2 + 1, feather_edge * 2 + 1), 0)
            
            blend_mask_3d = blend_mask[:, :, np.newaxis]
            
            # Reconstruct original image on canvas for blending
            orig_canvas = np.zeros_like(inpainted_np)
            orig_canvas[inner_y1:inner_y2, inner_x1:inner_x2] = img_np

            final_np = (orig_canvas * blend_mask_3d + inpainted_np * (1.0 - blend_mask_3d)).astype(np.uint8)
        else:
            final_np = inpainted_np

        return Image.fromarray(final_np)

    def outpaint_for_print_card(
        self,
        image: Union[str, Path, Image.Image],
        bleed_mm: float = 3.0,
        dpi: int = 300,
        target_card_ratio: Optional[Tuple[float, float]] = None
    ) -> Image.Image:
        """
        Specialized helper for student cards / ID cards printing with physical bleed in mm.

        Args:
            image: Input image
            bleed_mm: Bleed margin in millimeters (typically 2mm - 4mm for card die-cutting)
            dpi: Resolution of image (standard 300 DPI for high quality ID printing)
            target_card_ratio: e.g. (3, 4) for 3x4cm or (4, 6) for 4x6cm or (85.6, 54.0) for standard CR80 ID card
        """
        # Calculate bleed in pixels: pixels = (mm / 25.4) * DPI
        bleed_px = int(round((bleed_mm / 25.4) * dpi))
        logger.info(f"Calculating bleed for {bleed_mm}mm at {dpi} DPI -> {bleed_px} pixels per side")

        return self.outpaint(
            image=image,
            pad_pixels=(bleed_px, bleed_px, bleed_px, bleed_px),
            pre_fill_method="smart_portrait",
            feather_edge=3,
            preserve_center=True
        )

    def process_folder(
        self,
        input_dir: Union[str, Path],
        output_dir: Union[str, Path],
        bleed_percent: float = 0.30,
        bleed_mm: Optional[float] = None,
        dpi: int = 300,
        pre_fill_method: str = "smart_portrait",
    ) -> List[Path]:
        """Process all images in a folder in batch."""
        in_dir = Path(input_dir)
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
        image_files = [f for f in in_dir.iterdir() if f.is_file() and f.suffix.lower() in valid_exts]

        results = []
        total = len(image_files)
        logger.info(f"Found {total} images to process in {in_dir}")

        for idx, img_path in enumerate(image_files, 1):
            out_file = out_dir / f"{img_path.stem}_bleed{img_path.suffix}"
            t0 = time.time()
            try:
                if bleed_mm is not None:
                    res = self.outpaint_for_print_card(img_path, bleed_mm=bleed_mm, dpi=dpi)
                else:
                    res = self.outpaint(img_path, bleed_percent=bleed_percent, pre_fill_method=pre_fill_method)
                res.save(out_file, quality=95)
                results.append(out_file)
                logger.info(f"[{idx}/{total}] Processed {img_path.name} in {time.time() - t0:.2f}s -> {out_file.name}")
            except Exception as e:
                logger.error(f"[{idx}/{total}] Failed to process {img_path.name}: {e}")

        return results


# Global singleton instance for server/API reuse
_GLOBAL_OUTPAINTER: Optional[BleedOutpainter] = None

def get_bleed_outpainter(num_threads: Optional[int] = None) -> BleedOutpainter:
    global _GLOBAL_OUTPAINTER
    if _GLOBAL_OUTPAINTER is None:
        _GLOBAL_OUTPAINTER = BleedOutpainter(num_threads=num_threads)
    return _GLOBAL_OUTPAINTER


# Command Line Interface (CLI)
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AI Bleed Outpainter for ID photos (CPU)")
    parser.add_argument("input", help="Path to input image file OR directory")
    parser.add_argument("-o", "--output", help="Path to output file or directory")
    parser.add_argument("-p", "--percent", type=float, default=0.30, help="Bleed expansion percent (default: 0.30 for 30%%)")
    parser.add_argument("--bleed-mm", type=float, default=None, help="Bleed in mm (e.g. 3.0 for 3mm)")
    parser.add_argument("--dpi", type=int, default=300, help="DPI for mm calculation (default: 300)")
    parser.add_argument("--mode", choices=["smart_portrait", "reflect", "replicate"], default="smart_portrait", help="Pre-fill extrapolation mode")
    parser.add_argument("--threads", type=int, default=None, help="CPU threads to use")

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Path not found: {input_path}")
        sys.exit(1)

    print("=" * 60)
    print("AI CPU BLEED OUTPAINTER (LaMa Engine)")
    print("=" * 60)

    outpainter = get_bleed_outpainter(num_threads=args.threads)

    if input_path.is_dir():
        out_dir = Path(args.output) if args.output else input_path / "outpainted"
        outpainter.process_folder(
            input_dir=input_path,
            output_dir=out_dir,
            bleed_percent=args.percent,
            bleed_mm=args.bleed_mm,
            dpi=args.dpi,
            pre_fill_method=args.mode
        )
        print(f"\n[OK] Batch processing completed. Results in: {out_dir}")
    else:
        out_path = Path(args.output) if args.output else input_path.with_name(f"{input_path.stem}_bleed{input_path.suffix}")
        if args.bleed_mm is not None:
            result = outpainter.outpaint_for_print_card(input_path, bleed_mm=args.bleed_mm, dpi=args.dpi)
        else:
            result = outpainter.outpaint(input_path, bleed_percent=args.percent, pre_fill_method=args.mode)

        result.save(out_path, quality=95)
        print(f"\n[OK] Successfully saved outpainted image to: {out_path}")
