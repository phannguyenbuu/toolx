import React from 'react';
import { LayoutGrid, Grid3X3, Circle, Loader2 } from 'lucide-react';
import { LayoutPlan } from '../../../utils/layoutSolver';
import { ImpositionConfig, ManualRotateType, IccProfile } from '../types';

interface ImpositionPrintSettingsProps {
  config: ImpositionConfig;
  setConfig: React.Dispatch<React.SetStateAction<ImpositionConfig>>;
  currentPlan: LayoutPlan | null;
  plansCount: number;
  onOpenPlanModal: () => void;
  manualRotate: ManualRotateType;
  setManualRotate: (r: ManualRotateType) => void;
  sheets: number;
  unitPrice: number;
  setUnitPrice: (p: number) => void;
  totalCost: number;
  pricePerItem: number;
  iccProfiles: IccProfile[];
  isLoadingIccProfiles: boolean;
}

export const ImpositionPrintSettings: React.FC<ImpositionPrintSettingsProps> = ({
  config,
  setConfig,
  currentPlan,
  plansCount,
  onOpenPlanModal,
  manualRotate,
  setManualRotate,
  sheets,
  unitPrice,
  setUnitPrice,
  totalCost,
  pricePerItem,
  iccProfiles,
  isLoadingIccProfiles
}) => {
  return (
    <>
      {/* Plan selector */}
      <div className="p-4 border-b">
        <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
          <LayoutGrid size={14} className="text-violet-500" /> Các phương án xếp hình
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-700 bg-gray-100 px-3 py-1.5 rounded-lg flex-1 truncate font-medium">
            {currentPlan?.name || 'Chưa có'}
          </span>
        </div>
        <button
          onClick={onOpenPlanModal}
          className="w-full text-sm text-violet-600 font-medium border border-violet-200 bg-violet-50 px-3 py-2 rounded-lg hover:bg-violet-100 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Grid3X3 size={14} /> Xem các phương án ({plansCount})
        </button>
      </div>

      {/* Manual rotation */}
      <div className="p-4 border-b">
        <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">
          Xoay ảnh trong ô
        </label>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setManualRotate('auto')}
            className={
              'flex-1 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ' +
              (manualRotate === 'auto'
                ? 'bg-white shadow text-violet-700'
                : 'text-gray-600')
            }
          >
            Tự động
          </button>
          <button
            onClick={() => setManualRotate('portrait')}
            className={
              'flex-1 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ' +
              (manualRotate === 'portrait'
                ? 'bg-white shadow text-blue-700'
                : 'text-gray-600')
            }
          >
            Dọc
          </button>
          <button
            onClick={() => setManualRotate('landscape')}
            className={
              'flex-1 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ' +
              (manualRotate === 'landscape'
                ? 'bg-white shadow text-green-700'
                : 'text-gray-600')
            }
          >
            Ngang
          </button>
        </div>
      </div>

      {/* Stats & Price */}
      <div className="p-4 border-b bg-gradient-to-b from-violet-50 to-white">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
            <div className="text-2xl font-medium text-violet-600">{currentPlan?.qty || 0}</div>
            <div className="text-[10px] text-gray-500 uppercase">tem/tờ</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center shadow-sm border">
            <div className="text-2xl font-medium text-gray-700">
              {sheets > 0 ? sheets.toLocaleString() : '-'}
            </div>
            <div className="text-[10px] text-gray-500 uppercase">tờ cần in</div>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={unitPrice.toLocaleString('vi-VN')}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              setUnitPrice(parseInt(v, 10) || 0);
            }}
            className="flex-1 border rounded-lg px-3 py-2 text-right text-sm bg-white font-medium"
          />
          <span className="text-xs text-gray-500 w-12">đ/tờ</span>
        </div>
        {sheets > 0 && (
          <div className="bg-emerald-100 rounded-lg p-3 text-center">
            <div className="text-xl font-medium text-emerald-700">
              {totalCost.toLocaleString()}đ
            </div>
            <div className="text-xs text-emerald-600">
              {Math.round(pricePerItem).toLocaleString()}đ/tem
            </div>
          </div>
        )}
      </div>

      {/* Export settings */}
      <div className="p-4 border-b space-y-3">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 uppercase mb-2">
            Chế độ xuất
          </label>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setConfig({ ...config, processMode: 'vector' })}
              className={
                'flex-1 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ' +
                (config.processMode === 'vector'
                  ? 'bg-white shadow text-blue-700'
                  : 'text-gray-600')
              }
            >
              Vector
            </button>
            <button
              onClick={() => setConfig({ ...config, processMode: 'raster' })}
              className={
                'flex-1 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ' +
                (config.processMode === 'raster'
                  ? 'bg-white shadow text-orange-700'
                  : 'text-gray-600')
              }
            >
              Convert
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              Hệ màu
            </label>
            <select
              value={config.colorMode}
              onChange={(e) => setConfig({ ...config, colorMode: e.target.value as any })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white"
            >
              <option value="original">Giữ nguyên</option>
              <option value="cmyk">CMYK</option>
              <option value="cmyk_k100">CMYK + K100</option>
              <option value="rgb">RGB</option>
              <option value="konica">Konica</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase mb-1">
              DPI
            </label>
            <select
              value={config.dpi}
              onChange={(e) => setConfig({ ...config, dpi: parseInt(e.target.value, 10) })}
              className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white"
            >
              <option value={150}>150</option>
              <option value={300}>300</option>
              <option value={600}>600</option>
              <option value={1200}>1200</option>
            </select>
          </div>
        </div>

        {/* Advanced Color Management Toggle */}
        <div className="mt-3">
          <button
            onClick={() =>
              setConfig({ ...config, useAdvancedColor: !config.useAdvancedColor })
            }
            className={`w-full text-xs font-medium px-3 py-2 rounded-lg border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              config.useAdvancedColor
                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Circle
              size={12}
              className={config.useAdvancedColor ? 'text-blue-500' : 'text-gray-400'}
            />
            Hệ màu nâng cao (3 lớp ICC)
          </button>
        </div>

        {/* Advanced Color Management Panel */}
        {config.useAdvancedColor && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="text-xs font-medium text-blue-700 uppercase mb-2 flex items-center gap-1">
              <Circle size={10} className="text-blue-500" />
              Chuyển đổi ICC 3 lớp
            </div>

            {isLoadingIccProfiles ? (
              <div className="text-center py-2">
                <Loader2 size={16} className="animate-spin mx-auto text-blue-500" />
                <div className="text-xs text-blue-600 mt-1">Đang tải ICC profiles...</div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Source ICC */}
                <div>
                  <label className="block text-[9px] font-medium text-blue-600 uppercase mb-1">
                    1. Nguồn ICC
                  </label>
                  <select
                    value={config.sourceIcc}
                    onChange={(e) => setConfig({ ...config, sourceIcc: e.target.value })}
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  >
                    <option value="original">Ảnh gốc (không chuyển đổi)</option>
                    {iccProfiles.map((profile) => (
                      <option key={profile.filename} value={profile.filename}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ICC 1 */}
                <div>
                  <label className="block text-[9px] font-medium text-blue-600 uppercase mb-1">
                    2. ICC lần 1
                  </label>
                  <select
                    value={config.icc1}
                    onChange={(e) => setConfig({ ...config, icc1: e.target.value })}
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  >
                    <option value="">Bỏ qua lớp này</option>
                    {iccProfiles.map((profile) => (
                      <option key={profile.filename} value={profile.filename}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ICC Output */}
                <div>
                  <label className="block text-[9px] font-medium text-blue-600 uppercase mb-1">
                    3. ICC xuất (chốt)
                  </label>
                  <select
                    value={config.iccOutput}
                    onChange={(e) => setConfig({ ...config, iccOutput: e.target.value })}
                    className="w-full border border-blue-200 rounded-md px-2 py-1.5 text-xs bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  >
                    <option value="">Bỏ qua lớp này</option>
                    {iccProfiles.map((profile) => (
                      <option key={profile.filename} value={profile.filename}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ICC Info */}
                <div className="text-[9px] text-blue-600 bg-blue-100 p-2 rounded border">
                  <div className="font-medium mb-1">Quy trình chuyển đổi:</div>
                  <div className="space-y-0.5">
                    <div>
                      • Nguồn: {config.sourceIcc === 'original' ? 'Ảnh gốc' : config.sourceIcc || 'Chưa chọn'}
                    </div>
                    <div>• Lớp 1: {config.icc1 || 'Bỏ qua'}</div>
                    <div>• Xuất: {config.iccOutput || 'Bỏ qua'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
