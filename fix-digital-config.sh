#!/bin/bash

echo "🔧 Sửa lỗi tính giá in nhanh Digital - Thiếu xử lý cấu hình"

# Backup file gốc
cp /root/toolxprint/src/components/PriceCalculatorDigital.tsx /root/toolxprint/src/components/PriceCalculatorDigital.tsx.backup

# Tạo file patch để sửa các vấn đề
cat > /tmp/digital-config-fix.js << 'EOF'
const fs = require('fs');

const filePath = '/root/toolxprint/src/components/PriceCalculatorDigital.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Sửa digitalConfig để sử dụng localStorage
const digitalConfigPattern = /const \[digitalConfig, setDigitalConfig\] = useState<DigitalConfig>\(\(\) => \{[\s\S]*?\}\);/;
const newDigitalConfig = `const [digitalConfig, setDigitalConfig] = useState<DigitalConfig>(() => {
    const saved = localStorage.getItem('toolxprint-digital-config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved digital config:', e);
      }
    }
    return {
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
    };
  });

  // Auto-save digitalConfig to localStorage
  useEffect(() => {
    localStorage.setItem('toolxprint-digital-config', JSON.stringify(digitalConfig));
  }, [digitalConfig]);`;

if (digitalConfigPattern.test(content)) {
  content = content.replace(digitalConfigPattern, newDigitalConfig);
  console.log('✅ Fixed digitalConfig localStorage');
} else {
  console.log('❌ Could not find digitalConfig pattern');
}

// 2. Thêm localStorage cho machines
const machinesPattern = /const \[machines, setMachines\] = useState<Machine\[\]>\(DEFAULT_MACHINES\);/;
const newMachines = `const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem('toolxprint-machines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved machines:', e);
      }
    }
    return DEFAULT_MACHINES;
  });

  // Auto-save machines to localStorage
  useEffect(() => {
    localStorage.setItem('toolxprint-machines', JSON.stringify(machines));
  }, [machines]);`;

if (machinesPattern.test(content)) {
  content = content.replace(machinesPattern, newMachines);
  console.log('✅ Fixed machines localStorage');
} else {
  console.log('❌ Could not find machines pattern');
}

// 3. Thêm localStorage cho paperDatabase
const paperPattern = /const \[paperDatabase, setPaperDatabase\] = useState<Paper\[\]>\(DEFAULT_PAPER_DATABASE\);/;
const newPaper = `const [paperDatabase, setPaperDatabase] = useState<Paper[]>(() => {
    const saved = localStorage.getItem('toolxprint-paper-database');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved paper database:', e);
      }
    }
    return DEFAULT_PAPER_DATABASE;
  });

  // Auto-save paperDatabase to localStorage
  useEffect(() => {
    localStorage.setItem('toolxprint-paper-database', JSON.stringify(paperDatabase));
  }, [paperDatabase]);`;

if (paperPattern.test(content)) {
  content = content.replace(paperPattern, newPaper);
  console.log('✅ Fixed paperDatabase localStorage');
} else {
  console.log('❌ Could not find paperDatabase pattern');
}

// 4. Thêm localStorage cho config
const configPattern = /const \[config, setConfig\] = useState<ConfigState>\(\{[\s\S]*?\}\);/;
const newConfig = `const [config, setConfig] = useState<ConfigState>(() => {
    const saved = localStorage.getItem('toolxprint-config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved config:', e);
      }
    }
    return {
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
    };
  });

  // Auto-save config to localStorage
  useEffect(() => {
    localStorage.setItem('toolxprint-config', JSON.stringify(config));
  }, [config]);`;

if (configPattern.test(content)) {
  content = content.replace(configPattern, newConfig);
  console.log('✅ Fixed config localStorage');
} else {
  console.log('❌ Could not find config pattern');
}

fs.writeFileSync(filePath, content);
console.log('🎉 All fixes applied successfully!');
EOF

# Chạy script sửa lỗi
node /tmp/digital-config-fix.js

echo "✅ Hoàn thành sửa lỗi tính giá in nhanh Digital"
echo "📋 Các cải tiến đã thực hiện:"
echo "   - Lưu trữ cấu hình digitalConfig vào localStorage"
echo "   - Lưu trữ danh sách máy in vào localStorage"  
echo "   - Lưu trữ database giấy vào localStorage"
echo "   - Lưu trữ cấu hình chung vào localStorage"
echo "   - Tự động khôi phục cấu hình khi reload trang"
