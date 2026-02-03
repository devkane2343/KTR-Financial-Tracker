-- =============================================================================
-- ADMIN DASHBOARD SCHEMA
-- =============================================================================
-- Run this in Supabase SQL Editor after schema.sql
-- This creates admin functionality for user management and notifications
-- =============================================================================

-- =============================================================================
-- ADMIN USERS TABLE
-- Stores which users have admin privileges
-- =============================================================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- =============================================================================
-- USER ACCOUNTS TABLE
-- Tracks account status (active, suspended, deleted)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES auth.users(id),
  suspension_reason TEXT,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  deletion_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_accounts_user_id ON user_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_status ON user_accounts(status);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);

-- =============================================================================
-- USER NOTIFICATIONS TABLE
-- Stores admin messages/notifications to users
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT false,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON user_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON user_notifications(sent_at DESC);

-- =============================================================================
-- TRIGGER FOR user_accounts updated_at
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_user_accounts_updated_at ON user_accounts;
CREATE TRIGGER trigger_user_accounts_updated_at
  BEFORE UPDATE ON user_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Admin Users: Only admins can view this table
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- User Accounts: Admins can view all, users can view their own
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all user accounts" ON user_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own account" ON user_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can update user accounts" ON user_accounts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert user accounts" ON user_accounts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- User Notifications: Users can only see their own notifications, admins can manage all
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications" ON user_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert notifications" ON user_notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all notifications" ON user_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete notifications" ON user_notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid()
    )
  );

-- =============================================================================
-- FUNCTION: Check if user is admin
-- =============================================================================
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- FUNCTION: Get user statistics
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_statistics()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  suspended_users BIGINT,
  deleted_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT auth.users.id) as total_users,
    COUNT(DISTINCT CASE WHEN COALESCE(user_accounts.status, 'active') = 'active' THEN auth.users.id END) as active_users,
    COUNT(DISTINCT CASE WHEN user_accounts.status = 'suspended' THEN auth.users.id END) as suspended_users,
    COUNT(DISTINCT CASE WHEN user_accounts.status = 'deleted' THEN auth.users.id END) as deleted_users
  FROM auth.users
  LEFT JOIN user_accounts ON auth.users.id = user_accounts.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- MANUAL STEP: Insert the admin user
-- =============================================================================
-- Run this AFTER a user with devkane2343@gmail.com has signed up:
-- 
-- INSERT INTO admin_users (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'devkane2343@gmail.com'
-- ON CONFLICT (user_id) DO NOTHING;
--
-- Or run this more complete version:
-- 
-- DO $$
-- DECLARE
--   admin_uid UUID;
-- BEGIN
--   SELECT id INTO admin_uid FROM auth.users WHERE email = 'devkane2343@gmail.com';
--   
--   IF admin_uid IS NOT NULL THEN
--     INSERT INTO admin_users (user_id, email, granted_by)
--     VALUES (admin_uid, 'devkane2343@gmail.com', admin_uid)
--     ON CONFLICT (user_id) DO NOTHING;
--     
--     RAISE NOTICE 'Admin user created successfully for devkane2343@gmail.com';
--   ELSE
--     RAISE NOTICE 'User devkane2343@gmail.com not found. Please sign up first.';
--   END IF;
-- END $$;
-- =============================================================================
