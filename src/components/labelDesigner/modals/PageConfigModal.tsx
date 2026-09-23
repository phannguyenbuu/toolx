import React from 'react';
import { X, Upload } from 'lucide-react';
import { PageConfig, BackgroundFitType } from '../types';

export interface PageConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  backgroundInputRef: React.RefObject<HTMLInputElement | null>;
  handleBackgroundUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export const PageConfigModal: React.FC<PageConfigModalProps> = ({
  isOpen,
  onClose,
  pageConfig,
  setPageConfig,
  backgroundInputRef,
  handleBackgroundUpload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Cấu hình trang</h3>
            <p className="text-xs text-gray-500 mt-0.5">Kích thước nhãn / label</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Khổ giấy</label>
            <div className="flex gap-2">
              {(['A5', 'A4', 'A3', 'Custom'] as PageConfig['format'][]).map(f => (
                <button
                  key={f}
                  onClick={() => {
                    const map: Record<string, [number, number]> = {
                      A5: [148, 210],
                      A4: [210, 297],
                      A3: [297, 420]
                    };
                    if (!map[f]) {
                      setPageConfig(p => ({ ...p, format: f }));
                      return;
                    }
                    let [w, h] = map[f];
                    if (pageConfig.orientation === 'portrait' && w > h) [w, h] = [h, w];
                    if (pageConfig.orientation === 'landscape' && h > w) [w, h] = [h, w];
                    setPageConfig(p => ({ ...p, format: f, width: w, height: h }));
                  }}
                  className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                    pageConfig.format === f
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rộng (mm)</label>
              <input
                type="number"
                value={pageConfig.width}
                onChange={e =>
                  setPageConfig(p => ({
                    ...p,
                    format: 'Custom',
                    width: Number(e.target.value)
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Cao (mm)</label>
              <input
                type="number"
                value={pageConfig.height}
                onChange={e =>
                  setPageConfig(p => ({
                    ...p,
                    format: 'Custom',
                    height: Number(e.target.value)
                  }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hướng giấy</label>
            <div className="flex gap-2">
              {[
                { v: 'landscape', l: 'Ngang' },
                { v: 'portrait', l: 'Dọc' }
              ].map(o => (
                <button
                  key={o.v}
                  onClick={() => {
                    if (pageConfig.orientation !== o.v) {
                      setPageConfig(p => ({
                        ...p,
                        orientation: o.v as any,
                        width:
                          o.v === 'landscape'
                            ? Math.max(p.width, p.height)
                            : Math.min(p.width, p.height),
                        height:
                          o.v === 'landscape'
                            ? Math.min(p.width, p.height)
                            : Math.max(p.width, p.height)
                      }));
                    }
                  }}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    pageConfig.orientation === o.v
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hình nền</label>
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={handleBackgroundUpload}
              className="hidden"
            />
            {pageConfig.backgroundSrc ? (
              <div className="border border-gray-200 rounded-lg p-2 space-y-2">
                <img
                  src={pageConfig.backgroundSrc}
                  alt="bg"
                  className="w-full h-20 object-contain rounded-md"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => backgroundInputRef.current?.click()}
                    className="flex-1 text-xs py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Đổi ảnh
                  </button>
                  <button
                    onClick={() => setPageConfig(p => ({ ...p, backgroundSrc: undefined }))}
                    className="flex-1 text-xs py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Xóa
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['fill', 'contain', 'cover', 'stretch'] as BackgroundFitType[]).map(fit => (
                    <button
                      key={fit}
                      onClick={() => setPageConfig(p => ({ ...p, backgroundFit: fit }))}
                      className={`py-1 text-[10px] rounded border font-medium transition-colors ${
                        pageConfig.backgroundFit === fit
                          ? 'bg-violet-600 text-white border-violet-600'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {fit === 'fill'
                        ? 'Fill'
                        : fit === 'contain'
                        ? 'Fit'
                        : fit === 'cover'
                        ? 'Cover'
                        : 'Stretch'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={() => backgroundInputRef.current?.click()}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-violet-400 hover:bg-violet-50 text-sm text-gray-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Tải ảnh nền
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end px-5 py-4 border-t">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};
