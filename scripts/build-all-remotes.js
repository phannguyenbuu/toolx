/**
 * Script biên dịch tuần tự tất cả các phân hệ remote trong kiến trúc Micro-Frontend
 */
const { execSync } = require('child_process');
const path = require('path');

const MODULES = ['render', 'calc', 'crm', 'imposition', 'designer', 'admin', 'ai'];

console.log('\x1b[36m=======================================================');
console.log('⚡ [Toolx MFE] Bắt đầu build toàn bộ các phân hệ remote');
console.log('=======================================================\x1b[0m\n');

const startTime = Date.now();

for (const mod of MODULES) {
  console.log(`\n▶ [${MODULES.indexOf(mod) + 1}/${MODULES.length}] Đang build phân hệ "${mod}"...`);
  try {
    execSync(`node "${path.resolve(__dirname, 'build-remote.js')}" ${mod}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
  } catch (error) {
    console.error(`\x1b[31m✖ [LỖI] Phân hệ "${mod}" build thất bại!\x1b[0m`);
    process.exit(1);
  }
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n\x1b[32m=======================================================`);
console.log(`🎉 [HOÀN TẤT] Toàn bộ ${MODULES.length} phân hệ remote đã build thành công trong ${totalTime}s!`);
console.log(`=======================================================\x1b[0m\n`);
