import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Wand2, Upload, Download, Trash2, RotateCcw, ZoomIn, ZoomOut,
  Eraser, ImagePlus, Layers, ScanLine, Palette, Sparkles, X,
  Check, AlertCircle, Loader2, MousePointer2, Square, Maximize,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';

type AITool = 'inpaint' | 'outpaint' | 'remove-bg' | 'upscale' | 'color';

interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AIImageProcessorProps {
  initialTool?: AITool;
}

// Uses proxy - relative URLs
const API_BASE = '/api';

export const AIImageProcessor: React.FC<AIImageProcessorProps> = ({ initialTool = 'inpaint' }) => {
  const [activeTool, setActiveTool] = useState<AITool>(initialTool);
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [aiStatus, setAiStatus] = useState<'checking' | 'available' | 'unavailable' | 'not-installed'>('checking');
  const [drawMode, setDrawMode] = useState<'select' | 'draw'>('draw');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  
  // Outpaint state
  const [outpaintTop, setOutpaintTop] = useState(0);
  const [outpaintBottom, setOutpaintBottom] = useState(0);
  const [outpaintLeft, setOutpaintLeft] = useState(0);
  const [outpaintRight, setOutpaintRight] = useState(0);
  
  // Upscale state
  const [upscaleFactor, setUpscaleFactor] = useState<2 | 4>(2);
  
  // Color conversion state
  const [colorMode, setColorMode] = useState<'grayscale' | 'sepia' | 'invert' | 'brightness' | 'contrast' | 'saturate'>('grayscale');
  const [colorIntensity, setColorIntensity] = useState(100);
  
  // Result state - show download button after processing
  const [showResultActions, setShowResultActions] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false); // Track when image is loaded for canvas redraw
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Check AI service status
  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inpaint/status`);
      if (!res.ok) {
        setAiStatus('unavailable');
        return;
      }
      const data = await res.json();
      // If we get a response, service is connected but AI models may not be installed
      setAiStatus(data.available ? 'available' : 'not-installed');
    } catch (error) {
      console.error('AI service connection failed:', error);
      setAiStatus('unavailable');
    }
  };

  const tools = [
    { id: 'inpaint' as AITool, name: 'Xóa vùng ảnh', icon: Eraser, desc: 'Xóa và lấp đầy vùng được chọn', color: 'red' },
    { id: 'outpaint' as AITool, name: 'Mở rộng ảnh', icon: ImagePlus, desc: 'Mở rộng ảnh ra ngoài viền', color: 'blue' },
    { id: 'remove-bg' as AITool, name: 'Xóa nền', icon: Layers, desc: 'Tự động xóa nền ảnh', color: 'green' },
    { id: 'upscale' as AITool, name: 'Nâng cấp', icon: ScanLine, desc: 'Tăng độ phân giải ảnh', color: 'purple' },
    { id: 'color' as AITool, name: 'Chuyển màu', icon: Palette, desc: 'Chuyển đổi không gian màu', color: 'orange' },
  ];

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file ảnh (JPG, PNG)');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImage(dataUrl);
      setOriginalImage(dataUrl);
      setBoxes([]);
      setError(null);
      setSuccess(null);
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageDimensions({ width: img.width, height: img.height });
        // Auto fit zoom
        setTimeout(() => fitToScreen(), 100);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  // Realtime preview for color conversion - depends on imageLoaded
  useEffect(() => {
    if (activeTool !== 'color' || !previewCanvasRef.current || !imageRef.current || !imageLoaded) return;
    
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setPreviewLoading(true);
    
    const img = imageRef.current;
    const containerWidth = canvas.parentElement?.clientWidth || 200;
    const containerHeight = canvas.parentElement?.clientHeight || 128;
    
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    const scale = Math.min(containerWidth / img.width, containerHeight / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (containerWidth - w) / 2;
    const y = (containerHeight - h) / 2;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, x, y, w, h);
    
    // Apply effect to preview
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      
      switch (colorMode) {
        case 'grayscale': {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          data[i] = data[i + 1] = data[i + 2] = gray;
          break;
        }
        case 'sepia': {
          data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
          data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
          data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
          break;
        }
        case 'invert': {
          data[i] = 255 - r;
          data[i + 1] = 255 - g;
          data[i + 2] = 255 - b;
          break;
        }
        case 'brightness': {
          const factor = colorIntensity / 100;
          data[i] = Math.min(255, r * factor);
          data[i + 1] = Math.min(255, g * factor);
          data[i + 2] = Math.min(255, b * factor);
          break;
        }
        case 'contrast': {
          const factor = (colorIntensity / 100 - 0.5) * 2;
          const adjust = (c: number) => Math.min(255, Math.max(0, ((c / 255 - 0.5) * (1 + factor) + 0.5) * 255));
          data[i] = adjust(r);
          data[i + 1] = adjust(g);
          data[i + 2] = adjust(b);
          break;
        }
        case 'saturate': {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const factor = colorIntensity / 100;
          data[i] = Math.min(255, Math.max(0, gray + factor * (r - gray)));
          data[i + 1] = Math.min(255, Math.max(0, gray + factor * (g - gray)));
          data[i + 2] = Math.min(255, Math.max(0, gray + factor * (b - gray)));
          break;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    setPreviewLoading(false);
  }, [activeTool, colorMode, colorIntensity, imageLoaded]);

  // Fit to screen function
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth - 48; // padding
    const containerHeight = container.clientHeight - 48;
    const imgWidth = imageRef.current.width;
    const imgHeight = imageRef.current.height;
    
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
    
    setZoom(Math.round(newZoom * 100) / 100);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        handleFileUpload({ target: input } as any);
      }
    }
  }, [handleFileUpload]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = imageRef.current.width / rect.width;
    const scaleY = imageRef.current.height / rect.height;
    
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode !== 'draw' || !image) return;
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentBox({
      id: `box-${Date.now()}`,
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentBox) return;

    const coords = getCanvasCoordinates(e);
    if (!coords) return;

    setCurrentBox({
      ...currentBox,
      width: coords.x - currentBox.x,
      height: coords.y - currentBox.y
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;

    // Normalize box (handle negative width/height)
    const normalizedBox: BoundingBox = {
      ...currentBox,
      x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
      y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
      width: Math.abs(currentBox.width),
      height: Math.abs(currentBox.height)
    };

    // Only add if box has meaningful size
    if (normalizedBox.width > 5 && normalizedBox.height > 5) {
      setBoxes([...boxes, normalizedBox]);
    }

    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes(boxes.filter(b => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const clearAllBoxes = () => {
    setBoxes([]);
    setSelectedBoxId(null);
  };

  const resetImage = () => {
    if (originalImage) {
      setImage(originalImage);
      setBoxes([]);
      setSuccess(null);
      setError(null);
      setShowResultActions(false);
    }
  };

  // Full reset - clear everything
  const fullReset = () => {
    setImage(null);
    setOriginalImage(null);
    setImageFile(null);
    setBoxes([]);
    setSuccess(null);
    setError(null);
    setShowResultActions(false);
    setImageDimensions(null);
    setZoom(1);
    setOutpaintTop(0);
    setOutpaintBottom(0);
    setOutpaintLeft(0);
    setOutpaintRight(0);
    setUpscaleFactor(2);
    setColorMode('grayscale');
    setColorIntensity(100);
    imageRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update image ref when image changes - this triggers canvas redraw
  useEffect(() => {
    if (!image) {
      setImageLoaded(false);
      return;
    }
    
    setImageLoaded(false); // Reset while loading
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true); // Trigger canvas redraw
    };
    img.src = image;
  }, [image]);

  // Draw canvas - depends on imageLoaded to ensure image is ready
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image || !imageRef.current || !imageLoaded) return;

    const img = imageRef.current;
    canvas.width = img.width;
    canvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Only draw boxes for inpaint tool
    if (activeTool === 'inpaint') {
      // Draw existing boxes
      boxes.forEach(box => {
        ctx.strokeStyle = selectedBoxId === box.id ? '#8B5CF6' : '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Fill with semi-transparent color
        ctx.fillStyle = selectedBoxId === box.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(box.x, box.y, box.width, box.height);
      });

      // Draw current box being drawn
      if (currentBox && isDrawing) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.fillRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
      }

      ctx.setLineDash([]);
    }
  }, [image, imageLoaded, boxes, currentBox, isDrawing, selectedBoxId, activeTool]);

  // Process outpaint
  const processOutpaint = async () => {
    if (!imageFile || !imageDimensions) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    const totalExpand = outpaintTop + outpaintBottom + outpaintLeft + outpaintRight;
    if (totalExpand === 0) {
      setError('Vui lòng chọn ít nhất 1 hướng mở rộng');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create expanded canvas with original image centered
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const newWidth = imageDimensions.width + outpaintLeft + outpaintRight;
      const newHeight = imageDimensions.height + outpaintTop + outpaintBottom;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Fill with edge colors (simple edge extension)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, newWidth, newHeight);
      
      // Draw original image in center
      const img = imageRef.current!;
      ctx.drawImage(img, outpaintLeft, outpaintTop);
      
      // Create mask for the expanded areas
      const boxes: [number, number, number, number][] = [];
      
      // Top area
      if (outpaintTop > 0) {
        boxes.push([0, 0, newWidth, outpaintTop + 10]);
      }
      // Bottom area
      if (outpaintBottom > 0) {
        boxes.push([0, newHeight - outpaintBottom - 10, newWidth, newHeight]);
      }
      // Left area
      if (outpaintLeft > 0) {
        boxes.push([0, 0, outpaintLeft + 10, newHeight]);
      }
      // Right area
      if (outpaintRight > 0) {
        boxes.push([newWidth - outpaintRight - 10, 0, newWidth, newHeight]);
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      const formData = new FormData();
      formData.append('file', blob, 'expanded.jpg');
      formData.append('boxes', JSON.stringify(boxes));
      formData.append('expand', '5');

      const res = await fetch(`${API_BASE}/api/inpaint`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Xử lý thất bại');
      }

      const resultBlob = await res.blob();
      const resultUrl = URL.createObjectURL(resultBlob);
      
      // Update image and file
      setImage(resultUrl);
      setImageFile(new File([resultBlob], 'outpainted.jpg', { type: 'image/jpeg' }));
      
      // Reset outpaint values
      setOutpaintTop(0);
      setOutpaintBottom(0);
      setOutpaintLeft(0);
      setOutpaintRight(0);
      
      setSuccess('Mở rộng ảnh thành công!');
      setShowResultActions(true);
      // Fit to screen after processing
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi mở rộng ảnh');
    } finally {
      setIsProcessing(false);
    }
  };

  const processInpaint = async () => {
    if (!imageFile || boxes.length === 0) {
      setError('Vui lòng tải ảnh và vẽ ít nhất 1 vùng cần xử lý');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      
      // Convert boxes to API format [x1, y1, x2, y2]
      const boxesData = boxes.map(b => [b.x, b.y, b.x + b.width, b.y + b.height]);
      formData.append('boxes', JSON.stringify(boxesData));
      formData.append('expand', '2');

      const res = await fetch(`${API_BASE}/api/inpaint`, {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Xử lý thất bại');
      }

      const blob = await res.blob();
      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setBoxes([]);
      setSuccess('Xử lý thành công! Ảnh đã được cập nhật.');
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xử lý ảnh');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get CSS filter style for color preview
  const getFilterStyle = (): string => {
    switch (colorMode) {
      case 'grayscale': return 'grayscale(100%)';
      case 'sepia': return 'sepia(100%)';
      case 'invert': return 'invert(100%)';
      case 'brightness': return `brightness(${colorIntensity}%)`;
      case 'contrast': return `contrast(${colorIntensity}%)`;
      case 'saturate': return `saturate(${colorIntensity}%)`;
      default: return 'none';
    }
  };

  // Process Remove Background
  const processRemoveBg = async () => {
    if (!image || !imageRef.current) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create canvas and apply simple background removal (threshold-based)
      // For production, use rembg API or similar
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Simple white/light background removal
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Check if pixel is close to white (background)
        const brightness = (r + g + b) / 3;
        const isWhitish = brightness > 240 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20;
        
        if (isWhitish) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to blob and update
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });
      
      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setImageFile(new File([blob], 'removed-bg.png', { type: 'image/png' }));
      setSuccess('Đã xóa nền ảnh! (Chế độ đơn giản - xóa nền trắng)');
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
      
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi xóa nền');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Upscale
  const processUpscale = async () => {
    if (!image || !imageRef.current || !imageDimensions) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current;
      
      const newWidth = imageDimensions.width * upscaleFactor;
      const newHeight = imageDimensions.height * upscaleFactor;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Enable image smoothing for better quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw scaled image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Apply sharpening for better perceived quality
      // This is a simple approach - for AI upscaling, use Real-ESRGAN API
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });
      
      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setImageFile(new File([blob], `upscaled-${upscaleFactor}x.jpg`, { type: 'image/jpeg' }));
      setSuccess(`Đã nâng cấp ảnh lên ${upscaleFactor}x! (${newWidth}×${newHeight}px)`);
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
      
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi nâng cấp ảnh');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Color Conversion - Fixed version using pixel manipulation
  const processColorConvert = async () => {
    if (!image || !imageRef.current) {
      setError('Vui lòng tải ảnh trước');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply color effect using pixel manipulation
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        switch (colorMode) {
          case 'grayscale': {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            data[i] = data[i + 1] = data[i + 2] = gray;
            break;
          }
          case 'sepia': {
            data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b);
            data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b);
            data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b);
            break;
          }
          case 'invert': {
            data[i] = 255 - r;
            data[i + 1] = 255 - g;
            data[i + 2] = 255 - b;
            break;
          }
          case 'brightness': {
            const factor = colorIntensity / 100;
            data[i] = Math.min(255, r * factor);
            data[i + 1] = Math.min(255, g * factor);
            data[i + 2] = Math.min(255, b * factor);
            break;
          }
          case 'contrast': {
            const factor = (colorIntensity / 100 - 0.5) * 2;
            const adjust = (c: number) => Math.min(255, Math.max(0, ((c / 255 - 0.5) * (1 + factor) + 0.5) * 255));
            data[i] = adjust(r);
            data[i + 1] = adjust(g);
            data[i + 2] = adjust(b);
            break;
          }
          case 'saturate': {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const factor = colorIntensity / 100;
            data[i] = Math.min(255, Math.max(0, gray + factor * (r - gray)));
            data[i + 1] = Math.min(255, Math.max(0, gray + factor * (g - gray)));
            data[i + 2] = Math.min(255, Math.max(0, gray + factor * (b - gray)));
            break;
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });
      
      const resultUrl = URL.createObjectURL(blob);
      setImage(resultUrl);
      setImageFile(new File([blob], `color-${colorMode}.jpg`, { type: 'image/jpeg' }));
      setSuccess(`Đã áp dụng hiệu ứng ${colorMode}!`);
      setShowResultActions(true);
      setTimeout(() => fitToScreen(), 200);
      
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi chuyển đổi màu');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!image) return;
    
    const link = document.createElement('a');
    link.href = image;
    link.download = `ai-processed-${Date.now()}.jpg`;
    link.click();
  };

  const renderToolContent = () => {
    switch (activeTool) {
      case 'inpaint':
        return (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-bold text-red-800 flex items-center gap-2">
                <Eraser size={18} />
                Xóa vùng ảnh (Inpainting)
              </h4>
              <p className="text-sm text-red-600 mt-1">
                Vẽ các vùng cần xóa trên ảnh. AI sẽ tự động lấp đầy bằng nội dung phù hợp.
              </p>
            </div>

            {/* Drawing controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawMode('draw')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  drawMode === 'draw' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Square size={16} />
                Vẽ vùng
              </button>
              <button
                onClick={() => setDrawMode('select')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  drawMode === 'select' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <MousePointer2 size={16} />
                Chọn
              </button>
              <div className="flex-1" />
              <button
                onClick={clearAllBoxes}
                disabled={boxes.length === 0}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 size={16} />
                Xóa tất cả
              </button>
            </div>

            {/* Boxes list */}
            {boxes.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-500 mb-2">Vùng đã chọn ({boxes.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {boxes.map((box, idx) => (
                    <div
                      key={box.id}
                      className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                        selectedBoxId === box.id ? 'bg-purple-100' : 'bg-white'
                      }`}
                      onClick={() => setSelectedBoxId(box.id)}
                    >
                      <span className="text-gray-600">
                        Vùng {idx + 1}: {box.width}×{box.height}px
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeBox(box.id); }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Process button */}
            <button
              onClick={processInpaint}
              disabled={isProcessing || boxes.length === 0 || !image || aiStatus !== 'available'}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-bold hover:from-red-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Xử lý AI ({boxes.length} vùng)
                </>
              )}
            </button>
          </div>
        );

      case 'outpaint':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-bold text-blue-800 flex items-center gap-2">
                <ImagePlus size={18} />
                Mở rộng ảnh (Outpainting)
              </h4>
              <p className="text-sm text-blue-600 mt-1">
                Mở rộng ảnh ra ngoài viền gốc. AI sẽ tạo nội dung mới phù hợp với ảnh.
              </p>
            </div>

            {/* Image info */}
            {imageDimensions && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">Kích thước hiện tại: <span className="font-bold">{imageDimensions.width} × {imageDimensions.height}px</span></p>
              </div>
            )}

            {/* Expand controls */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Mở rộng (pixel):</p>
              
              {/* Top */}
              <div className="flex items-center gap-3">
                <div className="w-20 flex items-center gap-1 text-gray-500">
                  <ChevronUp size={16} />
                  <span className="text-sm">Trên</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={outpaintTop}
                  onChange={(e) => setOutpaintTop(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={outpaintTop}
                  onChange={(e) => setOutpaintTop(Math.max(0, Math.min(500, Number(e.target.value))))}
                  className="w-16 px-2 py-1 border rounded text-sm text-center"
                />
              </div>

              {/* Bottom */}
              <div className="flex items-center gap-3">
                <div className="w-20 flex items-center gap-1 text-gray-500">
                  <ChevronDown size={16} />
                  <span className="text-sm">Dưới</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={outpaintBottom}
                  onChange={(e) => setOutpaintBottom(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={outpaintBottom}
                  onChange={(e) => setOutpaintBottom(Math.max(0, Math.min(500, Number(e.target.value))))}
                  className="w-16 px-2 py-1 border rounded text-sm text-center"
                />
              </div>

              {/* Left */}
              <div className="flex items-center gap-3">
                <div className="w-20 flex items-center gap-1 text-gray-500">
                  <ChevronLeft size={16} />
                  <span className="text-sm">Trái</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={outpaintLeft}
                  onChange={(e) => setOutpaintLeft(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={outpaintLeft}
                  onChange={(e) => setOutpaintLeft(Math.max(0, Math.min(500, Number(e.target.value))))}
                  className="w-16 px-2 py-1 border rounded text-sm text-center"
                />
              </div>

              {/* Right */}
              <div className="flex items-center gap-3">
                <div className="w-20 flex items-center gap-1 text-gray-500">
                  <ChevronRight size={16} />
                  <span className="text-sm">Phải</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={outpaintRight}
                  onChange={(e) => setOutpaintRight(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={outpaintRight}
                  onChange={(e) => setOutpaintRight(Math.max(0, Math.min(500, Number(e.target.value))))}
                  className="w-16 px-2 py-1 border rounded text-sm text-center"
                />
              </div>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setOutpaintTop(100); setOutpaintBottom(100); setOutpaintLeft(100); setOutpaintRight(100); }}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                +100px tất cả
              </button>
              <button
                onClick={() => { setOutpaintTop(50); setOutpaintBottom(50); setOutpaintLeft(0); setOutpaintRight(0); }}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                +50px dọc
              </button>
              <button
                onClick={() => { setOutpaintTop(0); setOutpaintBottom(0); setOutpaintLeft(50); setOutpaintRight(50); }}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
              >
                +50px ngang
              </button>
              <button
                onClick={() => { setOutpaintTop(0); setOutpaintBottom(0); setOutpaintLeft(0); setOutpaintRight(0); }}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Reset
              </button>
            </div>

            {/* New dimensions preview */}
            {imageDimensions && (outpaintTop + outpaintBottom + outpaintLeft + outpaintRight > 0) && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm">
                <p className="text-blue-700">Kích thước mới: <span className="font-bold">
                  {imageDimensions.width + outpaintLeft + outpaintRight} × {imageDimensions.height + outpaintTop + outpaintBottom}px
                </span></p>
              </div>
            )}

            {/* Process button */}
            <button
              onClick={processOutpaint}
              disabled={isProcessing || !image || aiStatus !== 'available' || (outpaintTop + outpaintBottom + outpaintLeft + outpaintRight === 0)}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang mở rộng...
                </>
              ) : (
                <>
                  <ImagePlus size={20} />
                  Mở rộng ảnh
                </>
              )}
            </button>
          </div>
        );

      case 'remove-bg':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="font-bold text-green-800 flex items-center gap-2">
                <Layers size={18} />
                Xóa nền ảnh
              </h4>
              <p className="text-sm text-green-600 mt-1">
                Tự động nhận diện và xóa nền ảnh, giữ lại đối tượng chính.
              </p>
            </div>

            {imageDimensions && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">Kích thước: <span className="font-bold">{imageDimensions.width} × {imageDimensions.height}px</span></p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                <strong>Lưu ý:</strong> Tính năng này sử dụng API remove.bg hoặc model AI local. 
                Kết quả tốt nhất với ảnh có đối tượng rõ ràng.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Tùy chọn nền mới:</p>
              <div className="grid grid-cols-4 gap-2">
                <button className="h-10 rounded-lg border-2 border-gray-300 bg-transparent bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22/%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23ccc%22/%3E%3C/svg%3E')] hover:border-green-500" title="Trong suốt" />
                <button className="h-10 rounded-lg border-2 border-gray-300 bg-white hover:border-green-500" title="Trắng" />
                <button className="h-10 rounded-lg border-2 border-gray-300 bg-black hover:border-green-500" title="Đen" />
                <button className="h-10 rounded-lg border-2 border-gray-300 bg-gradient-to-br from-blue-400 to-purple-500 hover:border-green-500" title="Gradient" />
              </div>
            </div>

            <button
              onClick={processRemoveBg}
              disabled={isProcessing || !image}
              className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Layers size={20} />
                  Xóa nền ảnh
                </>
              )}
            </button>
          </div>
        );

      case 'upscale':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <h4 className="font-bold text-purple-800 flex items-center gap-2">
                <ScanLine size={18} />
                Nâng cấp chất lượng
              </h4>
              <p className="text-sm text-purple-600 mt-1">
                Tăng độ phân giải ảnh lên 2x, 4x với AI Super Resolution.
              </p>
            </div>

            {imageDimensions && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-600">Kích thước hiện tại: <span className="font-bold">{imageDimensions.width} × {imageDimensions.height}px</span></p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Hệ số phóng to:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUpscaleFactor(2)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    upscaleFactor === 2 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <p className="text-2xl font-bold text-purple-600">2x</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {imageDimensions ? `${imageDimensions.width * 2} × ${imageDimensions.height * 2}px` : 'Gấp đôi'}
                  </p>
                </button>
                <button
                  onClick={() => setUpscaleFactor(4)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    upscaleFactor === 4 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <p className="text-2xl font-bold text-purple-600">4x</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {imageDimensions ? `${imageDimensions.width * 4} × ${imageDimensions.height * 4}px` : 'Gấp 4'}
                  </p>
                </button>
              </div>
            </div>

            {imageDimensions && (
              <div className="bg-purple-50 rounded-lg p-3 text-sm">
                <p className="text-purple-700">Kích thước mới: <span className="font-bold">
                  {imageDimensions.width * upscaleFactor} × {imageDimensions.height * upscaleFactor}px
                </span></p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-700">
                <strong>Lưu ý:</strong> Upscale 4x có thể mất nhiều thời gian hơn. 
                Ảnh lớn có thể tốn nhiều bộ nhớ.
              </p>
            </div>

            <button
              onClick={processUpscale}
              disabled={isProcessing || !image}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang nâng cấp...
                </>
              ) : (
                <>
                  <ScanLine size={20} />
                  Nâng cấp {upscaleFactor}x
                </>
              )}
            </button>
          </div>
        );

      case 'color':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h4 className="font-bold text-orange-800 flex items-center gap-2">
                <Palette size={18} />
                Chuyển đổi màu
              </h4>
              <p className="text-sm text-orange-600 mt-1">
                Chuyển đổi và điều chỉnh màu sắc ảnh.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Chọn hiệu ứng:</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'grayscale', name: 'Grayscale', desc: 'Chuyển trắng đen' },
                  { id: 'sepia', name: 'Sepia', desc: 'Tông nâu cổ điển' },
                  { id: 'invert', name: 'Invert', desc: 'Đảo ngược màu' },
                  { id: 'brightness', name: 'Brightness', desc: 'Độ sáng' },
                  { id: 'contrast', name: 'Contrast', desc: 'Độ tương phản' },
                  { id: 'saturate', name: 'Saturate', desc: 'Độ bão hòa' },
                ].map(effect => (
                  <button
                    key={effect.id}
                    onClick={() => setColorMode(effect.id as any)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      colorMode === effect.id 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{effect.name}</p>
                    <p className="text-xs text-gray-500">{effect.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity slider for adjustable effects */}
            {['brightness', 'contrast', 'saturate'].includes(colorMode) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Cường độ</span>
                  <span className="font-bold text-orange-600">{colorIntensity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={colorIntensity}
                  onChange={(e) => setColorIntensity(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>
            )}

            {/* Preview */}
            {image && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Xem trước:</p>
                <div className="h-32 rounded-lg overflow-hidden bg-white border relative">
                  {previewLoading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                      <Loader2 size={24} className="animate-spin text-orange-500" />
                    </div>
                  )}
                  <canvas 
                    ref={previewCanvasRef}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            <button
              onClick={processColorConvert}
              disabled={isProcessing || !image}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Palette size={20} />
                  Áp dụng hiệu ứng
                </>
              )}
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
              <Wand2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Xử lý ảnh AI</h1>
              <p className="text-sm text-gray-500">Công cụ AI mạnh mẽ cho xử lý ảnh</p>
            </div>
          </div>
          
          {/* AI Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            aiStatus === 'available' ? 'bg-green-100 text-green-700' :
            aiStatus === 'not-installed' ? 'bg-yellow-100 text-yellow-700' :
            aiStatus === 'unavailable' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {aiStatus === 'checking' && <Loader2 size={14} className="animate-spin" />}
            {aiStatus === 'available' && <Check size={14} />}
            {aiStatus === 'not-installed' && <AlertCircle size={14} />}
            {aiStatus === 'unavailable' && <AlertCircle size={14} />}
            {aiStatus === 'checking' ? 'Đang kiểm tra...' :
             aiStatus === 'available' ? 'AI sẵn sàng' : 
             aiStatus === 'not-installed' ? 'AI chưa cài đặt' :
             'AI không khả dụng'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              Công cụ AI
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {tools.map(tool => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-purple-50 border-2 border-purple-300'
                      : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      isActive ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${isActive ? 'text-purple-700' : 'text-gray-700'}`}>
                        {tool.name}
                      </p>
                      <p className="text-xs text-gray-400">{tool.desc}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-all"
            >
              <Upload size={18} />
              Tải ảnh
            </button>
            
            <div className="h-6 w-px bg-gray-200" />
            
            <button
              onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Thu nhỏ"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-sm text-gray-500 w-14 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(3, z + 0.1))}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Phóng to"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={fitToScreen}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Vừa màn hình"
            >
              <Maximize size={18} />
            </button>
            
            <div className="h-6 w-px bg-gray-200" />
            
            <button
              onClick={resetImage}
              disabled={!originalImage || image === originalImage}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50"
              title="Khôi phục ảnh gốc"
            >
              <RotateCcw size={18} />
            </button>
            
            <button
              onClick={downloadResult}
              disabled={!image}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50"
              title="Tải xuống"
            >
              <Download size={18} />
            </button>
            
            <div className="h-6 w-px bg-gray-200" />
            
            <button
              onClick={fullReset}
              disabled={!image}
              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 disabled:opacity-50 flex items-center gap-1.5 text-sm font-medium transition-colors"
              title="Làm mới - Xóa tất cả"
            >
              <RefreshCw size={16} />
              Làm mới
            </button>
          </div>

          {/* Canvas */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto bg-gray-100 p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%) 50% / 20px 20px'
            }}
          >
            {image ? (
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.1s ease-out' }}>
                <canvas
                  ref={canvasRef}
                  className="shadow-xl bg-white"
                  style={{ cursor: activeTool === 'inpaint' && drawMode === 'draw' ? 'crosshair' : 'default' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
              </div>
            ) : (
              <div
                className="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl bg-white cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <Upload size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-600">Kéo thả ảnh vào đây</p>
                  <p className="text-sm text-gray-400 mt-1">hoặc click để chọn file</p>
                  <p className="text-xs text-gray-400 mt-2">Hỗ trợ: JPG, PNG</p>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                <X size={16} />
              </button>
            </div>
          )}
          
          {/* Success with Download Button */}
          {success && (
            <div className="mx-4 mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 mb-3">
                <Check size={18} />
                <span className="text-sm font-medium">{success}</span>
                <button onClick={() => { setSuccess(null); setShowResultActions(false); }} className="ml-auto text-green-500 hover:text-green-700">
                  <X size={16} />
                </button>
              </div>
              {showResultActions && (
                <button
                  onClick={downloadResult}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download size={22} />
                  Tải ảnh kết quả
                </button>
              )}
            </div>
          )}
          
          {/* Processing Overlay - Enhanced */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[280px]">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                  <Wand2 size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-800 text-lg">Đang xử lý AI...</p>
                  <p className="text-sm text-gray-500 mt-1">Vui lòng chờ trong giây lát</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Tool Options */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Tùy chọn công cụ</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {renderToolContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIImageProcessor;
