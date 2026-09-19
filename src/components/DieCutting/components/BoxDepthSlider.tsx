import React, { useEffect, useState } from 'react';
import { usePointer } from '../stores/selectionStore';

export const BoxDepthSlider: React.FC = () => {
  const [sliderValue, setSliderValue] = useState(0);
  const { boxDepth, setBoxDepth, pulseResize } = usePointer();

  useEffect(() => {
    const next = boxDepth / 10;
    if (next !== sliderValue) {
      setSliderValue(next);
    }
  }, [boxDepth, sliderValue]);

  const commitDepth = () => {
    setBoxDepth(sliderValue * 10);
    pulseResize();
  };

  const depthMm = (sliderValue * 10).toFixed(2);

  return (
    <div className="flex items-center gap-3 text-xs py-1">
      <span className="w-14 font-semibold text-slate-600">Độ dày (D)</span>
      <input
        type="range"
        min={0.1}
        max={0.3}
        step={0.05}
        value={sliderValue}
        onChange={(e) => {
          const raw = parseFloat(e.target.value);
          const snapped = Math.round(raw / 0.05) * 0.05;
          setSliderValue(Number(snapped.toFixed(2)));
        }}
        onMouseUp={commitDepth}
        onTouchEnd={commitDepth}
        onKeyUp={commitDepth}
        className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
      <span className="w-16 text-right font-mono font-bold text-indigo-600">{depthMm} mm</span>
    </div>
  );
};

export default BoxDepthSlider;
