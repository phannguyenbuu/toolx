import React from 'react';
import {
  Square,
  Circle,
  Star,
  Heart,
  Shield
} from 'lucide-react';
import { VectorKnot, PresetShapeType } from '../../types';
import { generatePresetKnots } from '../../helpers/shapePresets';

interface PresetsTabProps {
  maskW: number;
  maskH: number;
  setKnots: React.Dispatch<React.SetStateAction<VectorKnot[]>>;
  setSelectedKnotId: (id: string | null) => void;
  pushHistory: (newKnots: VectorKnot[]) => void;
}

const PRESETS: {
  id: PresetShapeType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { id: 'rect', label: 'Chữ nhật', icon: Square },
  { id: 'circle', label: 'Hình tròn', icon: Circle },
  { id: 'oval', label: 'Hình Oval', icon: Circle },
  {
    id: 'trapezoid',
    label: 'Hình thang',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18L4 6h16l-2 12H6z" />
      </svg>
    )
  },
  {
    id: 'triangle',
    label: 'Tam giác',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l10 18H2L12 2z" />
      </svg>
    )
  },
  {
    id: 'hexagon',
    label: 'Lục giác',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l8 5v10l-8 5-8-5V7l8-5z" />
      </svg>
    )
  },
  { id: 'star', label: 'Ngôi sao', icon: Star },
  { id: 'heart', label: 'Trái tim', icon: Heart },
  { id: 'badge', label: 'Con tem / Răng cưa', icon: Shield },
  {
    id: 'arch',
    label: 'Khung Vòm (Arch)',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 21V10a8 8 0 0 1 16 0v11H4z" />
      </svg>
    )
  }
];

export const PresetsTab: React.FC<PresetsTabProps> = ({
  maskW,
  maskH,
  setKnots,
  setSelectedKnotId,
  pushHistory
}) => {
  return (
    <div className="p-3.5 space-y-3 flex-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
        Chọn mẫu khuôn bế có sẵn
      </label>

      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                const newKnots = generatePresetKnots(p.id, maskW, maskH);
                setKnots(newKnots);
                setSelectedKnotId(null);
                pushHistory(newKnots);
              }}
              className="p-2.5 rounded-xl bg-white hover:bg-violet-50/80 border border-slate-200 hover:border-violet-300 text-slate-700 hover:text-violet-800 flex items-center gap-2 text-xs font-medium transition cursor-pointer shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-violet-600 shrink-0">
                <Icon size={14} />
              </div>
              <span className="truncate">{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
