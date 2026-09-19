-- =====================================================
-- MIGRATION: Replace certifications with tax_percent
-- Date: 2026-03-02
-- Purpose: Xóa trường certifications từ print_shops
-- Note: tax_percent được lưu vào defaultVatPercent trong business_configs
-- =====================================================

-- Thêm cột tax_percent vào print_shops (cho tương lai)
ALTER TABLE print_shops 
ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2) DEFAULT 10;

-- Xóa cột certifications từ print_shops
ALTER TABLE print_shops 
DROP COLUMN IF EXISTS certifications;

-- Comment
COMMENT ON COLUMN print_shops.tax_percent IS '% thuế mặc định cho báo giá và hóa đơn';
