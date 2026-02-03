# Magic Link Authentication Setup

## Why Use Magic Link?

Magic link authentication has **higher rate limits** than email/password signup and avoids the "email rate exceeded" error that users often encounter.

## Implementation

Replace email/password authentication with magic links in `AuthPage.tsx`:

```typescript
// For sign in - replace password login with magic link
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${window.location.origin}/`,
  },
});

if (error) throw error;
setMessage({ 
  type: 'success', 
  text: 'Check your email for the login link!' 
});
```

## Benefits

- **No password required** - Users just click a link in their email
- **Higher rate limits** - Less likely to hit rate limiting
- **More secure** - No password to forget or compromise
- **Better mobile experience** - Easier for mobile users

## Supabase Configuration

1. Go to **Authentication** → **Providers** → **Email**
2. Ensure **Enable Magic Link** is toggled ON
3. Set **Magic Link Expiry**: 3600 seconds (1 hour)
4. Save changes

## Trade-offs

- Users need to check email each time (no password to remember)
- Requires good email deliverability
- Slightly slower than password login
