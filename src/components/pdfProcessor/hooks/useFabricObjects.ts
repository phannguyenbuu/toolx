import React, { useState, useCallback } from 'react';

interface UseFabricObjectsProps {
  fabricCanvasRef: React.RefObject<any>;
  onStateChange: () => void;
}

export function useFabricObjects({ fabricCanvasRef, onStateChange }: UseFabricObjectsProps) {
  const [activeObject, setActiveObject] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);

  // Props panel state
  const [objColor, setObjColor] = useState('#000000');
  const [textContent, setTextContent] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(20);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Render layers list
  const renderLayers = useCallback(() => {
    if (!fabricCanvasRef.current) {
      setLayers([]);
      return;
    }
    const objs = fabricCanvasRef.current.getObjects().slice().reverse();
    setLayers(objs);
  }, [fabricCanvasRef]);

  // Object selection handlers
  const handleObjectSelect = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = canvas.getActiveObject();
    setActiveObject(obj);

    if (obj) {
      if (obj.fill && typeof obj.fill === 'string') {
        try {
          const color = new window.fabric.Color(obj.fill).toHex();
          if (color.length === 6) setObjColor('#' + color);
        } catch (e) {}
      }

      if (obj.type === 'i-text') {
        setTextContent(obj.text || '');
        setSelectedFont(obj.fontFamily || 'Arial');
        setFontSize(Math.round(obj.fontSize || 20));
        setIsBold(obj.fontWeight === 'bold');
        setIsItalic(obj.fontStyle === 'italic');
        setIsUnderline(obj.underline || false);
      }
    }

    renderLayers();
  }, [fabricCanvasRef, renderLayers]);

  const handleObjectClear = useCallback(() => {
    setActiveObject(null);
    renderLayers();
  }, [renderLayers]);

  const addRect = useCallback(
    (pos?: { x: number; y: number }) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const rect = new window.fabric.Rect({
        left: pos?.x || 100,
        top: pos?.y || 100,
        width: 150,
        height: 80,
        fill: objColor,
        strokeWidth: 0,
        selectable: true,
        evented: true
      });
      canvas.add(rect);
      canvas.setActiveObject(rect);
    },
    [fabricCanvasRef, objColor]
  );

  const addText = useCallback(
    (pos?: { x: number; y: number }) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const text = new window.fabric.IText('Nhập nội dung...', {
        left: pos?.x || 100,
        top: pos?.y || 100,
        fontFamily: selectedFont,
        fontSize: fontSize,
        fill: objColor,
        selectable: true,
        evented: true
      });
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
    },
    [fabricCanvasRef, selectedFont, fontSize, objColor]
  );

  const deleteActive = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObjects();
    if (active.length) {
      canvas.discardActiveObject();
      active.forEach((obj: any) => canvas.remove(obj));
    }
  }, [fabricCanvasRef]);

  // Update active object properties
  const updateActiveObj = useCallback(
    (key: string, value: any) => {
      const canvas = fabricCanvasRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj) return;

      switch (key) {
        case 'color':
          obj.set('fill', value);
          setObjColor(value);
          break;
        case 'font':
          if (obj.type === 'i-text') obj.set('fontFamily', value);
          setSelectedFont(value);
          break;
        case 'size':
          if (obj.type === 'i-text') obj.set('fontSize', parseInt(value, 10));
          setFontSize(parseInt(value, 10));
          break;
        case 'text':
          if (obj.type === 'i-text') obj.set('text', value);
          setTextContent(value);
          break;
      }

      canvas.requestRenderAll();
      onStateChange();
    },
    [fabricCanvasRef, onStateChange]
  );

  const toggleStyle = useCallback(
    (style: 'bold' | 'italic' | 'underline') => {
      const canvas = fabricCanvasRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj || obj.type !== 'i-text') return;

      switch (style) {
        case 'bold':
          obj.set('fontWeight', obj.fontWeight === 'bold' ? 'normal' : 'bold');
          setIsBold(obj.fontWeight === 'bold');
          break;
        case 'italic':
          obj.set('fontStyle', obj.fontStyle === 'italic' ? 'normal' : 'italic');
          setIsItalic(obj.fontStyle === 'italic');
          break;
        case 'underline':
          obj.set('underline', !obj.underline);
          setIsUnderline(obj.underline);
          break;
      }

      canvas.requestRenderAll();
      onStateChange();
    },
    [fabricCanvasRef, onStateChange]
  );

  // Layer actions
  const layerAction = useCallback(
    (action: 'up' | 'down') => {
      const canvas = fabricCanvasRef.current;
      const obj = canvas?.getActiveObject();
      if (!obj) return;

      if (action === 'up') obj.bringForward();
      else obj.sendBackwards();

      canvas.requestRenderAll();
      onStateChange();
    },
    [fabricCanvasRef, onStateChange]
  );

  const deleteCheckedLayers = useCallback(() => {
    const checks = document.querySelectorAll<HTMLInputElement>('.layer-chk:checked');
    if (checks.length === 0) return;
    if (!window.confirm(`Xóa ${checks.length} layer đã chọn?`)) return;

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objs = canvas.getObjects().slice().reverse();

    canvas.discardActiveObject();
    checks.forEach((chk) => {
      const idx = parseInt(chk.parentElement?.dataset.idx || '0', 10);
      const obj = objs[idx];
      if (obj) canvas.remove(obj);
    });
  }, [fabricCanvasRef]);

  const resetObjectState = useCallback(() => {
    setLayers([]);
    setActiveObject(null);
    setObjColor('#000000');
    setTextContent('');
    setSelectedFont('Arial');
    setFontSize(20);
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
  }, []);

  return {
    activeObject,
    setActiveObject,
    layers,
    setLayers,
    objColor,
    textContent,
    selectedFont,
    fontSize,
    isBold,
    isItalic,
    isUnderline,
    renderLayers,
    handleObjectSelect,
    handleObjectClear,
    addRect,
    addText,
    deleteActive,
    updateActiveObj,
    toggleStyle,
    layerAction,
    deleteCheckedLayers,
    resetObjectState
  };
}
