-- =============================================================================
-- PesoWise Finance Tracker - Supabase Database Schema
-- =============================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Compatible with PostgreSQL 15+ (Supabase default)
-- =============================================================================

-- Enable UUID extension (Supabase has this by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- INCOME HISTORY TABLE
-- Stores salary/paycheck records with deductions (SSS, Pag-IBIG, PhilHealth, VUL, EF, General Savings)
-- =============================================================================
CREATE TABLE IF NOT EXISTS income_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weekly_salary DECIMAL(12, 2) NOT NULL CHECK (weekly_salary >= 0),
  sss DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (sss >= 0),
  pagibig DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (pagibig >= 0),
  philhealth DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (philhealth >= 0),
  vul DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (vul >= 0),
  emergency_fund DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (emergency_fund >= 0),
  general_savings DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (general_savings >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster date-based queries (dashboard, analytics)
CREATE INDEX IF NOT EXISTS idx_income_history_date ON income_history(date DESC);

-- =============================================================================
-- EXPENSES TABLE
-- Stores expense records with category and description
-- =============================================================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'Emergency Fund', 'General Savings', 'Life Insurance',
    'Food', 'Transportation', 'Utilities', 'Entertainment',
    'Bills', 'Shopping', 'Health', 'Savings', 'Others'
  )),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- =============================================================================
-- UPDATED_AT TRIGGER (auto-update on row change)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_income_history_updated_at ON income_history;
CREATE TRIGGER trigger_income_history_updated_at
  BEFORE UPDATE ON income_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON expenses;
CREATE TRIGGER trigger_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) – each user sees only their own data
-- =============================================================================
ALTER TABLE income_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own income" ON income_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- USAGE NOTES
-- =============================================================================
-- Column mapping (App types → SQL):
--
-- IncomeEntry:
--   id          → id (UUID, auto-generated)
--   date        → date
--   weeklySalary → weekly_salary
--   sss         → sss
--   pagibig     → pagibig
--   philhealth  → philhealth
--   vul         → vul
--
-- Expense:
--   id          → id (UUID, auto-generated)
--   date        → date
--   category    → category
--   amount      → amount
--   description → description
-- =============================================================================
