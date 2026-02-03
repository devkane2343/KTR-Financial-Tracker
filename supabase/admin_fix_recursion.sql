-- =============================================================================
-- FIX: Infinite Recursion in admin_users RLS Policy
-- =============================================================================
-- This fixes the "infinite recursion detected in policy" error
-- by allowing authenticated users to read admin_users table
-- =============================================================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Only admins can view admin_users" ON admin_users;

-- Create a new policy that allows ANY authenticated user to read admin_users
-- This is safe because:
-- 1. The table only stores admin user IDs, no sensitive data
-- 2. Knowing who is an admin is necessary for the app to function
-- 3. We still protect writes - only specific people can INSERT into this table
CREATE POLICY "Authenticated users can view admin_users" ON admin_users
  FOR SELECT USING (auth.role() = 'authenticated');

-- Optionally: Allow admins to insert new admins (but requires manual SQL for first admin)
CREATE POLICY "Admins can insert admin_users" ON admin_users
  FOR INSERT WITH CHECK (
    user_id IN (SELECT user_id FROM admin_users)
  );

-- =============================================================================
-- Now insert your admin user (this will work now!)
-- =============================================================================

DO $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Find your user
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'devkane2343@gmail.com';
  
  IF admin_uid IS NULL THEN
    RAISE EXCEPTION 'User devkane2343@gmail.com not found. Please sign up first!';
  END IF;
  
  -- Delete any existing entry (clean slate)
  DELETE FROM admin_users WHERE user_id = admin_uid;
  
  -- Insert fresh
  INSERT INTO admin_users (user_id, email, granted_by, created_at)
  VALUES (admin_uid, 'devkane2343@gmail.com', admin_uid, NOW());
  
  RAISE NOTICE '✅ SUCCESS! Admin user created for devkane2343@gmail.com';
  RAISE NOTICE 'User ID: %', admin_uid;
  RAISE NOTICE 'Now refresh your app and the Admin tab will appear!';
END $$;

-- =============================================================================
-- Verify it worked
-- =============================================================================
SELECT 
  '✅ Admin user verified!' AS status,
  email,
  user_id,
  created_at
FROM admin_users 
WHERE email = 'devkane2343@gmail.com';
