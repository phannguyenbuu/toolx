import { useState, useRef, useMemo } from 'react';
import { UploadedImage, generateId } from './types';

export function useLabelDesignerMedia() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [previewImageId, setPreviewImageId] = useState<string | null>(null);
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);
  const [editingMediaName, setEditingMediaName] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const filteredImages = useMemo(() => {
    return uploadedImages.filter(img =>
      mediaSearch ? img.name.toLowerCase().includes(mediaSearch.toLowerCase()) : true
    );
  }, [uploadedImages, mediaSearch]);

  const deleteMedia = (id: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
    setSelectedMediaIds(prev => prev.filter(sid => sid !== id));
  };

  const deleteSelectedMedia = () => {
    if (selectedMediaIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedMediaIds.length} ảnh đã chọn?`)) return;
    setUploadedImages(prev => prev.filter(img => !selectedMediaIds.includes(img.id)));
    setSelectedMediaIds([]);
  };

  const moveMediaUp = (id: string) => {
    setUploadedImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx <= 0) return prev;
      const newArr = [...prev];
      [newArr[idx - 1], newArr[idx]] = [newArr[idx], newArr[idx - 1]];
      return newArr;
    });
  };

  const moveMediaDown = (id: string) => {
    setUploadedImages(prev => {
      const idx = prev.findIndex(img => img.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const newArr = [...prev];
      [newArr[idx], newArr[idx + 1]] = [newArr[idx + 1], newArr[idx]];
      return newArr;
    });
  };

  const handleImageDragStart = (e: React.DragEvent, imgId: string) => {
    setDraggedImageId(imgId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleImageDragOver = (e: React.DragEvent, imgId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedImageId && draggedImageId !== imgId) {
      setDragOverImageId(imgId);
    }
  };

  const handleImageDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedImageId || draggedImageId === targetId) return;

    setUploadedImages(prev => {
      const draggedIdx = prev.findIndex(img => img.id === draggedImageId);
      const targetIdx = prev.findIndex(img => img.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;

      const newArr = [...prev];
      const [draggedItem] = newArr.splice(draggedIdx, 1);
      newArr.splice(targetIdx, 0, draggedItem);
      return newArr;
    });

    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageId(null);
    setDragOverImageId(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ];

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        console.warn(`Skipped ${file.name}: Invalid type ${file.type}`);
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Skipped ${file.name}: Too large (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      alert('Không có file hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, GIF, WebP, SVG dưới 10MB.');
      return;
    }

    try {
      const loadPromises = validFiles.map(file => {
        return new Promise<UploadedImage>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = ev => {
            const src = ev.target?.result as string;
            resolve({
              id: generateId(),
              name: file.name,
              src,
              size: file.size,
              type: file.type
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        });
      });

      const newImages = await Promise.all(loadPromises);
      setUploadedImages(prev => [...prev, ...newImages]);

      if (validFiles.length < fileArray.length) {
        alert(`Đã tải ${validFiles.length}/${fileArray.length} ảnh. Một số file bị bỏ qua.`);
      }
    } catch (err: any) {
      console.error('Image upload error:', err);
      alert('Lỗi khi tải ảnh: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleMediaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingMedia(false);

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;

    const input = imageInputRef.current;
    if (!input) return;

    const dataTransfer = new DataTransfer();
    files.forEach(f => dataTransfer.items.add(f));
    input.files = dataTransfer.files;

    handleImageUpload({ target: input } as any);
  };

  const renameMedia = (id: string, newName: string) => {
    setUploadedImages(prev => prev.map(img => (img.id === id ? { ...img, name: newName } : img)));
    setEditingMediaId(null);
  };

  return {
    uploadedImages,
    setUploadedImages,
    mediaSearch,
    setMediaSearch,
    selectedMediaIds,
    setSelectedMediaIds,
    isDraggingMedia,
    setIsDraggingMedia,
    draggedImageId,
    dragOverImageId,
    previewImageId,
    setPreviewImageId,
    editingMediaId,
    setEditingMediaId,
    editingMediaName,
    setEditingMediaName,
    isMediaModalOpen,
    setIsMediaModalOpen,
    imageInputRef,
    filteredImages,
    deleteMedia,
    deleteSelectedMedia,
    moveMediaUp,
    moveMediaDown,
    renameMedia,
    handleImageDragStart,
    handleImageDragOver,
    handleImageDrop,
    handleImageDragEnd,
    handleMediaDrop,
    handleImageUpload
  };
}
