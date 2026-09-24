import React from 'react';
import { HomePageProps } from './home/types';
import {
  HomeMenuCards,
  QRTabsNav,
  QRFormInputs,
  QRStylePanel,
  QRPreviewActions,
  useQRGeneratorState
} from './home/index';

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const {
    activeTab,
    setActiveTab,
    qrContent,
    data,
    setData,
    design,
    setDesign,
    useGradient,
    setUseGradient,
    gradientColors,
    setGradientColors,
    separateEyeColor,
    setSeparateEyeColor,
    logoFile,
    setLogoFile,
    isScanning,
    decodedContent,
    restaurantName,
    setRestaurantName,
    menuItems,
    setMenuItems,
    currentMenuItem,
    setCurrentMenuItem,
    qrRef,
    qrImageInputRef,
    menuImageInputRef,
    historyRefreshTrigger,
    handleQRImageUpload,
    handleMenuImageUpload,
    handleAddMenuItem,
    handleDeleteMenuItem,
    handleLogoUpload,
    handleHistorySelect,
    handleDownload
  } = useQRGeneratorState();

  return (
    <div className="min-h-full bg-slate-50">
      {/* Menu Cards */}
      <HomeMenuCards onNavigate={onNavigate} />

      {/* QR Code Section - Clean Style */}
      <div className="bg-white w-full">
        <div className="px-4 pt-[15px] pb-[15px]">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Tạo QR Code</h2>
                  <p className="text-sm text-slate-400">
                    Tạo mã QR đa dạng định dạng, có bản đồ &amp; tuỳ chỉnh thiết kế.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-9 space-y-6">
                <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-slate-700">1) Loại QR</h3>
                    <span className="text-xs text-slate-400">Chọn loại và nhập dữ liệu</span>
                  </div>

                  <QRTabsNav activeTab={activeTab} setActiveTab={setActiveTab} />

                  <div className="mt-4">
                    <QRFormInputs
                      activeTab={activeTab}
                      data={data}
                      setData={setData}
                      isScanning={isScanning}
                      decodedContent={decodedContent}
                      qrImageInputRef={qrImageInputRef}
                      handleQRImageUpload={handleQRImageUpload}
                      restaurantName={restaurantName}
                      setRestaurantName={setRestaurantName}
                      menuItems={menuItems}
                      setMenuItems={setMenuItems}
                      currentMenuItem={currentMenuItem}
                      setCurrentMenuItem={setCurrentMenuItem}
                      menuImageInputRef={menuImageInputRef}
                      handleMenuImageUpload={handleMenuImageUpload}
                      handleAddMenuItem={handleAddMenuItem}
                      handleDeleteMenuItem={handleDeleteMenuItem}
                    />
                  </div>
                </div>

                <QRStylePanel
                  design={design}
                  setDesign={setDesign}
                  useGradient={useGradient}
                  setUseGradient={setUseGradient}
                  gradientColors={gradientColors}
                  setGradientColors={setGradientColors}
                  separateEyeColor={separateEyeColor}
                  setSeparateEyeColor={setSeparateEyeColor}
                  logoFile={logoFile}
                  setLogoFile={setLogoFile}
                  handleLogoUpload={handleLogoUpload}
                />
              </div>

              {/* Right: Preview */}
              <QRPreviewActions
                qrRef={qrRef}
                qrContent={qrContent}
                handleDownload={handleDownload}
                handleHistorySelect={handleHistorySelect}
                historyRefreshTrigger={historyRefreshTrigger}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
