# 🚀 Admin Dashboard - Quick Start Guide

## ⏱️ 5-Minute Setup

### Step 1: Run SQL Script (2 minutes)
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy contents of `supabase/admin_schema.sql`
3. Paste and click **Run**
4. Wait for "Success" message

### Step 2: Grant Admin Access (1 minute)
Paste this in SQL Editor and run:
```sql
DO $$
DECLARE admin_uid UUID;
BEGIN
  SELECT id INTO admin_uid FROM auth.users WHERE email = 'devkane2343@gmail.com';
  IF admin_uid IS NOT NULL THEN
    INSERT INTO admin_users (user_id, email, granted_by)
    VALUES (admin_uid, 'devkane2343@gmail.com', admin_uid)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
```

### Step 3: Test (2 minutes)
1. **Sign out** of your app
2. **Sign in** with `devkane2343@gmail.com`
3. Look for **"Admin"** tab with shield icon
4. Click it to see your dashboard!

---

## ✅ What You Get

### For Admin (You):
- 📊 View all users and their financial data
- 💬 Send notifications to any user
- 🚫 Suspend problem accounts
- 🗑️ Delete accounts (with reason)
- 📈 See user statistics

### For Regular Users:
- 🔔 Receive admin notifications
- ✉️ Get messages on their dashboard
- 👁️ See account status updates

---

## 🎯 Common Tasks

### Send a Message to One User
1. Go to **Admin** tab
2. Find the user
3. Click **mail icon** ✉️
4. Done! They get a notification

### Send Message to Multiple Users
1. Select users with **checkboxes** ☑️
2. Click **"Send Message"** button
3. Fill in title, message, type
4. Click **Send**

### Suspend a User
1. Find the user
2. Click **ban icon** 🚫
3. Enter reason
4. Confirm

### Reactivate a User
1. Filter by **"Suspended"**
2. Find the user
3. Click **rotate icon** 🔄
4. Confirm

---

## 🆘 Troubleshooting

**Admin tab not showing?**
- Sign out and back in
- Clear browser cache
- Verify SQL script ran successfully

**Can't see users?**
- Check Supabase logs for errors
- Verify RLS policies are enabled

---

## 📚 Full Documentation

- `ADMIN_INSTALLATION.md` - Detailed setup guide
- `ADMIN_FEATURES.md` - Complete feature list
- `ADMIN_SUMMARY.md` - Technical overview
- `supabase/ADMIN_SETUP.md` - Database details

---

## 🎉 You're Ready!

That's it! Your admin dashboard is live. Start exploring and managing your users.

**Questions?** Check the full documentation files above.
