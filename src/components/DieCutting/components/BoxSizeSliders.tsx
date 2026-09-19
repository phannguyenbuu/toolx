import React, { useEffect, useState } from 'react';
import { usePointer } from '../stores/selectionStore';

export const BoxSizeSliders: React.FC = () => {
  const {
    boxWidth,
    setBoxWidth,
    boxLength,
    setBoxLength,
    boxHeight,
    setBoxHeight,
    pulseResize,
  } = usePointer();

  const [widthDraft, setWidthDraft] = useState(boxWidth);
  const [lengthDraft, setLengthDraft] = useState(boxLength);
  const [heightDraft, setHeightDraft] = useState(boxHeight);

  useEffect(() => {
    setWidthDraft(boxWidth);
  }, [boxWidth]);

  useEffect(() => {
    setLengthDraft(boxLength);
  }, [boxLength]);

  useEffect(() => {
    setHeightDraft(boxHeight);
  }, [boxHeight]);

  const commitWidth = () => {
    setBoxWidth(Number(widthDraft));
    pulseResize();
  };
  const commitLength = () => {
    setBoxLength(Number(lengthDraft));
    pulseResize();
  };
  const commitHeight = () => {
    setBoxHeight(Number(heightDraft));
    pulseResize();
  };

  return (
    <div className="flex flex-col gap-3 py-1">
      {/* Width Slider */}
      <div className="flex items-center gap-3 text-xs">
        <span className="w-14 font-semibold text-slate-600">Rộng (W)</span>
        <input
          type="range"
          min="0.2"
          max="12"
          step="0.01"
          value={widthDraft}
          onChange={(e) => setWidthDraft(Number(e.target.value))}
          onMouseUp={commitWidth}
          onTouchEnd={commitWidth}
          onKeyUp={commitWidth}
          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="w-16 text-right font-mono font-bold text-indigo-600">
          {Math.round(widthDraft * 100)} mm
        </span>
      </div>

      {/* Length Slider */}
      <div className="flex items-center gap-3 text-xs">
        <span className="w-14 font-semibold text-slate-600">Dài (L)</span>
        <input
          type="range"
          min="0.2"
          max="12"
          step="0.01"
          value={lengthDraft}
          onChange={(e) => setLengthDraft(Number(e.target.value))}
          onMouseUp={commitLength}
          onTouchEnd={commitLength}
          onKeyUp={commitLength}
          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="w-16 text-right font-mono font-bold text-indigo-600">
          {Math.round(lengthDraft * 100)} mm
        </span>
      </div>

      {/* Height Slider */}
      <div className="flex items-center gap-3 text-xs">
        <span className="w-14 font-semibold text-slate-600">Cao (H)</span>
        <input
          type="range"
          min="0.20"
          max="12"
          step="0.01"
          value={heightDraft}
          onChange={(e) => setHeightDraft(Number(e.target.value))}
          onMouseUp={commitHeight}
          onTouchEnd={commitHeight}
          onKeyUp={commitHeight}
          className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <span className="w-16 text-right font-mono font-bold text-indigo-600">
          {Math.round(heightDraft * 100)} mm
        </span>
      </div>
    </div>
  );
};

export default BoxSizeSliders;
