import React from 'react';
import { Layers } from 'lucide-react';
import { ColorAdjustSettings, CurveChannelType, ThemeClasses } from '../types';
import { ColorCurveEditor } from '../../ColorCurveEditor';

interface CurvesColorSectionProps {
  isLightMode: boolean;
  theme: ThemeClasses;
  colorSettings: ColorAdjustSettings;
  curveChannel: CurveChannelType;
  onCurveChannelChange: (ch: CurveChannelType) => void;
  onUpdateColorSetting: <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => void;
}

export const CurvesColorSection: React.FC<CurvesColorSectionProps> = ({
  isLightMode,
  theme,
  colorSettings,
  curveChannel,
  onCurveChannelChange,
  onUpdateColorSetting
}) => {
  return (
    <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${theme.cardBg}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-xs flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Layers size={14} className="text-slate-500" />
            <span>Đường cong màu Curves</span>
          </h4>
        </div>

        {/* Kênh Curves */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg border bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
          {(['rgb', 'red', 'green', 'blue'] as CurveChannelType[]).map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onCurveChannelChange(ch)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium uppercase transition cursor-pointer ${
                curveChannel === ch
                  ? 'bg-[#999] text-white shadow-xs'
                  : `${theme.textMuted} hover:text-slate-800 dark:hover:text-slate-200`
              }`}
            >
              {ch}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-center p-4">
        <ColorCurveEditor
          channel={curveChannel}
          points={
            curveChannel === 'rgb'
              ? colorSettings.curveRGB
              : curveChannel === 'red'
              ? colorSettings.curveRed
              : curveChannel === 'green'
              ? colorSettings.curveGreen
              : colorSettings.curveBlue
          }
          onChange={(pts) => {
            const key =
              curveChannel === 'rgb'
                ? 'curveRGB'
                : curveChannel === 'red'
                ? 'curveRed'
                : curveChannel === 'green'
                ? 'curveGreen'
                : 'curveBlue';
            onUpdateColorSetting(key, pts);
          }}
          onChannelChange={onCurveChannelChange}
          isLightMode={isLightMode}
        />
      </div>
    </div>
  );
};
