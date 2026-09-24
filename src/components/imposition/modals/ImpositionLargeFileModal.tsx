import React, { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Layers,
  FileCheck2,
  XCircle,
  ChevronDown
} from 'lucide-react';

export interface LargeFilePromptData {
  file: File;
  numPages: number;
  sizeBytes: number;
}

export type LargeFileChoice =
  | { mode: 'all' }
  | { mode: 'batch_10'; startPage: number }
  | { mode: 'skip' };

export interface ImpositionLargeFileModalProps {
  isOpen: boolean;
  data: LargeFilePromptData | null;
  onChoice: (choice: LargeFileChoice) => void;
  onClose: () => void;
}

export const ImpositionLargeFileModal: React.FC<ImpositionLargeFileModalProps> = ({
  isOpen,
  data,
  onChoice,
  onClose,
}) => {
  const [startPage, setStartPage] = useState<number>(1);

  if (!isOpen || !data) return null;

  const numPages = data.numPages;
  const sizeMb = (data.sizeBytes / (1024 * 1024)).toFixed(1);

  // Tạo danh sách các gói 10 trang: 1-10, 11-20, 21-30...
  const batches: { start: number; end: number; label: string }[] = [];
  for (let s = 1; s <= numPages; s += 10) {
    const e = Math.min(numPages, s + 9);
    batches.push({
      start: s,
      end: e,
      label: `Trang ${s} – ${e} (${e - s + 1} trang)`,
    });
  }

  const currentEnd = Math.min(numPages, startPage + 9);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với icon cảnh báo màu cam */}
        <div className="px-5 py-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
              Cảnh báo tệp nhiều trang & dung lượng lớn
            </h3>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Phát hiện tệp PDF có khối lượng trang đáng kể
            </p>
          </div>
        </div>

        {/* Thông tin chi tiết tệp */}
        <div className="p-5 flex flex-col gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center shrink-0">
              <FileText size={26} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={data.file.name}>
                {data.file.name}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span className="font-semibold text-violet-700 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/50 px-2 py-0.5 rounded-md">
                  {numPages} trang
                </span>
                <span>•</span>
                <span>Dung lượng: {sizeMb} MB</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Việc trích xuất và hiển thị tất cả <b>{numPages} trang</b> cùng một lúc có thể làm chậm trình duyệt và chiếm dụng nhiều bộ nhớ RAM. Vui lòng chọn chế độ nạp phù hợp:
          </p>

          {/* Lựa chọn chế độ */}
          <div className="flex flex-col gap-2.5">
            {/* Chế độ 1: Import tất cả các trang */}
            <button
              type="button"
              onClick={() => onChoice({ mode: 'all' })}
              className="group flex items-start gap-3 p-3.5 rounded-xl border border-violet-200 dark:border-violet-800/60 hover:border-violet-500 bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-100/60 dark:hover:bg-violet-900/40 text-left transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                <Layers size={17} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-950 dark:text-violet-200">
                    Import hết tất cả trang ({numPages} trang)
                  </span>
                  <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold uppercase">
                    Toàn bộ
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Trích xuất đủ {numPages} trang thành {numPages} layer riêng biệt. (Có thể mất thời gian tải)
                </p>
              </div>
            </button>

            {/* Chế độ 2: Chỉ import từng 10 trang */}
            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col gap-2.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <FileCheck2 size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                      Chỉ import từng 10 trang (Khuyên dùng)
                    </span>
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                      Tối ưu RAM
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Trích xuất 10 trang để xử lý mượt mà. Bạn có thể chọn cụm 10 trang mong muốn:
                  </p>
                </div>
              </div>

              {/* Bộ chọn cụm 10 trang */}
              <div className="flex items-center gap-2 pl-11">
                <div className="relative flex-1">
                  <select
                    value={startPage}
                    onChange={(e) => setStartPage(Number(e.target.value))}
                    className="w-full appearance-none px-3 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-white pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  >
                    {batches.map((b) => (
                      <option key={b.start} value={b.start}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => onChoice({ mode: 'batch_10', startPage })}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  Nạp trang {startPage} – {currentEnd}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer với nút Bỏ qua */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Bạn có thể chia nhỏ file trước khi nạp nếu cần
          </span>
          <button
            type="button"
            onClick={() => onChoice({ mode: 'skip' })}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
          >
            <XCircle size={14} />
            <span>Bỏ qua tệp này</span>
          </button>
        </div>
      </div>
    </div>
  );
};
