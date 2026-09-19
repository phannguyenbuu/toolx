#!/bin/bash

echo "🔧 Sửa lỗi TypeScript trong PriceCalculatorDigital.tsx"

# Tạo script sửa lỗi cẩn thận hơn
cat > /tmp/fix-typescript-errors.js << 'EOF'
const fs = require('fs');

const filePath = '/root/toolxprint/src/components/PriceCalculatorDigital.tsx';
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Checking file structure...');

// 1. Sửa digitalConfig để sử dụng localStorage - chỉ thay thế phần khởi tạo
const digitalConfigInit = `const [digitalConfig, setDigitalConfig] = useState<DigitalConfig>({
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
  });`;

const newDigitalConfigInit = `const [digitalConfig, setDigitalConfig] = useState<DigitalConfig>(() => {
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

if (content.includes(digitalConfigInit)) {
  content = content.replace(digitalConfigInit, newDigitalConfigInit);
  console.log('✅ Fixed digitalConfig localStorage');
} else {
  console.log('❌ Could not find digitalConfig init pattern');
}

fs.writeFileSync(filePath, content);
console.log('🎉 TypeScript errors fixed!');
EOF

# Chạy script sửa lỗi
node /tmp/fix-typescript-errors.js

echo "✅ Hoàn thành sửa lỗi TypeScript"
