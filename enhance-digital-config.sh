#!/bin/bash

echo "🔧 Thêm tính năng Import/Export cấu hình và Validation"

# Tạo file patch để thêm các tính năng bổ sung
cat > /tmp/digital-config-enhance.js << 'EOF'
const fs = require('fs');

const filePath = '/root/toolxprint/src/components/PriceCalculatorDigital.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Thêm các hàm helper cho import/export và validation
const helperFunctions = `
  // Configuration management helpers
  const exportConfig = () => {
    const configData = {
      digitalConfig,
      machines,
      paperDatabase,
      config,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`toolxprint-config-\${new Date().toISOString().split('T')[0]}.json\`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const configData = JSON.parse(e.target?.result as string);
        if (configData.digitalConfig) setDigitalConfig(configData.digitalConfig);
        if (configData.machines) setMachines(configData.machines);
        if (configData.paperDatabase) setPaperDatabase(configData.paperDatabase);
        if (configData.config) setConfig(configData.config);
        alert('✅ Cấu hình đã được import thành công!');
      } catch (error) {
        alert('❌ Lỗi import cấu hình: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const resetToDefaults = () => {
    if (confirm('⚠️ Bạn có chắc muốn reset về cấu hình mặc định? Tất cả cài đặt hiện tại sẽ bị mất!')) {
      setDigitalConfig({
        clickPrice: 150,
        clickTable: [
          { maxLength: 330, clicks: 1 },
          { maxLength: 487, clicks: 2 },
          { maxLength: 700, clicks: 3 },
          { maxLength: 1200, clicks: 4 },
        ],
        preferredPapers: [],
        maxSheetsForPreferred: 100,
        maxPriceForPreferred: 200000
      });
      setMachines(DEFAULT_MACHINES);
      setPaperDatabase(DEFAULT_PAPER_DATABASE);
      setConfig({
        laminationPrice: 5000, profitMargin: 0, maxCutWidth: 0, minPrintSize: 250,
        wasteBase: 50, wastePercent1Side: 2, wastePercent2Side: 3,
        defaultFinishings: [
          { type: 'Bế Demi', defaultPrice: 0, unit: 'bộ' },
          { type: 'Cấn đường', defaultPrice: 0, unit: 'bộ' },
          { type: 'UV Định hình', defaultPrice: 0, unit: 'm²' },
          { type: 'Ép kim', defaultPrice: 0, unit: 'm²' },
          { type: 'Đóng cuốn', defaultPrice: 0, unit: 'bộ' },
          { type: 'Dán bao thư', defaultPrice: 0, unit: 'cái' },
          { type: 'Bồi carton', defaultPrice: 0, unit: 'm²' },
        ]
      });
      alert('✅ Đã reset về cấu hình mặc định!');
    }
  };

  const validateConfig = () => {
    const issues = [];
    if (digitalConfig.clickPrice <= 0) issues.push('Giá click phải > 0');
    if (digitalConfig.clickTable.length === 0) issues.push('Bảng click không được trống');
    if (machines.length === 0) issues.push('Phải có ít nhất 1 máy in');
    if (paperDatabase.length === 0) issues.push('Database giấy không được trống');
    return issues;
  };`;

// Tìm vị trí để chèn helper functions (sau các useState)
const insertPosition = content.indexOf('  // Local state for numeric inputs');
if (insertPosition !== -1) {
  content = content.slice(0, insertPosition) + helperFunctions + '\n\n  ' + content.slice(insertPosition);
  console.log('✅ Added helper functions');
} else {
  console.log('❌ Could not find insertion point for helper functions');
}

// Thêm UI cho import/export trong phần cấu hình
const configUIPattern = /<div className="bg-white rounded-xl shadow-sm border overflow-hidden">\s*<div className="p-4 border-b bg-slate-50 flex justify-between items-center">\s*<h2 className="font-bold text-slate-800 flex items-center gap-2"><Settings size={18}\/> Cấu Hình Digital<\/h2>/;

const newConfigUI = `<div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Settings size={18}/> Cấu Hình Digital</h2>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])}
                      className="hidden"
                      id="config-import"
                    />
                    <label
                      htmlFor="config-import"
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 cursor-pointer flex items-center gap-1"
                    >
                      <Upload size={12}/> Import
                    </label>
                    <button
                      onClick={exportConfig}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <Download size={12}/> Export
                    </button>
                    <button
                      onClick={resetToDefaults}
                      className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center gap-1"
                    >
                      <RefreshCw size={12}/> Reset
                    </button>
                  </div>
                </div>`;

if (configUIPattern.test(content)) {
  content = content.replace(configUIPattern, newConfigUI);
  console.log('✅ Added import/export UI');
} else {
  console.log('❌ Could not find config UI pattern');
}

fs.writeFileSync(filePath, content);
console.log('🎉 Enhanced features added successfully!');
EOF

# Chạy script cải tiến
node /tmp/digital-config-enhance.js

echo "✅ Hoàn thành thêm tính năng cải tiến"
echo "📋 Các tính năng mới:"
echo "   - Import/Export cấu hình dạng JSON"
echo "   - Reset về cấu hình mặc định"
echo "   - Validation cấu hình"
echo "   - UI quản lý cấu hình tốt hơn"
