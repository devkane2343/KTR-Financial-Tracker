# Admin Dashboard Setup Guide

This guide will help you set up the admin dashboard for your KTR Financial Tracker application.

## Prerequisites

1. Your Supabase project must be set up and running
2. You must have already signed up with the email `devkane2343@gmail.com` in your application

## Step 1: Run the Database Migrations

Execute the following SQL scripts in your Supabase SQL Editor (in order):

### 1.1 Run the main schema (if not already done)
```sql
-- File: supabase/schema.sql
```
Go to your Supabase dashboard → SQL Editor → New Query → Paste and run the contents of `schema.sql`

### 1.2 Run the admin schema
```sql
-- File: supabase/admin_schema.sql
```
Go to your Supabase dashboard → SQL Editor → New Query → Paste and run the contents of `admin_schema.sql`

## Step 2: Grant Admin Access to Your Account

After running the admin schema, you need to grant admin privileges to your account.

### Option A: Automatic Setup (Recommended)

Run this in the Supabase SQL Editor:

```sql
DO $$
DECLARE
  admin_uid UUID;
BEGIN
  -- Find the user ID for devkane2343@gmail.com
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'devkane2343@gmail.com';
  
  IF admin_uid IS NOT NULL THEN
    -- Insert into admin_users table
    INSERT INTO admin_users (user_id, email, granted_by)
    VALUES (admin_uid, 'devkane2343@gmail.com', admin_uid)
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Admin user created successfully for devkane2343@gmail.com';
  ELSE
    RAISE NOTICE 'User devkane2343@gmail.com not found. Please sign up first.';
  END IF;
END $$;
```

### Option B: Manual Setup

If Option A doesn't work, follow these steps:

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user with email `devkane2343@gmail.com`
3. Copy the User ID (UUID)
4. Go to SQL Editor and run:

```sql
INSERT INTO admin_users (user_id, email, granted_by)
VALUES (
  '4512fe15-f6d0-42cf-97bf-94884394d2d2',  -- Replace with the copied UUID
  'devkane2343@gmail.com',
  '4512fe15-f6d0-42cf-97bf-94884394d2d2'   -- Replace with the copied UUID
)
ON CONFLICT (user_id) DO NOTHING;
```

## Step 3: Verify Admin Access

1. Sign out and sign back in to your application with `devkane2343@gmail.com`
2. You should now see an "Admin" tab in the navigation menu
3. Click on the Admin tab to access the admin dashboard

## Step 4: Configure Row Level Security (RLS)

The admin schema automatically sets up RLS policies. Verify they're enabled:

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('admin_users', 'user_accounts', 'user_notifications');
```

All three tables should show `rowsecurity = true`.

## Features Available in Admin Dashboard

### 1. User Statistics
- Total users count
- Active users count
- Suspended users count
- Deleted users count

### 2. User Management
- View all users with their details
- See user financial data (income, expenses, net amount)
- Search users by email or name
- Filter users by status (active, suspended, deleted)

### 3. User Actions
- **Send Notifications**: Send individual or bulk messages to users
- **Suspend Account**: Temporarily disable user access
- **Reactivate Account**: Restore access to suspended users
- **Delete Account**: Soft delete user accounts (marks as deleted)

### 4. Notification System
- Users receive notifications on their dashboard
- Notifications appear in a notification bar (bell icon)
- Support for different notification types: info, success, warning, error
- Users can mark notifications as read or delete them

## Security Considerations

### Admin Access Control
- Only users in the `admin_users` table can:
  - Access the admin dashboard
  - View all user data
  - Send notifications
  - Suspend/delete accounts

### Row Level Security
- Regular users can only see their own data
- Admins can see all data through specific RLS policies
- All sensitive operations require admin privileges

### Best Practices
1. **Never share admin credentials**: Keep `devkane2343@gmail.com` credentials secure
2. **Audit actions**: All admin actions are logged with timestamps and admin IDs
3. **Use suspension over deletion**: Suspend accounts instead of deleting when possible
4. **Provide reasons**: Always provide clear reasons when suspending or deleting accounts

## Troubleshooting

### Admin Tab Not Showing
1. Verify you're signed in with `devkane2343@gmail.com`
2. Check if the user exists in `admin_users` table:
```sql
SELECT * FROM admin_users WHERE email = 'devkane2343@gmail.com';
```
3. Try signing out and back in

### Can't See Users in Admin Dashboard
1. Check Supabase project settings → API → Service Role Key
2. Verify RLS policies are correctly set up
3. Check browser console for any errors

### Notifications Not Appearing
1. Verify the `user_notifications` table exists
2. Check RLS policies for `user_notifications`
3. Ensure the user hasn't dismissed all notifications

## Database Schema Overview

### admin_users
Stores admin user information:
- `user_id`: Reference to auth.users
- `email`: Admin email
- `granted_at`: When admin access was granted
- `granted_by`: Who granted the access

### user_accounts
Tracks user account status:
- `user_id`: Reference to auth.users
- `status`: active | suspended | deleted
- `suspended_at`, `suspended_by`, `suspension_reason`
- `deleted_at`, `deleted_by`, `deletion_reason`

### user_notifications
Stores user notifications:
- `user_id`: Recipient user
- `title`: Notification title
- `message`: Notification content
- `type`: info | warning | success | error
- `is_read`: Read status
- `sent_by`: Admin who sent it

## Adding More Admins

To grant admin access to additional users:

```sql
-- Replace with the actual user ID and email
INSERT INTO admin_users (user_id, email, granted_by)
SELECT 
  id,
  email,
  (SELECT user_id FROM admin_users WHERE email = 'devkane2343@gmail.com' LIMIT 1)
FROM auth.users 
WHERE email = 'new_admin@example.com'
ON CONFLICT (user_id) DO NOTHING;
```

## Removing Admin Access

To revoke admin access:

```sql
DELETE FROM admin_users WHERE email = 'admin_to_remove@example.com';
```

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Review Supabase logs in Dashboard → Logs
3. Verify all SQL scripts ran without errors
4. Ensure your Supabase project has the latest schema

---

**Security Notice**: This admin system gives full access to user data. Only grant admin privileges to trusted individuals and always follow security best practices.
