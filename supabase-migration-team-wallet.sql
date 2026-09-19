-- =====================================================
-- MIGRATION: Add Team Members & Wallet System
-- Date: 2026-03-02
-- Purpose: Team collaboration and wallet/payment features
-- =====================================================

-- =====================================================
-- TEAM MEMBERS TABLE
-- =====================================================

CREATE TABLE team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT DEFAULT 'member', -- owner, admin, member, viewer
  permissions JSONB DEFAULT '{
    "canEditQuotes": false,
    "canEditInvoices": false,
    "canEditCustomers": false,
    "canViewReports": false,
    "canManageTeam": false
  }'::jsonb,
  status TEXT DEFAULT 'active', -- active, inactive, pending
  invited_email TEXT,
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_id, user_id)
);

-- =====================================================
-- WALLET & TRANSACTIONS
-- =====================================================

CREATE TABLE wallets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'VND',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  wallet_id UUID REFERENCES wallets NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL, -- topup, payment, refund, withdrawal
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, completed, failed, cancelled
  description TEXT,
  reference_id TEXT, -- Invoice ID, Quote ID, etc
  payment_method TEXT, -- bank_transfer, momo, vnpay, cash
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- =====================================================
-- SUBSCRIPTION PLANS
-- =====================================================

CREATE TABLE subscription_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  billing_period TEXT DEFAULT 'monthly', -- monthly, yearly
  features JSONB NOT NULL,
  max_team_members INTEGER DEFAULT 1,
  max_storage_gb INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  plan_id UUID REFERENCES subscription_plans NOT NULL,
  status TEXT DEFAULT 'active', -- active, cancelled, expired, trial
  started_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_team_members_owner_id ON team_members(owner_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Team members policies
CREATE POLICY "Owners can view their team" ON team_members FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = user_id);
CREATE POLICY "Owners can insert team members" ON team_members FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their team" ON team_members FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete team members" ON team_members FOR DELETE USING (auth.uid() = owner_id);

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wallet" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update wallets" ON wallets FOR UPDATE USING (true); -- Controlled by functions

-- Wallet transactions policies
CREATE POLICY "Users can view own transactions" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON wallet_transactions FOR INSERT WITH CHECK (true); -- Controlled by functions

-- Subscription plans policies (public read)
CREATE POLICY "Anyone can view active plans" ON subscription_plans FOR SELECT USING (is_active = true);

-- User subscriptions policies
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_team_members_updated_at 
  BEFORE UPDATE ON team_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at 
  BEFORE UPDATE ON wallets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at 
  BEFORE UPDATE ON subscription_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at 
  BEFORE UPDATE ON user_subscriptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create wallet on user signup
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_wallet();

-- Function to add funds to wallet
CREATE OR REPLACE FUNCTION wallet_topup(
  p_user_id UUID,
  p_amount DECIMAL,
  p_payment_method TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet wallets;
  v_transaction wallet_transactions;
BEGIN
  -- Get or create wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id) VALUES (p_user_id) RETURNING * INTO v_wallet;
  END IF;
  
  -- Create transaction
  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount, 
    balance_before, balance_after, status,
    description, payment_method
  ) VALUES (
    v_wallet.id, p_user_id, 'topup', p_amount,
    v_wallet.balance, v_wallet.balance + p_amount, 'completed',
    COALESCE(p_description, 'Nạp tiền vào ví'), p_payment_method
  ) RETURNING * INTO v_transaction;
  
  -- Update wallet balance
  UPDATE wallets SET balance = balance + p_amount WHERE id = v_wallet.id;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct from wallet
CREATE OR REPLACE FUNCTION wallet_payment(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_id TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet wallets;
  v_transaction wallet_transactions;
BEGIN
  -- Get wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  -- Check balance
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- Create transaction
  INSERT INTO wallet_transactions (
    wallet_id, user_id, type, amount,
    balance_before, balance_after, status,
    description, reference_id
  ) VALUES (
    v_wallet.id, p_user_id, 'payment', p_amount,
    v_wallet.balance, v_wallet.balance - p_amount, 'completed',
    COALESCE(p_description, 'Thanh toán'), p_reference_id
  ) RETURNING * INTO v_transaction;
  
  -- Update wallet balance
  UPDATE wallets SET balance = balance - p_amount WHERE id = v_wallet.id;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price, billing_period, features, max_team_members, max_storage_gb, sort_order) VALUES
('Free', 'Gói miễn phí cho cá nhân', 0, 'monthly', 
 '{"maxProjects": 5, "maxCustomers": 10, "maxQuotes": 20, "maxInvoices": 20, "support": "email"}'::jsonb, 
 1, 1, 1),
('Basic', 'Gói cơ bản cho doanh nghiệp nhỏ', 199000, 'monthly',
 '{"maxProjects": 50, "maxCustomers": 100, "maxQuotes": 200, "maxInvoices": 200, "support": "priority"}'::jsonb,
 3, 10, 2),
('Pro', 'Gói chuyên nghiệp', 499000, 'monthly',
 '{"maxProjects": -1, "maxCustomers": -1, "maxQuotes": -1, "maxInvoices": -1, "support": "24/7"}'::jsonb,
 10, 50, 3),
('Enterprise', 'Gói doanh nghiệp', 999000, 'monthly',
 '{"maxProjects": -1, "maxCustomers": -1, "maxQuotes": -1, "maxInvoices": -1, "support": "dedicated", "customDomain": true}'::jsonb,
 -1, 200, 4);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE team_members IS 'Team collaboration - members can access owner resources';
COMMENT ON TABLE wallets IS 'User wallet for payments and credits';
COMMENT ON TABLE wallet_transactions IS 'Transaction history for wallet';
COMMENT ON TABLE subscription_plans IS 'Available subscription plans';
COMMENT ON TABLE user_subscriptions IS 'User active subscriptions';
