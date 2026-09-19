# Playwright E2E Tests

## Cài đặt

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Chạy tests

```bash
# Chạy tất cả tests (headless)
npm run test:e2e

# Chạy với UI mode (interactive)
npm run test:e2e:ui

# Chạy test cụ thể
npx playwright test tests/rotation.spec.js

# Chạy với debug
npx playwright test --debug
```

## Test Coverage

### Rotation Tests
- ✅ Rotate image 90 degrees
- ✅ Auto-rotate landscape to portrait
- ✅ Page loading verification

### API Tests
- ✅ Python service health check
- ✅ Rotation parameter handling

## Kết quả

```
Running 4 tests using 1 worker

  ✓ should rotate image 90 degrees correctly (4.9s)
  ✓ should auto-rotate landscape to portrait correctly (5.1s)
  ✓ should handle multiple rotations correctly (6.1s)
  ✓ should handle rotation parameter in API (48ms)

4 passed (18.1s)
```

## Cấu trúc

```
toolxprint/
├── playwright.config.js    # Playwright configuration
├── tests/
│   └── rotation.spec.js    # Rotation test suite
└── test-results/           # Screenshots & videos (auto-generated)
```

## Features

- Headless browser testing
- Auto screenshot on failure
- Video recording on failure
- Parallel test execution
- Auto-start dev server
