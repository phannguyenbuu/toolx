-- =====================================================
-- MIGRATION: Add Business Config & Print Shop Info
-- Date: 2026-03-01
-- Purpose: Store header/footer templates and print shop details
-- =====================================================

-- =====================================================
-- PRINT SHOPS TABLE
-- =====================================================

CREATE TABLE print_shops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tax_code TEXT,
  address TEXT,
  province TEXT,
  commune TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo TEXT, -- URL or base64
  description TEXT,
  printing_capacity TEXT,
  equipment TEXT[], -- Array of equipment names
  tax_percent DECIMAL(5,2) DEFAULT 10, -- % thuế mặc định
  -- Bank info
  bank_account TEXT,
  bank_name TEXT,
  bank_branch TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- BUSINESS CONFIG TABLE (Header/Footer Templates)
-- =====================================================

CREATE TABLE business_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  
  -- Quote config
  quote_header TEXT, -- HTML template
  quote_footer TEXT, -- HTML template
  quote_header_image TEXT, -- URL or base64
  quote_footer_image TEXT, -- URL or base64
  quote_default_vat_percent DECIMAL(5,2) DEFAULT 10,
  quote_default_validity_days INTEGER DEFAULT 30,
  
  -- Invoice config
  invoice_header TEXT, -- HTML template
  invoice_footer TEXT, -- HTML template
  invoice_header_image TEXT, -- URL or base64
  invoice_footer_image TEXT, -- URL or base64
  invoice_default_vat_percent DECIMAL(5,2) DEFAULT 10,
  invoice_default_payment_days INTEGER DEFAULT 7,
  
  -- Display settings
  display_settings JSONB DEFAULT '{
    "showCustomerName": true,
    "showCustomerEmail": true,
    "showCustomerPhone": true,
    "showCustomerAddress": true,
    "showCustomerTaxCode": false,
    "showDocumentNumber": true,
    "showDocumentDate": true,
    "showValidUntil": true,
    "showPaymentInfo": true,
    "showSignature": true
  }'::jsonb,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_print_shops_user_id ON print_shops(user_id);
CREATE INDEX idx_business_config_user_id ON business_config(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE print_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;

-- Print shops policies
CREATE POLICY "Users can view own print shop" ON print_shops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own print shop" ON print_shops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own print shop" ON print_shops FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own print shop" ON print_shops FOR DELETE USING (auth.uid() = user_id);

-- Business config policies
CREATE POLICY "Users can view own config" ON business_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own config" ON business_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own config" ON business_config FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own config" ON business_config FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_print_shops_updated_at 
  BEFORE UPDATE ON print_shops 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_config_updated_at 
  BEFORE UPDATE ON business_config 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to initialize business config on first access
CREATE OR REPLACE FUNCTION get_or_create_business_config(p_user_id UUID)
RETURNS business_config AS $$
DECLARE
  v_config business_config;
BEGIN
  SELECT * INTO v_config FROM business_config WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO business_config (user_id) VALUES (p_user_id)
    RETURNING * INTO v_config;
  END IF;
  
  RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to initialize print shop on first access
CREATE OR REPLACE FUNCTION get_or_create_print_shop(p_user_id UUID)
RETURNS print_shops AS $$
DECLARE
  v_shop print_shops;
BEGIN
  SELECT * INTO v_shop FROM print_shops WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO print_shops (user_id, name) 
    VALUES (p_user_id, 'Xưởng In Mới')
    RETURNING * INTO v_shop;
  END IF;
  
  RETURN v_shop;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE print_shops IS 'Store print shop business information';
COMMENT ON TABLE business_config IS 'Store header/footer templates and business settings';
COMMENT ON COLUMN business_config.quote_header IS 'HTML template for quote header with {{variables}}';
COMMENT ON COLUMN business_config.quote_footer IS 'HTML template for quote footer with {{variables}}';
COMMENT ON COLUMN business_config.quote_header_image IS 'Header image URL or base64 for quotes';
COMMENT ON COLUMN business_config.quote_footer_image IS 'Footer image URL or base64 for quotes';
