# Privacy Notice Feature

## Overview

The KTR Financial Tracker now includes a Privacy Notice modal that displays to users in accordance with the **Data Privacy Act of 2012 (RA 10173)**.

## How It Works

### First-Time Users
- When a user logs in for the first time, they will see the Privacy Notice modal
- They must click "I Agree & Continue" to proceed with using the app
- Their consent is stored in localStorage linked to their user ID

### Existing Users
- The modal appears once every **10 page refreshes/logins**
- This ensures users are periodically reminded of the privacy policy
- The refresh counter is also stored in localStorage per user

## Implementation Details

### Files Created

1. **`components/PrivacyNoticeModal.tsx`**
   - Beautiful, mobile-responsive modal component
   - Contains the full privacy notice text
   - Smooth animations and transitions
   - Fully accessible design

2. **`hooks/usePrivacyNotice.ts`**
   - Custom React hook that manages the privacy notice state
   - Handles localStorage operations
   - Tracks refresh count per user
   - Returns `shouldShow` boolean and `handleAccept` function

### Integration

The privacy notice is integrated into `App.tsx`:

```typescript
const { shouldShow: showPrivacyNotice, handleAccept: handlePrivacyAccept } = usePrivacyNotice(user);

// In JSX:
<PrivacyNoticeModal isOpen={showPrivacyNotice} onAccept={handlePrivacyAccept} />
```

### localStorage Keys

- `ktr_privacy_accepted_{userId}`: Stores whether user has ever accepted
- `ktr_refresh_count_{userId}`: Tracks number of refreshes since last modal display

## Privacy Notice Content

The modal includes information about:

1. **Collection of Personal Data** - What data is collected
2. **Use of Data** - How the data is used
3. **Data Protection** - Security measures and RA 10173 compliance
4. **User Rights** - Rights to access, correct, delete data, and file complaints with NPC
5. **Third-Party Services** - Information about third-party integrations

## Mobile Responsiveness

The modal is fully responsive with:
- Adaptive text sizes (sm:text-base for mobile, larger for desktop)
- Flexible layout (flex-col on mobile, flex-row on desktop for footer)
- Maximum 90vh height with scrollable content
- Touch-friendly button sizes
- Backdrop blur effect for modern feel

## User Experience

- **Smooth animations** when opening/closing
- **Backdrop click** to close (same as accept)
- **Non-intrusive** z-index of 100 to appear above all content
- **Clear visual hierarchy** with gradient header and organized content sections
- **Easy to read** with proper spacing and typography

## Testing

To test the privacy notice:

1. **First-time user test:**
   - Clear localStorage for your domain
   - Login with your account
   - Should see the modal immediately

2. **Refresh counter test:**
   - Open browser console
   - Run: `localStorage.setItem('ktr_refresh_count_YOUR_USER_ID', '9')`
   - Refresh the page
   - Should see the modal on the 10th refresh

3. **Mobile responsive test:**
   - Open browser DevTools
   - Toggle device toolbar
   - Test on various screen sizes (mobile, tablet, desktop)

## Future Enhancements

Potential improvements:
- Add version tracking to show modal when privacy policy is updated
- Add analytics to track consent rates
- Add option to view privacy notice from settings/profile page
- Multi-language support for the privacy notice
