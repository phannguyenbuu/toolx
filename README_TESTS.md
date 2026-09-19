# ToolXPrint

![Tests](https://img.shields.io/badge/tests-10%20passed-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-rotation%20%7C%20features%20%7C%20navigation-blue)
![Status](https://img.shields.io/badge/status-production%20ready-success)

Hệ thống quản lý in ấn chuyên nghiệp với tính năng xoay ảnh tự động.

## ✨ Features

- ✅ **Manual Rotation**: Xoay thủ công 0°, 90°, -90°, 180°
- ✅ **Auto-Rotate**: Tự động chọn góc xoay tối ưu
- ✅ **Preview & Output**: Đồng bộ hoàn hảo
- ✅ **E2E Testing**: 10 tests tự động với Playwright

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start frontend
npm run start

# Start Python service
cd python-services
source venv/bin/activate
python server.py

# Run tests
npm run test:e2e
```

## 🧪 Testing

```bash
# Run all tests (headless)
npm run test:e2e

# Run with UI mode
npm run test:e2e:ui

# Quick test script
./run-tests.sh
```

### Test Results

```
✓ Rotation Tests (4 tests)
✓ Feature Tests (4 tests)
✓ Navigation Tests (2 tests)

10 passed (34.9s)
```

## 📁 Project Structure

```
toolxprint/
├── src/                    # React frontend
├── python-services/        # Python backend
├── tests/                  # Playwright E2E tests
├── playwright.config.js    # Test configuration
└── run-tests.sh           # Quick test runner
```

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Fabric.js
- **Backend**: Python, Flask, PIL/Pillow
- **Testing**: Playwright (Chromium headless)
- **CI/CD**: GitHub Actions ready

## 📖 Documentation

- [Test Documentation](tests/README.md)
- [Project Complete Summary](PROJECT_COMPLETE.md)

## 🎯 Status

**Production Ready** - All features tested and working ✅
