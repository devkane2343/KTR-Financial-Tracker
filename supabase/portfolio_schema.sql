-- =============================================================================
-- Portfolio/Career Information Schema
-- =============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This table stores user's portfolio and career information
-- =============================================================================

-- Enable UUID extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- PORTFOLIO TABLE
-- Stores user's career/portfolio information and dreams
-- =============================================================================
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name TEXT DEFAULT '',
  position TEXT DEFAULT '',
  rate_type TEXT NOT NULL DEFAULT 'hourly' CHECK (rate_type IN ('hourly', 'monthly')),
  hourly_rate DECIMAL(12, 2) DEFAULT 0 CHECK (hourly_rate >= 0),
  monthly_rate DECIMAL(12, 2) DEFAULT 0 CHECK (monthly_rate >= 0),
  hours_per_day DECIMAL(4, 1) DEFAULT 8.0 CHECK (hours_per_day > 0 AND hours_per_day <= 24),
  dreams TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_user_id ON portfolio(user_id);

-- =============================================================================
-- UPDATED_AT TRIGGER (auto-update on row change)
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_portfolio_updated_at ON portfolio;
CREATE TRIGGER trigger_portfolio_updated_at
  BEFORE UPDATE ON portfolio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) – each user sees only their own portfolio
-- =============================================================================
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own portfolio" ON portfolio
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all portfolios (read-only)
CREATE POLICY "Admins can view all portfolios" ON portfolio
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =============================================================================
-- USAGE NOTES
-- =============================================================================
-- Portfolio fields:
--   user_id       → UUID reference to auth.users
--   company_name  → Text field for company name
--   position      → Text field for job position/title
--   rate_type     → 'hourly' or 'monthly'
--   hourly_rate   → Hourly rate (used when rate_type = 'hourly')
--   monthly_rate  → Monthly rate (used when rate_type = 'monthly')
--                   Frontend divides by 22.5 to show daily rate
--   hours_per_day → Hours worked per day (default 8.0, used for calculations)
--                   Affects monthly/hourly conversions
--   dreams        → Text field for 5-year goals/dreams
-- =============================================================================
