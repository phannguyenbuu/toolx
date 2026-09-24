import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BoundingBox } from '../types';
import { getCanvasCoordinates, redrawCanvas } from '../helpers/canvasUtils';

export function useImageCanvas() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [drawMode, setDrawMode] = useState<'select' | 'draw'>('draw');
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showResultActions, setShowResultActions] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // File upload handler
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          setError('Vui lòng chọn file hình ảnh (PNG, JPG, WebP)');
          return;
        }

        setImageFile(file);
        setError(null);
        setSuccess(null);
        setBoxes([]);
        setShowResultActions(false);

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setImage(dataUrl);
          setOriginalImage(dataUrl);

          const img = new Image();
          img.onload = () => {
            imageRef.current = img;
            setImageDimensions({ width: img.width, height: img.height });
            setImageLoaded(true);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    },
    []
  );

  // Fit image to screen
  const fitToScreen = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 48;
    const containerHeight = container.clientHeight - 48;
    const imgWidth = imageRef.current.width;
    const imgHeight = imageRef.current.height;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);

    setZoom(Math.round(newZoom * 100) / 100);
  }, []);

  // Drop handler
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
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
    },
    [handleFileUpload]
  );

  // Mouse handlers for drawing bounding boxes
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawMode !== 'draw' || !image || !canvasRef.current || !imageRef.current) return;

    const coords = getCanvasCoordinates(e, canvasRef.current, imageRef.current);
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
    if (!isDrawing || !currentBox || !canvasRef.current || !imageRef.current) return;

    const coords = getCanvasCoordinates(e, canvasRef.current, imageRef.current);
    if (!coords) return;

    setCurrentBox({
      ...currentBox,
      width: coords.x - currentBox.x,
      height: coords.y - currentBox.y
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;

    const normalizedBox: BoundingBox = {
      ...currentBox,
      x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
      y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
      width: Math.abs(currentBox.width),
      height: Math.abs(currentBox.height)
    };

    if (normalizedBox.width > 5 && normalizedBox.height > 5) {
      setBoxes((prev) => [...prev, normalizedBox]);
    }

    setIsDrawing(false);
    setCurrentBox(null);
  };

  const removeBox = (id: string) => {
    setBoxes((prev) => prev.filter((b) => b.id !== id));
    if (selectedBoxId === id) setSelectedBoxId(null);
  };

  const clearAllBoxes = () => {
    setBoxes([]);
    setSelectedBoxId(null);
  };

  const resetToOriginal = () => {
    if (originalImage) {
      setImage(originalImage);
      setBoxes([]);
      setSuccess(null);
      setError(null);
      setShowResultActions(false);
    }
  };

  // Update image ref when image changes
  useEffect(() => {
    if (!image) {
      setImageLoaded(false);
      return;
    }

    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    img.src = image;
  }, [image]);

  // Redraw canvas
  useEffect(() => {
    if (canvasRef.current && imageRef.current && imageLoaded) {
      redrawCanvas(canvasRef.current, imageRef.current, boxes, currentBox, selectedBoxId);
    }
  }, [image, boxes, currentBox, selectedBoxId, imageLoaded]);

  // Fit to screen when image first loads
  useEffect(() => {
    if (imageLoaded) {
      fitToScreen();
    }
  }, [imageLoaded, fitToScreen]);

  return {
    image,
    setImage,
    originalImage,
    setOriginalImage,
    imageFile,
    setImageFile,
    imageDimensions,
    setImageDimensions,
    imageLoaded,
    setImageLoaded,
    zoom,
    setZoom,
    boxes,
    setBoxes,
    isDrawing,
    currentBox,
    drawMode,
    setDrawMode,
    selectedBoxId,
    setSelectedBoxId,
    canvasRef,
    containerRef,
    fileInputRef,
    imageRef,
    previewCanvasRef,
    handleFileUpload,
    handleDrop,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    removeBox,
    clearAllBoxes,
    fitToScreen,
    resetToOriginal,
    error,
    setError,
    success,
    setSuccess,
    showResultActions,
    setShowResultActions
  };
}
