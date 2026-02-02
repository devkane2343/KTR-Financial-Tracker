# Supabase Setup for PesoWise Finance Tracker

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project (choose a region close to you)
3. Wait for the project to be provisioned

## 2. Run the Schema

1. In your Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `schema.sql` and paste into the editor
4. Click **Run** (or press Ctrl/Cmd + Enter)

This creates:
- `income_history` table – salary records with deductions
- `expenses` table – expense records with categories
- Indexes for fast queries
- `updated_at` auto-update triggers

## 3. Get Your API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (e.g. `https://xxxx.supabase.co`)
   - **anon public** key (safe for client-side use)

## 4. Next Steps (App Integration)

When ready to connect the app:

1. Install the Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Create a Supabase client (e.g. `lib/supabase.ts`)

3. Replace localStorage persistence with Supabase `from('income_history')` and `from('expenses')` calls

4. **Column name mapping** (snake_case in DB ↔ camelCase in app):
   - `weekly_salary` ↔ `weeklySalary`
   - All other columns match the TypeScript types

## 5. Optional: Row Level Security (RLS)

When you add Supabase Auth:

1. Add a `user_id` column to both tables (uncomment in `schema.sql`)
2. Uncomment the RLS policies in `schema.sql`
3. Run the policy block in the SQL Editor

This ensures each user only sees their own data.
