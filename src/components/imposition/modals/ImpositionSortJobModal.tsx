import React, { useState } from 'react';
import {
  FileJson,
  Check,
  Copy,
  Info,
  Download
} from 'lucide-react';
import { safeToastSuccess } from '../impositionHelpers';

export interface SortJobModalData {
  id: string;
  title?: string;
  sheet?: { width_mm: number; height_mm: number };
  selected_plan?: {
    quantity: number;
    name: string;
    items?: any[];
  };
  layers?: any[];
  summary?: {
    vps_endpoint?: string;
  };
  [key: string]: any;
}

export interface ImpositionSortJobModalProps {
  sortJobModalData: SortJobModalData | null;
  setSortJobModalData: (data: SortJobModalData | null) => void;
  handleCopyJobId: (id: string) => void;
  copiedJobId: boolean;
}

export const ImpositionSortJobModal: React.FC<ImpositionSortJobModalProps> = ({
  sortJobModalData,
  setSortJobModalData,
  handleCopyJobId,
  copiedJobId
}) => {
  const [sortJobTab, setSortJobTab] = useState<'overview' | 'layers' | 'json'>('overview');
  const [copiedJson, setCopiedJson] = useState(false);

  if (!sortJobModalData) return null;

  const handleCopyJobJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    safeToastSuccess('Đã sao chép toàn bộ JSON SortJob vào clipboard');
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadSortJobJson = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sortjob_${data.id || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    safeToastSuccess('Đã tải xuống file sortjob.json');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => setSortJobModalData(null)}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 text-slate-800 relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
              <FileJson size={22} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">
                  Tác vụ Sắp xếp (SortJob)
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-violet-100 text-violet-800 border border-violet-200">
                  <span>ID:</span>
                  <span className="select-all">{sortJobModalData.id}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyJobId(sortJobModalData.id)}
                  className="px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Sao chép ID để gửi báo kiểm tra"
                >
                  {copiedJobId ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedJobId ? 'Đã sao chép!' : 'Sao chép ID'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                {sortJobModalData.title} &bull; Lưu về VPS: <span className="font-mono text-indigo-600 font-semibold">{sortJobModalData.summary?.vps_endpoint}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSortJobModalData(null)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-3 border-b border-slate-100 flex-shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Khổ tờ in</span>
            <span className="font-bold text-slate-800">{sortJobModalData.sheet?.width_mm}×{sortJobModalData.sheet?.height_mm} mm</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Số lượng tem</span>
            <span className="font-bold text-violet-700">{sortJobModalData.selected_plan?.quantity} tem</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Số Layer</span>
            <span className="font-bold text-slate-800">{sortJobModalData.layers?.length || 0} Layer</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Phương án</span>
            <span className="font-bold text-emerald-700 truncate block" title={sortJobModalData.selected_plan?.name}>
              {sortJobModalData.selected_plan?.name}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 flex-shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setSortJobTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              sortJobTab === 'overview'
                ? 'bg-violet-100 text-violet-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tổng quan & Vị trí ({sortJobModalData.selected_plan?.items?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setSortJobTab('layers')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              sortJobTab === 'layers'
                ? 'bg-violet-100 text-violet-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Chi tiết Layers ({sortJobModalData.layers?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setSortJobTab('json')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              sortJobTab === 'json'
                ? 'bg-violet-100 text-violet-800'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Mã JSON SortJob
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-3 pr-1 min-h-[260px] text-xs">
          {sortJobTab === 'overview' && (
            <div className="space-y-3">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 text-slate-700 flex items-start gap-2.5">
                <Info size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-900">
                    SortJob đã được khởi tạo và đồng bộ lên cụm Job Engine (157.66.80.125)
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Mã ID <strong className="font-mono text-indigo-700">{sortJobModalData.id}</strong> chứa đầy đủ vector, tọa độ xếp, và thông số mọi layer. Bạn chỉ cần gửi mã ID này để kiểm tra hoặc tái hiện lại tác vụ sắp xếp.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between">
                  <span>Danh sách vị trí tem trên tờ in ({sortJobModalData.selected_plan?.items?.length || 0} tem)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Đơn vị: mm</span>
                </div>
                <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100">
                  {sortJobModalData.selected_plan?.items?.map((it: any, idx: number) => (
                    <div key={idx} className="px-3 py-1.5 flex items-center justify-between text-slate-700 hover:bg-slate-50">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center font-bold">
                          #{it.index}
                        </span>
                        <span className="font-semibold text-slate-900">{it.layer_name || `Layer ${idx + 1}`}</span>
                        <span className="text-slate-400 text-[10px]">({it.shape})</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px] text-slate-600">
                        <span>X: <strong>{it.x_mm}</strong></span>
                        <span>Y: <strong>{it.y_mm}</strong></span>
                        <span>{it.width_mm}×{it.height_mm}</span>
                        {it.rotated && <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">Xoay</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sortJobTab === 'layers' && (
            <div className="space-y-2">
              {sortJobModalData.layers?.map((layer: any, idx: number) => (
                <div key={idx} className="p-3 border border-slate-200 rounded-2xl bg-white flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-2xs"
                      style={{ backgroundColor: layer.color || '#8b5cf6' }}
                    >
                      {layer.name?.[0]?.toUpperCase() || `L${idx + 1}`}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs truncate">{layer.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                          {layer.shape}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>Khổ tem: <strong>{layer.width_mm}×{layer.height_mm}mm</strong></span>
                        <span>&bull;</span>
                        <span>Số lượng: <strong className="text-violet-700">{layer.quantity}</strong></span>
                        {layer.has_vector_mask && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold text-[9px] border border-emerald-200">
                            Vector Mask
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {layer.source_file && (
                    <div className="text-right text-[11px] text-slate-500 truncate max-w-[180px]">
                      <span className="text-slate-400 block text-[9px]">File nguồn</span>
                      <span className="font-medium text-slate-700 truncate block" title={layer.source_file.name}>
                        {layer.source_file.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {sortJobTab === 'json' && (
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() => handleCopyJobJson(sortJobModalData)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md transition cursor-pointer"
                >
                  {copiedJson ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedJson ? 'Đã sao chép!' : 'Sao chép JSON'}</span>
                </button>
              </div>
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] leading-relaxed overflow-auto max-h-[320px] select-all border border-slate-800">
                {JSON.stringify(sortJobModalData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSortJobModalData(null)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadSortJobJson(sortJobModalData)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer shadow-2xs"
            >
              <Download size={14} />
              <span>Tải tệp JSON</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyJobId(sortJobModalData.id)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/25 active:scale-95 transition cursor-pointer"
            >
              {copiedJobId ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
              <span>{copiedJobId ? 'Đã chép ID!' : 'Sao chép ID để kiểm tra'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
