# Admin Dashboard Installation Guide

## 🎯 Overview
This guide will walk you through setting up the admin dashboard for KTR Financial Tracker. The admin account (`devkane2343@gmail.com`) will have exclusive access to:
- View all users and their financial data
- Send notifications to users
- Suspend or delete user accounts
- Monitor system statistics

## ⚠️ Prerequisites
- Supabase project is set up and running
- You have already signed up in the app with `devkane2343@gmail.com`
- You have access to Supabase SQL Editor

## 📋 Installation Steps

### Step 1: Run Database Migrations

#### 1.1 Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

#### 1.2 Run Admin Schema
1. Open the file `supabase/admin_schema.sql` from your project
2. Copy ALL the contents
3. Paste into the Supabase SQL Editor
4. Click "Run" or press Ctrl+Enter
5. Wait for "Success. No rows returned" message

**Expected Output:**
```
Success. No rows returned
```

If you see any errors, double-check that:
- You've already run `supabase/schema.sql` (the main schema)
- Your Supabase project is on the latest version

### Step 2: Grant Admin Access

#### Option A: Automatic (Recommended)

1. In the same SQL Editor, create a new query
2. Paste this code:

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

3. Click "Run"
4. Check the output - you should see: "Admin user created successfully for devkane2343@gmail.com"

#### Option B: Manual (If Option A Fails)

1. Go to Supabase Dashboard → Authentication → Users
2. Find the user with email `devkane2343@gmail.com`
3. Copy the User ID (it's a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. In SQL Editor, run this query (replace YOUR_USER_ID with the copied ID):

```sql
INSERT INTO admin_users (user_id, email, granted_by)
VALUES (
  'YOUR_USER_ID_HERE',
  'devkane2343@gmail.com',
  'YOUR_USER_ID_HERE'
)
ON CONFLICT (user_id) DO NOTHING;
```

### Step 3: Verify Installation

#### 3.1 Check Admin User
Run this query to verify admin user was created:

```sql
SELECT * FROM admin_users WHERE email = 'devkane2343@gmail.com';
```

You should see one row with your user information.

#### 3.2 Check RLS Policies
Run this query to verify Row Level Security is enabled:

```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('admin_users', 'user_accounts', 'user_notifications');
```

All three tables should show `rowsecurity = true`.

#### 3.3 Check Functions
Run this query to verify the admin functions exist:

```sql
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname IN ('is_admin', 'get_user_statistics');
```

You should see two functions listed.

### Step 4: Test in Application

1. **Sign Out**: If you're currently signed in, sign out of the application
2. **Sign In**: Sign back in with `devkane2343@gmail.com`
3. **Check Navigation**: You should now see an "Admin" tab (with shield icon) in the navigation menu
4. **Click Admin Tab**: Click on the Admin tab
5. **Verify Dashboard**: You should see:
   - User statistics cards at the top
   - A search bar and filter options
   - A table listing all users (if any exist)

### Step 5: Test Features

#### Test Notifications (if you have multiple accounts)
1. Create a test account (or use an existing one)
2. Sign in with `devkane2343@gmail.com`
3. Go to Admin dashboard
4. Click the mail icon next to the test user
5. Sign in as the test user
6. You should see a notification (bell icon) with a red badge

#### Test User Management
1. In admin dashboard, try:
   - Searching for a user
   - Filtering by status
   - Selecting multiple users
   - Opening the bulk message modal

## 🔧 Troubleshooting

### Problem: Admin tab not showing

**Solution 1: Clear Cache**
1. Sign out
2. Clear browser cache (Ctrl+Shift+Delete)
3. Sign back in with `devkane2343@gmail.com`

**Solution 2: Verify Database**
Run this query:
```sql
SELECT 
  au.email,
  au.user_id,
  au.created_at,
  u.email as auth_email
FROM admin_users au
LEFT JOIN auth.users u ON au.user_id = u.id
WHERE au.email = 'devkane2343@gmail.com';
```

If no results, re-run Step 2.

**Solution 3: Check Browser Console**
1. Press F12 to open browser console
2. Look for any errors
3. Common issues:
   - "RLS policy violation" → Re-run admin_schema.sql
   - "Function not found" → Check Step 3.3

### Problem: Can't see any users in admin dashboard

**Solution 1: Check Supabase Logs**
1. Go to Supabase Dashboard → Logs
2. Look for errors related to `admin_users` or RLS policies

**Solution 2: Verify Service Role**
The app needs to use the admin API for listing users. Check that your `VITE_SUPABASE_ANON_KEY` is correctly set.

**Solution 3: Check User List Query**
In browser console, check if there are errors when calling `supabase.auth.admin.listUsers()`.

### Problem: Notifications not appearing for users

**Solution 1: Verify Table**
```sql
SELECT * FROM user_notifications LIMIT 5;
```

**Solution 2: Check RLS Policies**
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_notifications';
```

You should see policies for both users and admins.

### Problem: Database connection issues

**Check Environment Variables:**
Verify in your `.env.local` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 🔒 Security Checklist

Before going to production, verify:

- [ ] Admin schema has been run successfully
- [ ] Only `devkane2343@gmail.com` is in admin_users table
- [ ] RLS is enabled on all three admin tables
- [ ] Admin functions are created and working
- [ ] Unauthorized users get "Access Denied" when trying admin routes
- [ ] All admin actions are being logged (check timestamps in tables)
- [ ] Email notifications work (if configured)
- [ ] Admin credentials are stored securely
- [ ] No admin keys are exposed in client-side code

## 📊 What Gets Created

### Database Tables (3)
1. **admin_users**: Stores admin privileges
2. **user_accounts**: Tracks account status
3. **user_notifications**: Stores user notifications

### Database Functions (2)
1. **is_admin()**: Checks if a user is admin
2. **get_user_statistics()**: Returns user count stats

### RLS Policies (10+)
- Policies for each table ensuring data security
- Admin-specific policies for elevated access
- User-specific policies for own data access

### React Components (3)
1. **AdminDashboard**: Main admin interface
2. **NotificationBar**: User notification display
3. **AdminGuard**: Route protection component

### Utility Functions (15+)
All in `lib/adminUtils.ts` for secure operations

## 🎉 Success!

If you've reached this point and everything works, congratulations! You now have:

✅ A fully functional admin dashboard  
✅ User management capabilities  
✅ Notification system  
✅ Secure role-based access control  
✅ Audit trail for all admin actions  

## 📚 Next Steps

1. Read `ADMIN_FEATURES.md` for detailed feature documentation
2. Check `supabase/ADMIN_SETUP.md` for advanced configuration
3. Explore the admin dashboard and test all features
4. Set up monitoring and alerts (optional)

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check browser console for errors
2. Review Supabase logs
3. Verify all SQL scripts ran without errors
4. Ensure environment variables are correct
5. Try the troubleshooting steps above

## 📝 Notes

- This is a soft-delete system. Deleted users are marked as deleted but data is preserved
- All admin actions are logged and traceable
- Notifications are stored in the database, not sent via email (unless configured)
- The system supports multiple admins (see `ADMIN_SETUP.md` for adding more)

---

**Security Reminder**: This admin system provides full access to user data. Only grant admin privileges to trusted individuals and always follow security best practices.
