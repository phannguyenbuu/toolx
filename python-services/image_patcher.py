"""
ImagePatcher - AI-powered image inpainting using LaMa model
Uses iopaint library for local CPU processing
"""

import os
import numpy as np
from PIL import Image
from typing import List, Tuple, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ImagePatcher:
    """
    A class to perform image inpainting using the LaMa model.
    Optimized for CPU processing with small regions (~3mm).
    
    Usage:
        patcher = ImagePatcher()
        result = patcher.process_image("input.jpg", [(10, 20, 50, 60), ...])
        # or
        patcher.process_image("input.jpg", boxes, output_path="output.jpg")
    """
    
    def __init__(self, device: str = "cpu"):
        """
        Initialize the ImagePatcher with LaMa model.
        
        Args:
            device: Device to run inference on ("cpu" or "cuda")
        """
        self.device = device
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load the LaMa model using iopaint."""
        try:
            from iopaint.model_manager import ModelManager
            from iopaint.schema import InpaintRequest, HDStrategy
            
            logger.info("Loading LaMa model for CPU inference...")
            
            # Initialize model manager with LaMa
            self.model_manager = ModelManager(
                name="lama",
                device=self.device,
                disable_nsfw=True,
                sd_cpu_textencoder=True,
            )
            
            # Store schema classes for later use
            self.InpaintRequest = InpaintRequest
            self.HDStrategy = HDStrategy
            
            logger.info("LaMa model loaded successfully!")
            
        except ImportError as e:
            logger.error(f"Failed to import iopaint: {e}")
            logger.error("Please install iopaint: pip install iopaint")
            raise
        except Exception as e:
            logger.error(f"Failed to load LaMa model: {e}")
            raise
    
    def create_mask(
        self, 
        image_size: Tuple[int, int], 
        boxes: List[Tuple[int, int, int, int]],
        expand_pixels: int = 2
    ) -> np.ndarray:
        """
        Create a binary mask from bounding boxes.
        
        Args:
            image_size: (width, height) of the image
            boxes: List of bounding boxes as (x1, y1, x2, y2)
            expand_pixels: Pixels to expand each box for better inpainting
            
        Returns:
            Binary mask as numpy array (H, W) with 255 for regions to inpaint
        """
        width, height = image_size
        mask = np.zeros((height, width), dtype=np.uint8)
        
        for box in boxes:
            x1, y1, x2, y2 = box
            
            # Expand box slightly for better blending
            x1 = max(0, x1 - expand_pixels)
            y1 = max(0, y1 - expand_pixels)
            x2 = min(width, x2 + expand_pixels)
            y2 = min(height, y2 + expand_pixels)
            
            # Fill the region with white (255 = area to inpaint)
            mask[y1:y2, x1:x2] = 255
        
        return mask
    
    def process_image(
        self,
        image_path: str,
        boxes: List[Tuple[int, int, int, int]],
        output_path: Optional[str] = None,
        expand_pixels: int = 2
    ) -> Image.Image:
        """
        Process an image by inpainting the specified regions.
        
        Args:
            image_path: Path to the input image
            boxes: List of 4 bounding boxes as (x1, y1, x2, y2) coordinates
            output_path: Optional path to save the result
            expand_pixels: Pixels to expand each box for better blending
            
        Returns:
            Processed PIL Image
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")
        
        if not boxes:
            logger.warning("No boxes provided, returning original image")
            return Image.open(image_path)
        
        logger.info(f"Processing image: {image_path}")
        logger.info(f"Inpainting {len(boxes)} regions: {boxes}")
        
        # Load image
        image = Image.open(image_path).convert("RGB")
        image_np = np.array(image)
        
        # Create mask from boxes
        mask = self.create_mask(image.size, boxes, expand_pixels)
        
        # Check if mask has any regions to inpaint
        if mask.max() == 0:
            logger.warning("Mask is empty, returning original image")
            return image
        
        # Process with LaMa
        try:
            result = self._inpaint(image_np, mask)
        except Exception as e:
            logger.error(f"Inpainting failed: {e}")
            raise
        
        # Convert result to PIL Image
        result_image = Image.fromarray(result)
        
        # Save if output path provided
        if output_path:
            result_image.save(output_path, quality=95)
            logger.info(f"Saved result to: {output_path}")
        
        return result_image
    
    def _inpaint(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Perform inpainting using the LaMa model.
        
        Args:
            image: Input image as numpy array (H, W, 3)
            mask: Binary mask as numpy array (H, W)
            
        Returns:
            Inpainted image as numpy array
        """
        # For small regions, we can process directly without HD strategy
        # This is more efficient for CPU
        
        # Create inpaint request
        # iopaint expects mask to be same shape as image for direct processing
        
        result = self.model_manager(image, mask)
        
        return result
    
    def process_image_pil(
        self,
        image: Image.Image,
        boxes: List[Tuple[int, int, int, int]],
        expand_pixels: int = 2
    ) -> Image.Image:
        """
        Process a PIL Image directly (without file I/O).
        
        Args:
            image: Input PIL Image
            boxes: List of bounding boxes as (x1, y1, x2, y2)
            expand_pixels: Pixels to expand each box
            
        Returns:
            Processed PIL Image
        """
        if not boxes:
            return image
        
        image_rgb = image.convert("RGB")
        image_np = np.array(image_rgb)
        
        mask = self.create_mask(image.size, boxes, expand_pixels)
        
        if mask.max() == 0:
            return image
        
        result = self._inpaint(image_np, mask)
        return Image.fromarray(result)
    
    def process_batch(
        self,
        image_paths: List[str],
        boxes_list: List[List[Tuple[int, int, int, int]]],
        output_dir: str,
        expand_pixels: int = 2
    ) -> List[str]:
        """
        Process multiple images in batch.
        
        Args:
            image_paths: List of input image paths
            boxes_list: List of box lists, one per image
            output_dir: Directory to save results
            expand_pixels: Pixels to expand each box
            
        Returns:
            List of output file paths
        """
        if len(image_paths) != len(boxes_list):
            raise ValueError("Number of images must match number of box lists")
        
        os.makedirs(output_dir, exist_ok=True)
        output_paths = []
        
        for i, (image_path, boxes) in enumerate(zip(image_paths, boxes_list)):
            filename = os.path.basename(image_path)
            name, ext = os.path.splitext(filename)
            output_path = os.path.join(output_dir, f"{name}_patched{ext}")
            
            self.process_image(image_path, boxes, output_path, expand_pixels)
            output_paths.append(output_path)
            
            logger.info(f"Processed {i+1}/{len(image_paths)}: {filename}")
        
        return output_paths


# Alternative lightweight implementation using OpenCV inpainting
# (fallback if iopaint is not available)
class ImagePatcherCV:
    """
    Fallback image patcher using OpenCV's inpainting algorithms.
    Faster but lower quality than LaMa.
    """
    
    def __init__(self, method: str = "telea"):
        """
        Initialize OpenCV-based patcher.
        
        Args:
            method: "telea" (fast) or "ns" (Navier-Stokes, better quality)
        """
        try:
            import cv2
            self.cv2 = cv2
        except ImportError:
            raise ImportError("OpenCV not found. Install with: pip install opencv-python")
        
        self.method = cv2.INPAINT_TELEA if method == "telea" else cv2.INPAINT_NS
        self.inpaint_radius = 3
    
    def create_mask(
        self, 
        image_size: Tuple[int, int], 
        boxes: List[Tuple[int, int, int, int]],
        expand_pixels: int = 2
    ) -> np.ndarray:
        """Create binary mask from boxes."""
        width, height = image_size
        mask = np.zeros((height, width), dtype=np.uint8)
        
        for box in boxes:
            x1, y1, x2, y2 = box
            x1 = max(0, x1 - expand_pixels)
            y1 = max(0, y1 - expand_pixels)
            x2 = min(width, x2 + expand_pixels)
            y2 = min(height, y2 + expand_pixels)
            mask[y1:y2, x1:x2] = 255
        
        return mask
    
    def process_image(
        self,
        image_path: str,
        boxes: List[Tuple[int, int, int, int]],
        output_path: Optional[str] = None,
        expand_pixels: int = 2
    ) -> Image.Image:
        """Process image using OpenCV inpainting."""
        image = self.cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f"Could not read image: {image_path}")
        
        h, w = image.shape[:2]
        mask = self.create_mask((w, h), boxes, expand_pixels)
        
        if mask.max() == 0:
            return Image.fromarray(self.cv2.cvtColor(image, self.cv2.COLOR_BGR2RGB))
        
        result = self.cv2.inpaint(image, mask, self.inpaint_radius, self.method)
        result_rgb = self.cv2.cvtColor(result, self.cv2.COLOR_BGR2RGB)
        result_image = Image.fromarray(result_rgb)
        
        if output_path:
            result_image.save(output_path, quality=95)
        
        return result_image
    
    def _inpaint(self, image: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """
        Perform inpainting using OpenCV.
        
        Args:
            image: Input image as numpy array (H, W, 3) RGB
            mask: Binary mask as numpy array (H, W)
            
        Returns:
            Inpainted image as numpy array RGB
        """
        # Convert RGB to BGR for OpenCV
        image_bgr = self.cv2.cvtColor(image, self.cv2.COLOR_RGB2BGR)
        
        # Inpaint
        result_bgr = self.cv2.inpaint(image_bgr, mask, self.inpaint_radius, self.method)
        
        # Convert back to RGB
        result_rgb = self.cv2.cvtColor(result_bgr, self.cv2.COLOR_BGR2RGB)
        
        return result_rgb


def get_patcher(use_lama: bool = True, device: str = "cpu"):
    """
    Factory function to get the appropriate patcher.
    
    Args:
        use_lama: If True, try to use LaMa model; fallback to OpenCV if unavailable
        device: Device for LaMa model
        
    Returns:
        ImagePatcher or ImagePatcherCV instance
    """
    if use_lama:
        try:
            return ImagePatcher(device=device)
        except Exception as e:
            logger.warning(f"LaMa not available ({e}), falling back to OpenCV")
            return ImagePatcherCV()
    else:
        return ImagePatcherCV()


# Example usage and testing
if __name__ == "__main__":
    import sys
    
    print("=" * 50)
    print("ImagePatcher - AI Image Inpainting Tool")
    print("=" * 50)
    
    # Test with sample data
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        
        # Example boxes (x1, y1, x2, y2) - 4 small regions
        # These would typically come from your application
        test_boxes = [
            (10, 10, 30, 30),    # Top-left corner
            (100, 10, 120, 30),  # Top-right area
            (10, 100, 30, 120),  # Bottom-left area
            (100, 100, 120, 120) # Bottom-right area
        ]
        
        print(f"\nProcessing: {image_path}")
        print(f"Boxes: {test_boxes}")
        
        try:
            # Try LaMa first, fallback to OpenCV
            patcher = get_patcher(use_lama=True, device="cpu")
            print(f"Using: {type(patcher).__name__}")
            
            output_path = image_path.rsplit('.', 1)[0] + "_patched.jpg"
            result = patcher.process_image(image_path, test_boxes, output_path)
            
            print(f"\n✅ Success! Output saved to: {output_path}")
            print(f"   Original size: {Image.open(image_path).size}")
            print(f"   Result size: {result.size}")
            
        except Exception as e:
            print(f"\n❌ Error: {e}")
            sys.exit(1)
    else:
        print("\nUsage: python image_patcher.py <image_path>")
        print("\nExample:")
        print("  python image_patcher.py test_image.jpg")
        print("\nThis will create test_image_patched.jpg with 4 sample regions inpainted.")
        
        # Check dependencies
        print("\n📦 Checking dependencies...")
        
        try:
            import iopaint
            print("  ✅ iopaint installed")
        except ImportError:
            print("  ❌ iopaint not installed (pip install iopaint)")
        
        try:
            import cv2
            print("  ✅ opencv-python installed")
        except ImportError:
            print("  ❌ opencv-python not installed (pip install opencv-python)")
        
        try:
            import torch
            print(f"  ✅ torch installed (CUDA: {torch.cuda.is_available()})")
        except ImportError:
            print("  ⚠️  torch not installed (required for LaMa)")
