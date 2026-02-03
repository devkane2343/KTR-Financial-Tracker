# Email Rate Limit Error - Complete Fix Guide

## Problem
Users see "Email rate exceeded" or "Rate limit exceeded" error when trying to sign up or sign in on mobile.

## Root Cause
Supabase limits the number of authentication emails that can be sent per hour (default: 3-4 emails per hour per email address or IP address) to prevent spam and abuse.

---

## Solutions (Choose One or More)

### ✅ Solution 1: Increase Rate Limits (Recommended)

**Steps:**
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **Rate Limits**
4. Adjust these settings:
   - **Email signups per hour**: Increase from 3 to **20**
   - **Email logins per hour**: Increase to **20**
   - **Password recovery per hour**: Increase to **10**
5. Click **Save**

**Time to take effect:** Immediate

---

### ✅ Solution 2: Disable Email Confirmation (Development Only)

**For testing/development environments:**

1. Go to **Authentication** → **Providers** → **Email**
2. Find "Confirm email" setting
3. Toggle it **OFF**
4. Save changes

⚠️ **Important:** Re-enable this for production! Email confirmation prevents fake accounts.

**When to use:** During development, testing, or demos

---

### ✅ Solution 3: Use Magic Link Authentication

**Benefits:**
- Higher rate limits than password authentication
- No password to remember
- Better for mobile users
- More secure

**Implementation:** See `docs/MAGIC_LINK_AUTH.md` for full setup

---

### ✅ Solution 4: Improve User Experience (Already Implemented)

The code now shows a user-friendly error message:

```
"Too many attempts. Please wait a few minutes and try again, 
or contact support if this persists."
```

This prevents confusion and guides users on what to do.

---

## Prevention Tips

### For Users:
1. **Wait 5 minutes** between retry attempts
2. **Check spam folder** for confirmation emails
3. **Don't click "Sign Up" multiple times** - be patient
4. **Use incognito mode** if testing (fresh IP)

### For Developers:
1. Monitor Supabase **Auth logs** for rate limit patterns
2. Consider implementing a **cooldown UI** after submission
3. Add **email verification status check** before allowing re-signup
4. Use **Supabase's built-in captcha** for production (reduces bot traffic)

---

## Quick Verification

After applying fixes, test with:

1. **Clear browser cache** and cookies
2. **Try signing up** with a new email
3. **Check Supabase logs** (Authentication → Logs) for errors
4. **Test on mobile device** with cellular data (different IP)

---

## Still Having Issues?

### Check Supabase Project Settings:
- **Authentication** → **Email Templates** - Are emails being sent?
- **Project Settings** → **API** - Are rate limits set correctly?
- **Authentication** → **Logs** - What errors are logged?

### Common Issues:
- **Email provider blocking**: Gmail/Outlook may mark Supabase emails as spam
- **IP-based limiting**: Multiple users on same WiFi hit the same limit
- **Browser caching**: Old tokens causing conflicts

### Advanced: Custom SMTP
If rate limits persist, configure custom SMTP:
1. Go to **Project Settings** → **Auth**
2. Set up **Custom SMTP** with your email provider
3. This bypasses Supabase's default rate limits

---

## Recommended Production Setup

```typescript
// Supabase Dashboard Settings:
✅ Email confirmation: ON (for security)
✅ Email signups per hour: 20
✅ Email logins per hour: 20  
✅ Magic link enabled: ON (as fallback)
✅ Captcha protection: ON (reduces bots)

// Additional security:
✅ Rate limit by IP: 50 requests per hour
✅ Password strength: Minimum 8 characters
✅ Session timeout: 1 week
```

---

## Summary

**Immediate fix:** Go to Supabase Dashboard → Authentication → Rate Limits → Increase email limits to 20

**Long-term:** Consider magic link auth or custom SMTP for high-traffic apps
