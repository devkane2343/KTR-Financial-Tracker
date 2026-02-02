-- =============================================================================
-- Migration: Add auth (user_id) to existing income_history and expenses
-- Run this ONLY if you already have tables without user_id (e.g. from old schema).
-- New projects: use schema.sql from scratch instead.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'income_history' AND column_name = 'user_id') THEN
    ALTER TABLE income_history ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'user_id') THEN
    ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- RLS: users see only their own rows (rows with user_id = auth.uid())
ALTER TABLE income_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own income" ON income_history;
CREATE POLICY "Users can manage own income" ON income_history
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
CREATE POLICY "Users can manage own expenses" ON expenses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Optional: make user_id NOT NULL after backfilling (e.g. assign existing rows to a user)
-- ALTER TABLE income_history ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
