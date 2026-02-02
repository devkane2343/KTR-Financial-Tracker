-- =============================================================================
-- One-time: Assign existing data to your account (devkane2343@gmail.com)
-- =============================================================================
-- Prerequisites:
-- 1. You already ran migration_add_auth.sql (so income_history and expenses
--    have a user_id column and RLS is enabled).
-- 2. You have signed up in the app (or Supabase Auth) with devkane2343@gmail.com
--    so that user exists in auth.users.
--
-- Run this once in Supabase SQL Editor. It sets user_id on all rows that
-- currently have NULL user_id to your account.
-- =============================================================================

UPDATE income_history
SET user_id = (SELECT id FROM auth.users WHERE email = 'devkane2343@gmail.com' LIMIT 1)
WHERE user_id IS NULL;

UPDATE expenses
SET user_id = (SELECT id FROM auth.users WHERE email = 'devkane2343@gmail.com' LIMIT 1)
WHERE user_id IS NULL;

-- Optional: make user_id NOT NULL so no future rows can be orphaned
-- (Uncomment only after the UPDATEs above and if your schema allows it.)
-- ALTER TABLE income_history ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
