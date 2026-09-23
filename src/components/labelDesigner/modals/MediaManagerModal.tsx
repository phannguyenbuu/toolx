import React from 'react';
import {
  X,
  Upload,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Edit3
} from 'lucide-react';
import { UploadedImage } from '../types';

export interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedImages: UploadedImage[];
  filteredImages: UploadedImage[];
  mediaSearch: string;
  setMediaSearch: (s: string) => void;
  selectedMediaIds: string[];
  setSelectedMediaIds: React.Dispatch<React.SetStateAction<string[]>>;
  isDraggingMedia: boolean;
  setIsDraggingMedia: (b: boolean) => void;
  draggedImageId: string | null;
  dragOverImageId: string | null;
  previewImageId: string | null;
  setPreviewImageId: (id: string | null) => void;
  editingMediaId: string | null;
  setEditingMediaId: (id: string | null) => void;
  editingMediaName: string;
  setEditingMediaName: (s: string) => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
  deleteMedia: (id: string) => void;
  deleteSelectedMedia: () => void;
  moveMediaUp: (id: string) => void;
  moveMediaDown: (id: string) => void;
  renameMedia: (id: string, name: string) => void;
  handleImageDragStart: (e: React.DragEvent, id: string) => void;
  handleImageDragOver: (e: React.DragEvent, id: string) => void;
  handleImageDrop: (e: React.DragEvent, id: string) => void;
  handleImageDragEnd: () => void;
  handleMediaDrop: (e: React.DragEvent) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const MediaManagerModal: React.FC<MediaManagerModalProps> = ({
  isOpen,
  onClose,
  uploadedImages,
  filteredImages,
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
  imageInputRef,
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
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white rounded-xl shadow-2xl w-[90vw] max-w-5xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div>
              <h3 className="font-semibold text-gray-900">Quản lý Media</h3>
              <p className="text-xs text-gray-500 mt-0.5">{uploadedImages.length} ảnh</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col p-5">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Drag & Drop Zone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingMedia(true);
              }}
              onDragLeave={() => setIsDraggingMedia(false)}
              onDrop={handleMediaDrop}
              onClick={() => imageInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors mb-4 ${
                isDraggingMedia
                  ? 'border-violet-500 bg-violet-100'
                  : 'border-gray-200 hover:border-violet-400 hover:bg-violet-50'
              }`}
            >
              <Upload
                size={32}
                className={isDraggingMedia ? 'text-violet-600' : 'text-gray-400'}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  Kéo thả ảnh vào đây hoặc click để chọn
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  JPG, PNG, GIF, WebP, SVG • Max 10MB mỗi file
                </p>
              </div>
            </div>

            {/* Search & Actions */}
            {uploadedImages.length > 0 && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="text"
                    value={mediaSearch}
                    onChange={e => setMediaSearch(e.target.value)}
                    placeholder="Tìm kiếm ảnh..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <span className="text-sm text-gray-500">
                    {filteredImages.length} / {uploadedImages.length}
                  </span>
                  {selectedMediaIds.length > 0 && (
                    <button
                      onClick={deleteSelectedMedia}
                      className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 size={14} /> Xóa {selectedMediaIds.length}
                    </button>
                  )}
                </div>

                {/* AI Tools */}
                <div className="flex items-center gap-2 mb-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                    🤖 AI Tools:
                  </span>
                  <button
                    onClick={() => alert('Tính năng Làm nét ảnh AI đang phát triển')}
                    className="px-3 py-1.5 bg-white text-purple-600 rounded-md text-xs font-medium hover:bg-purple-50 transition-colors border border-purple-200 flex items-center gap-1.5"
                  >
                    ✨ Làm nét ảnh
                  </button>
                  <button
                    onClick={() =>
                      alert(
                        'Tính năng Tạo ảnh thẻ AI đang phát triển\n\nCác loại thẻ:\n- Đi làm\n- Sinh viên\n- Học sinh'
                      )
                    }
                    className="px-3 py-1.5 bg-white text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 transition-colors border border-blue-200 flex items-center gap-1.5"
                  >
                    🎴 Tạo ảnh thẻ
                  </button>
                  {selectedMediaIds.length > 0 && (
                    <span className="text-xs text-purple-600 ml-auto">
                      ({selectedMediaIds.length} ảnh được chọn)
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Image Grid */}
            <div className="flex-1 overflow-auto">
              {filteredImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredImages.map(img => {
                    const actualIdx = uploadedImages.findIndex(i => i.id === img.id);
                    const isSelected = selectedMediaIds.includes(img.id);
                    const isDragging = draggedImageId === img.id;
                    const isDragOver = dragOverImageId === img.id;
                    return (
                      <div
                        key={img.id}
                        draggable
                        onDragStart={e => handleImageDragStart(e, img.id)}
                        onDragOver={e => handleImageDragOver(e, img.id)}
                        onDrop={e => handleImageDrop(e, img.id)}
                        onDragEnd={handleImageDragEnd}
                        className={`relative group border-2 rounded-lg overflow-hidden transition-all cursor-move ${
                          isDragging ? 'opacity-50 scale-95' : ''
                        } ${
                          isDragOver ? 'border-violet-500 ring-4 ring-violet-200 scale-105' : ''
                        } ${
                          isSelected
                            ? 'border-violet-400 ring-2 ring-violet-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedMediaIds(prev => [...prev, img.id]);
                            } else {
                              setSelectedMediaIds(prev => prev.filter(id => id !== img.id));
                            }
                          }}
                          className="absolute top-2 left-2 z-10 w-4 h-4"
                        />

                        {/* Drag Handle */}
                        <div className="absolute top-2 left-8 z-10 p-1 bg-white/80 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                          <GripVertical size={14} className="text-gray-600" />
                        </div>

                        {/* Image */}
                        <div
                          onClick={() => setPreviewImageId(img.id)}
                          className="aspect-square bg-gray-100 cursor-pointer"
                        >
                          <img
                            src={img.src}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Info & Actions */}
                        <div className="p-2 bg-white">
                          {editingMediaId === img.id ? (
                            <input
                              type="text"
                              value={editingMediaName}
                              onChange={e => setEditingMediaName(e.target.value)}
                              onBlur={() => renameMedia(img.id, editingMediaName)}
                              onKeyDown={e =>
                                e.key === 'Enter' && renameMedia(img.id, editingMediaName)
                              }
                              className="w-full border rounded px-2 py-1 text-xs"
                              autoFocus
                            />
                          ) : (
                            <>
                              <p
                                className="text-xs font-medium truncate text-gray-700"
                                title={img.name}
                              >
                                {img.name}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-gray-400">#{actualIdx + 1}</span>
                                {img.size && (
                                  <span className="text-[10px] text-gray-400">
                                    {(img.size / 1024).toFixed(0)} KB
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Hover Actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveMediaUp(img.id)}
                            disabled={actualIdx === 0}
                            className="p-1.5 bg-white rounded shadow hover:bg-gray-100 disabled:opacity-30"
                            title="Di chuyển lên"
                          >
                            <ChevronLeft size={14} className="rotate-90" />
                          </button>
                          <button
                            onClick={() => moveMediaDown(img.id)}
                            disabled={actualIdx === uploadedImages.length - 1}
                            className="p-1.5 bg-white rounded shadow hover:bg-gray-100 disabled:opacity-30"
                            title="Di chuyển xuống"
                          >
                            <ChevronRight size={14} className="rotate-90" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingMediaId(img.id);
                              setEditingMediaName(img.name);
                            }}
                            className="p-1.5 bg-white rounded shadow hover:bg-gray-100"
                            title="Đổi tên"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => deleteMedia(img.id)}
                            className="p-1.5 bg-white rounded shadow hover:bg-red-100 text-red-500"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* AI Actions (bottom) */}
                        <div className="absolute bottom-12 left-0 right-0 flex gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              alert(`Làm nét ảnh AI cho:\n${img.name}`);
                            }}
                            className="flex-1 px-2 py-1 bg-purple-500 text-white rounded text-[10px] font-medium hover:bg-purple-600 transition-colors"
                            title="Làm nét ảnh AI"
                          >
                            ✨ Làm nét
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              alert(
                                `Tạo ảnh thẻ AI cho:\n${img.name}\n\nChọn loại thẻ:\n- Đi làm\n- Sinh viên\n- Học sinh`
                              );
                            }}
                            className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-[10px] font-medium hover:bg-blue-600 transition-colors"
                            title="Tạo ảnh thẻ AI"
                          >
                            🎴 Ảnh thẻ
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : uploadedImages.length > 0 ? (
                <p className="text-sm text-gray-400 text-center py-12">
                  Không tìm thấy "{mediaSearch}"
                </p>
              ) : (
                <p className="text-sm text-gray-400 text-center py-12">
                  Chưa có ảnh nào. Hãy tải ảnh lên.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* IMAGE PREVIEW MODAL */}
      {previewImageId &&
        (() => {
          const img = uploadedImages.find(i => i.id === previewImageId);
          if (!img) return null;
          return (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setPreviewImageId(null)}
            >
              <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setPreviewImageId(null)}
                  className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-lg"
                >
                  <X size={24} />
                </button>
                <img
                  src={img.src}
                  alt={img.name}
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-3 rounded-b-lg">
                  <p className="text-sm font-medium truncate">{img.name}</p>
                  <div className="flex gap-3 text-xs text-gray-300 mt-1">
                    <span>#{uploadedImages.findIndex(i => i.id === img.id) + 1}</span>
                    {img.size && <span>{(img.size / 1024).toFixed(1)} KB</span>}
                    {img.type && <span>{img.type.split('/')[1].toUpperCase()}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
};
