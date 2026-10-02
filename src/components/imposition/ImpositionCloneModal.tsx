import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, Layers, FileStack, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageItem } from './types';

export interface ImpositionCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantity: number;
  allPages: PageItem[];
  onApplyQuantity: (qty: number) => void;
  onApplyPages: (pages: PageItem[]) => void;
}

interface PageSel {
  selected: boolean;
  copies: number;
}

type Mode = 'clone' | 'pages';

const PAGE_SIZE = 50;

export const ImpositionCloneModal: React.FC<ImpositionCloneModalProps> = ({
  isOpen,
  onClose,
  quantity,
  allPages,
  onApplyQuantity,
  onApplyPages,
}) => {
  const [mode, setMode] = useState<Mode>('clone');
  const [cloneQty, setCloneQty] = useState(quantity);
  const [pageSelections, setPageSelections] = useState<PageSel[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const lastClickedIdxRef = useRef<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(allPages.length / PAGE_SIZE));

  // Reset state whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    const defaultMode: Mode = allPages.length > 1 ? 'pages' : 'clone';
    setMode(defaultMode);
    setCloneQty(quantity);
    setPageSelections(allPages.map(p => ({
      selected: (p.copies ?? 1) > 0,
      copies: p.copies !== undefined ? p.copies : 1,
    })));
    setCurrentPage(0);
    lastClickedIdxRef.current = null;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // ── Computed (phải trước early return) ────────────────
  const allSelected = pageSelections.length > 0 && pageSelections.every(s => s.selected);
  const someSelected = pageSelections.some(s => s.selected) && !allSelected;
  const totalCopies = pageSelections.reduce((sum, s) => sum + (s.selected ? s.copies : 0), 0);
  const selectedCount = pageSelections.filter(s => s.selected).length;

  const pageStart = currentPage * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, allPages.length);
  const visiblePages = allPages.slice(pageStart, pageEnd);
  const visibleSel = pageSelections.slice(pageStart, pageEnd);
  const pageAllSelected = visibleSel.length > 0 && visibleSel.every(s => s.selected);
  const pageSomeSelected = visibleSel.some(s => s.selected) && !pageAllSelected;

  const handleApply = useCallback(() => {
    if (mode === 'clone') {
      onApplyQuantity(Math.max(1, cloneQty));
    } else {
      const updatedPages = allPages.map((page, i) => {
        const sel = pageSelections[i];
        return {
          ...page,
          copies: sel && sel.selected ? sel.copies : 0,
        };
      });
      onApplyPages(updatedPages);
    }
    onClose();
  }, [mode, cloneQty, allPages, pageSelections, onApplyQuantity, onApplyPages, onClose]);

  const toggleAll = useCallback(() => {
    const newVal = !allSelected;
    setPageSelections(prev => prev.map(s => ({ ...s, selected: newVal })));
  }, [allSelected]);

  const handlePageClick = useCallback((globalIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    setPageSelections(prev => {
      const next = [...prev];
      if (e.shiftKey && lastClickedIdxRef.current !== null) {
        const from = Math.min(lastClickedIdxRef.current, globalIdx);
        const to = Math.max(lastClickedIdxRef.current, globalIdx);
        const newVal = !prev[globalIdx].selected;
        for (let j = from; j <= to; j++) {
          next[j] = { ...next[j], selected: newVal };
        }
      } else {
        next[globalIdx] = { ...next[globalIdx], selected: !prev[globalIdx].selected };
      }
      lastClickedIdxRef.current = globalIdx;
      return next;
    });
  }, []);

  const setCopies = useCallback((globalIdx: number, val: number) => {
    const clamped = Math.max(0, Math.min(999, val));
    setPageSelections(prev => {
      const next = [...prev];
      next[globalIdx] = { ...next[globalIdx], copies: clamped, selected: clamped > 0 };
      return next;
    });
  }, []);

  const togglePageRange = useCallback(() => {
    const newVal = !pageAllSelected;
    setPageSelections(prev => {
      const next = [...prev];
      for (let j = pageStart; j < pageEnd; j++) {
        next[j] = { ...next[j], selected: newVal };
      }
      return next;
    });
  }, [pageAllSelected, pageStart, pageEnd]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[86vh] flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 shrink-0">
          <Layers size={15} className="text-violet-500 shrink-0" />
          <span className="font-semibold text-sm text-slate-800">Quản lý nhân bản</span>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Mode tabs (chỉ hiện khi có nhiều trang) ──────── */}
        {allPages.length > 1 && (
          <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0">
            <button
              type="button"
              onClick={() => setMode('clone')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium transition cursor-pointer border ${
                mode === 'clone'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Layers size={12} />
              Nhân bản
            </button>
            <button
              type="button"
              onClick={() => setMode('pages')}
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-medium transition cursor-pointer border ${
                mode === 'pages'
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <FileStack size={12} />
              Chọn nhiều trang
            </button>
          </div>
        )}

        {/* ── Body (scrollable) ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto min-h-0">

          {/* Clone mode */}
          {mode === 'clone' && (
            <div className="flex flex-col items-center gap-3 px-5 py-5">
              <p className="text-sm text-slate-500 self-start">In mỗi thiết kế với số bản sau:</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setCloneQty(q => Math.max(1, q - 1))}
                    className="w-8 h-10 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer text-sm"
                  >▼</button>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={cloneQty}
                    onChange={e => setCloneQty(Math.max(1, Math.min(9999, parseInt(e.target.value) || 1)))}
                    onFocus={e => e.target.select()}
                    onKeyDown={e => { if (e.key === 'Enter') handleApply(); }}
                    className="w-20 text-center font-bold text-xl text-slate-800 py-2 focus:outline-none focus:text-violet-700 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setCloneQty(q => Math.min(9999, q + 1))}
                    className="w-8 h-10 flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition cursor-pointer text-sm"
                  >▲</button>
                </div>
                <span className="text-sm text-slate-500 font-medium">bản</span>
              </div>
              {allPages.length === 1 && (
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  PDF có 1 trang · mặc định 1 bản in
                </p>
              )}
            </div>
          )}

          {/* Pages mode */}
          {mode === 'pages' && (
            <div className="flex flex-col">
              {/* Select-all bar (áp dụng toàn bộ) */}
              <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-3 bg-slate-50/60 shrink-0">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-xs text-slate-600 hover:text-violet-700 transition cursor-pointer select-none"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition shrink-0 ${
                    allSelected
                      ? 'bg-violet-600 border-violet-600'
                      : someSelected
                        ? 'bg-violet-100 border-violet-400'
                        : 'border-slate-300 bg-white'
                  }`}>
                    {allSelected && <Check size={9} className="text-white" strokeWidth={3} />}
                    {someSelected && <div className="w-2 h-[2px] bg-violet-600 rounded" />}
                  </div>
                  <span className="font-medium">{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</span>
                </button>
                <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
                  {selectedCount}/{allPages.length} trang
                </span>
              </div>

              {/* Pagination top (chỉ hiện khi > PAGE_SIZE trang) */}
              {allPages.length > PAGE_SIZE && (
                <div className="px-5 py-1.5 border-b border-slate-100 flex items-center gap-2 bg-white shrink-0">
                  {/* Toggle trang hiện tại */}
                  <button
                    type="button"
                    onClick={togglePageRange}
                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-violet-700 transition cursor-pointer select-none"
                  >
                    <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition shrink-0 ${
                      pageAllSelected
                        ? 'bg-violet-500 border-violet-500'
                        : pageSomeSelected
                          ? 'bg-violet-100 border-violet-400'
                          : 'border-slate-300 bg-white'
                    }`}>
                      {pageAllSelected && <Check size={8} className="text-white" strokeWidth={3} />}
                      {pageSomeSelected && <div className="w-1.5 h-[2px] bg-violet-600 rounded" />}
                    </div>
                    <span>Trang này</span>
                  </button>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      disabled={currentPage === 0}
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[11px] text-slate-500 tabular-nums px-1">
                      {pageStart + 1}–{pageEnd} / {allPages.length}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage >= totalPages - 1}
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              )}

              {/* Hint shift/ctrl */}
              {allPages.length > 1 && (
                <div className="px-5 py-1 text-[10px] text-slate-400 bg-slate-50/40 border-b border-slate-100 shrink-0">
                  Shift+click để chọn dải · Ctrl+click để chọn nhiều
                </div>
              )}

              {/* Page rows */}
              <div className="divide-y divide-slate-50">
                {visiblePages.map((page, localI) => {
                  const globalIdx = pageStart + localI;
                  const sel: PageSel = pageSelections[globalIdx] ?? { selected: true, copies: 1 };
                  const thumb = page.thumb || (page as any).originalThumb;
                  const label = page.name || `Trang ${globalIdx + 1}`;
                  return (
                    <div
                      key={globalIdx}
                      className={`flex items-center gap-2.5 px-5 py-2 transition-opacity ${!sel.selected ? 'opacity-40' : ''}`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={e => handlePageClick(globalIdx, e)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition cursor-pointer ${
                          sel.selected
                            ? 'bg-violet-600 border-violet-600'
                            : 'border-slate-300 bg-white hover:border-violet-400'
                        }`}
                      >
                        {sel.selected && <Check size={9} className="text-white" strokeWidth={3} />}
                      </button>

                      {/* Thumb */}
                      <div className="w-8 h-8 rounded-md overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                        {thumb ? (
                          <img src={thumb} alt={label} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileStack size={11} className="text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Label */}
                      <span className="text-xs text-slate-700 flex-1 truncate leading-none">
                        {label}
                      </span>

                      {/* Copies stepper */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={!sel.selected || sel.copies <= 0}
                          onClick={() => setCopies(globalIdx, sel.copies - 1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition text-[10px] disabled:opacity-30 cursor-pointer"
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={sel.copies}
                          disabled={!sel.selected}
                          onChange={e => setCopies(globalIdx, parseInt(e.target.value) || 0)}
                          onFocus={e => e.target.select()}
                          className="w-10 text-center text-xs font-bold text-slate-800 border border-slate-200 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-400 disabled:opacity-30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none bg-transparent"
                        />
                        <button
                          type="button"
                          disabled={!sel.selected || sel.copies >= 999}
                          onClick={() => setCopies(globalIdx, sel.copies + 1)}
                          className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition text-[10px] disabled:opacity-30 cursor-pointer"
                        >+</button>
                        <span className="text-[10px] text-slate-400 w-5">bản</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination bottom */}
              {allPages.length > PAGE_SIZE && (
                <div className="px-5 py-2 border-t border-slate-100 flex items-center justify-center gap-2 bg-white shrink-0">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-500 hover:text-violet-600 hover:bg-violet-50 border border-slate-200 transition disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft size={12} /> Trước
                  </button>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    Trang {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-slate-500 hover:text-violet-600 hover:bg-violet-50 border border-slate-200 transition disabled:opacity-30 cursor-pointer"
                  >
                    Sau <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-slate-100 shrink-0">
          {mode === 'pages' && (
            <span className="text-xs text-slate-500 mr-auto leading-none">
              Tổng: <strong className="text-slate-800 tabular-nums">{totalCopies}</strong> bản in
            </span>
          )}
          {mode === 'clone' && <span className="mr-auto" />}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={mode === 'pages' && totalCopies === 0}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition cursor-pointer disabled:opacity-40"
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
