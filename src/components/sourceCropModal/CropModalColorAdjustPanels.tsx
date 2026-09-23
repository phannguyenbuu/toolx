import React, { useState } from 'react';
import { ColorAdjustSettings, CurvePoint } from '../../utils/colorAdjustment';
import { ColorCurveEditor, CurveChannelType } from '../ColorCurveEditor';
import { ColorTabType } from './types';

export interface CropModalColorAdjustPanelsProps {
  colorTab: ColorTabType;
  colorSettings: ColorAdjustSettings;
  updateSetting: <K extends keyof ColorAdjustSettings>(key: K, value: ColorAdjustSettings[K]) => void;
}

export const CropModalColorAdjustPanels: React.FC<CropModalColorAdjustPanelsProps> = ({
  colorTab,
  colorSettings,
  updateSetting,
}) => {
  const [curveChannel, setCurveChannel] = useState<CurveChannelType>('rgb');

  return (
    <>
      {/* TAB: COLOR BALANCE */}
      {colorTab === 'balance' && (
        <div className="space-y-4">
          <div className="p-2.5 rounded-xl bg-violet-50/60 border border-violet-100 text-[11px] text-violet-800">
            Cân bằng màu (Color Balance) bù trừ quang sai màu sắc cho ấn phẩm in offset & kỹ thuật số.
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span className="text-cyan-600 font-bold">Cyan (-100)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.balanceCyanRed}</span>
              <span className="text-rose-600 font-bold">Red (+100)</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.balanceCyanRed}
              onChange={e => updateSetting('balanceCyanRed', Number(e.target.value))}
              className="w-full accent-cyan-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span className="text-fuchsia-600 font-bold">Magenta (-100)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.balanceMagentaGreen}</span>
              <span className="text-emerald-600 font-bold">Green (+100)</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.balanceMagentaGreen}
              onChange={e => updateSetting('balanceMagentaGreen', Number(e.target.value))}
              className="w-full accent-fuchsia-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span className="text-amber-600 font-bold">Yellow (-100)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.balanceYellowBlue}</span>
              <span className="text-blue-600 font-bold">Blue (+100)</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.balanceYellowBlue}
              onChange={e => updateSetting('balanceYellowBlue', Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB: PHOTOSHOP CURVES */}
      {colorTab === 'curves' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800">Đường cong sắc độ (Curves)</span>
            <span className="text-[10px] text-slate-400">Kiểu Photoshop</span>
          </div>
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
            onChange={(newPoints: CurvePoint[]) => {
              if (curveChannel === 'rgb') updateSetting('curveRGB', newPoints);
              else if (curveChannel === 'red') updateSetting('curveRed', newPoints);
              else if (curveChannel === 'green') updateSetting('curveGreen', newPoints);
              else if (curveChannel === 'blue') updateSetting('curveBlue', newPoints);
            }}
            onChannelChange={ch => setCurveChannel(ch)}
            isLightMode={true}
          />
        </div>
      )}

      {/* TAB: BRIGHTNESS & CONTRAST */}
      {colorTab === 'brightness' && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-medium text-slate-600">Độ sáng (Brightness)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.brightness}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.brightness}
              onChange={e => updateSetting('brightness', Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-medium text-slate-600">Độ tương phản (Contrast)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.contrast}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.contrast}
              onChange={e => updateSetting('contrast', Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB: HSL */}
      {colorTab === 'hsl' && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-medium text-slate-600">Sắc độ (Hue)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.hue}°</span>
            </div>
            <input
              type="range"
              min={-180}
              max={180}
              value={colorSettings.hue}
              onChange={e => updateSetting('hue', Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-medium text-slate-600">Độ bão hòa (Saturation)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.saturation}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.saturation}
              onChange={e => updateSetting('saturation', Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-medium text-slate-600">Độ sáng (Lightness)</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.lightness}</span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              value={colorSettings.lightness}
              onChange={e => updateSetting('lightness', Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB: CMYK */}
      {colorTab === 'cmyk' && (
        <div className="space-y-3">
          {(['cyan', 'magenta', 'yellow', 'black'] as const).map(ch => (
            <div key={ch}>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-medium text-slate-600 uppercase">
                  {ch === 'cyan' ? 'Cyan (Xanh Lơ)' : ch === 'magenta' ? 'Magenta (Đỏ Sen)' : ch === 'yellow' ? 'Yellow (Vàng)' : 'Black (Đen K)'}
                </span>
                <span className="font-mono font-bold text-violet-700">{colorSettings[ch]}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings[ch]}
                onChange={e => updateSetting(ch, Number(e.target.value))}
                className={`w-full cursor-pointer ${
                  ch === 'cyan' ? 'accent-cyan-500' : ch === 'magenta' ? 'accent-fuchsia-500' : ch === 'yellow' ? 'accent-amber-400' : 'accent-slate-900'
                }`}
              />
            </div>
          ))}

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-medium text-slate-600">Bù xám GCR Level</span>
              <span className="font-mono font-bold text-violet-700">{colorSettings.gcrLevel}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={colorSettings.gcrLevel}
              onChange={e => updateSetting('gcrLevel', Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB: RGB */}
      {colorTab === 'rgb' && (
        <div className="space-y-3">
          {(['red', 'green', 'blue'] as const).map(ch => (
            <div key={ch}>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-medium text-slate-600 uppercase">
                  {ch === 'red' ? 'Đỏ (Red)' : ch === 'green' ? 'Lục (Green)' : 'Lam (Blue)'}
                </span>
                <span className="font-mono font-bold text-violet-700">{colorSettings[ch]}</span>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                value={colorSettings[ch]}
                onChange={e => updateSetting(ch, Number(e.target.value))}
                className={`w-full cursor-pointer ${
                  ch === 'red' ? 'accent-rose-500' : ch === 'green' ? 'accent-emerald-500' : 'accent-blue-500'
                }`}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
};
