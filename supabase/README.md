# Supabase Setup for KTR Financial Tracker

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (choose a region close to you)
3. Wait for the project to be provisioned

## 2. Enable Auth (Email/Password)

1. In the Dashboard go to **Authentication** → **Providers**
2. Ensure **Email** is enabled (default)
3. Optionally configure **Confirm email** (recommended for production)

## 3. Run the Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `schema.sql` and paste into the editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

This creates:

- `income_history` table – salary records with deductions, tied to `user_id`
- `expenses` table – expense records with categories, tied to `user_id`
- Row Level Security (RLS) so each user only sees and edits their own data
- Indexes and `updated_at` triggers

**If you already have tables without `user_id`** (from an older schema), run `migration_add_auth.sql` instead to add the `user_id` column and RLS without recreating tables.

## 4. Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public** key (safe for client-side use)

## 5. Configure the App

1. In the project root, create or edit `.env.local`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
2. Restart the dev server (`npm run dev`)

Users sign in or sign up on the login page; their income and expenses are stored under their account and isolated by RLS.
