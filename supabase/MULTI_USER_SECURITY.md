# How Other Users Get Their Own Data (Multi-User Security)

## Short answer

**Everyone uses the same Supabase project (your project).**  
They do **not** connect “their own database.”  
Data is isolated by **Row Level Security (RLS)**: each user only sees and edits rows where `user_id` = their auth user id.

So:

- **Your account (e.g. devkane2343@gmail.com)** → only your rows.
- **User A** → only User A’s rows.
- **User B** → only User B’s rows.

Same database, same tables; different rows per user.

---

## How it works

1. **One Supabase project**  
   Your app is built with one `VITE_SUPABASE_URL` and one `VITE_SUPABASE_ANON_KEY`. Every user’s browser loads the same app and talks to the same Supabase project.

2. **Supabase Auth**  
   When someone signs up or signs in, Supabase Auth gives them a **user id** (UUID) and a **JWT**. The Supabase client automatically sends that JWT with every request.

3. **Row Level Security (RLS)**  
   On `income_history` and `expenses`:
   - Every row has a `user_id` column.
   - RLS policies allow:
     - **SELECT**: only rows where `user_id = auth.uid()`
     - **INSERT**: only if the new row’s `user_id = auth.uid()`
     - **UPDATE / DELETE**: only rows where `user_id = auth.uid()`

   So when User A is signed in, `auth.uid()` is User A’s id → they only see and change their own rows. Same for you and for User B.

4. **App code**  
   When saving income/expenses, the app sets `user_id` to the current user’s id (from the session). RLS then enforces that no one can insert or update rows with another user’s `user_id`.

---

## Checklist: “Other users use their own data, not mine”

Use this to confirm your setup.

| Check | Where | What to verify |
|-------|--------|----------------|
| RLS enabled | Supabase → Table Editor → `income_history` / `expenses` | “RLS enabled” is on for both tables. |
| Policies use `auth.uid()` | SQL Editor or schema | Policies are `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)`. |
| Only anon key in app | `.env.local` / build env | You use `VITE_SUPABASE_ANON_KEY` only. **Never** put the `service_role` key in the frontend. |
| Auth in app | App flow | Users must sign in; the app uses the Supabase client that sends the session JWT (already the case if you use `supabase.auth` and the same client for DB calls). |

If all of the above are true, other users **cannot** see or change your data; they only see and change their own rows.

---

## Optional: quick test with two accounts

1. Sign in as **your account** (e.g. devkane2343@gmail.com), add an expense, then sign out.
2. Sign up / sign in as a **different email** (e.g. a friend or a test account).
3. Confirm the second user does **not** see the expense you added.
4. Add an expense as the second user, sign out, sign back in as yourself.
5. Confirm you do **not** see the second user’s expense.

That confirms RLS is isolating data per user.

---

## Deploying the app for others

When you deploy (Vercel, Netlify, etc.):

1. Set **the same** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the build environment (the ones from your Supabase project).
2. Do **not** create a separate Supabase project per user. One project, one app; RLS handles isolation.

Every visitor gets the same app and the same Supabase project; after they sign in, they only access their own data because of RLS.
