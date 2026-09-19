#!/usr/bin/env python3

import re

# Đọc file
with open('/root/toolxprint/src/App.tsx', 'r') as f:
    content = f.read()

# Thay thế comment
content = content.replace('IMPOSITION PAGE - Auth required', 'IMPOSITION PAGE - No auth required')
content = content.replace('IMPOSITION ADVANCED PAGE - Auth required', 'IMPOSITION ADVANCED PAGE - No auth required')  
content = content.replace('FILE MANAGER PAGE - Auth required', 'FILE MANAGER PAGE - No auth required')

# Pattern để tìm và thay thế AuthGuard cho imposition
imposition_pattern = r"(currentPage === 'imposition' && \(\s*<AuthGuard onLoginClick=\{\(\) => setIsLoginModalOpen\(true\)\}>\s*<div className=\"flex-1 overflow-hidden\">\s*<ImpositionPage onClose=\{\(\) => setCurrentPage\('label-designer'\)\} />\s*</div>\s*</AuthGuard>)"

imposition_replacement = r"""currentPage === 'imposition' && (
        <div className="flex-1 overflow-hidden">
          <ImpositionPage onClose={() => setCurrentPage('label-designer')} />
        </div>"""

# Tương tự cho imposition-advanced
advanced_pattern = r"(currentPage === 'imposition-advanced' && \(\s*<AuthGuard onLoginClick=\{\(\) => setIsLoginModalOpen\(true\)\}>\s*<div className=\"flex-1 overflow-hidden\">\s*<ImpositionAdvancedPage onClose=\{\(\) => setCurrentPage\('label-designer'\)\} />\s*</div>\s*</AuthGuard>)"

advanced_replacement = r"""currentPage === 'imposition-advanced' && (
        <div className="flex-1 overflow-hidden">
          <ImpositionAdvancedPage onClose={() => setCurrentPage('label-designer')} />
        </div>"""

# Tương tự cho file-manager
filemanager_pattern = r"(currentPage === 'file-manager' && \(\s*<AuthGuard onLoginClick=\{\(\) => setIsLoginModalOpen\(true\)\}>\s*<div className=\"flex-1 overflow-hidden\">\s*<FileManagerPage onClose=\{\(\) => setCurrentPage\('home'\)\} />\s*</div>\s*</AuthGuard>)"

filemanager_replacement = r"""currentPage === 'file-manager' && (
        <div className="flex-1 overflow-hidden">
          <FileManagerPage onClose={() => setCurrentPage('home')} />
        </div>"""

# Áp dụng thay thế
content = re.sub(imposition_pattern, imposition_replacement, content, flags=re.MULTILINE | re.DOTALL)
content = re.sub(advanced_pattern, advanced_replacement, content, flags=re.MULTILINE | re.DOTALL)
content = re.sub(filemanager_pattern, filemanager_replacement, content, flags=re.MULTILINE | re.DOTALL)

# Ghi lại file
with open('/root/toolxprint/src/App.tsx', 'w') as f:
    f.write(content)

print("✅ Đã bỏ yêu cầu đăng nhập cho các chức năng quan trọng")
