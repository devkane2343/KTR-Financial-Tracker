# Admin Dashboard Features

## Overview
The KTR Financial Tracker now includes a comprehensive admin dashboard exclusively accessible by `devkane2343@gmail.com`. This dashboard provides full control over user management and communication.

## Quick Start

### 1. Setup (One-time)
1. Run `supabase/admin_schema.sql` in your Supabase SQL Editor
2. Grant admin access to your account by running the setup script (see `supabase/ADMIN_SETUP.md`)
3. Sign out and sign back in
4. You'll see a new "Admin" tab in the navigation

### 2. Access the Dashboard
- Sign in with `devkane2343@gmail.com`
- Click the "Admin" tab (Shield icon) in the navigation menu
- The dashboard will load with user statistics and management tools

## Features

### 📊 User Statistics Dashboard
View real-time statistics:
- **Total Users**: All registered users
- **Active Users**: Users with active accounts
- **Suspended Users**: Temporarily disabled accounts
- **Deleted Users**: Soft-deleted accounts

### 👥 User Management Table
Comprehensive user information display:
- User details (name, email, joined date)
- Account status (Active/Suspended/Deleted)
- Financial overview (Total Income, Total Expenses, Net Amount)
- Last sign-in information
- Number of notifications sent

### 🔍 Search & Filter
- **Search**: Find users by email or name
- **Filter by Status**: View all, active, suspended, or deleted users
- Real-time filtering as you type

### 💬 Messaging System

#### Individual Messages
1. Click the mail icon next to any user
2. A notification is sent instantly to their dashboard
3. They'll see it in their notification bar (bell icon)

#### Bulk Messaging
1. Select multiple users using checkboxes
2. Click "Send Message" button
3. Choose message type (Info, Success, Warning, Error)
4. Enter title and message
5. Send to all selected users at once

Message types and their colors:
- **Info** (Blue): General information
- **Success** (Green): Positive updates
- **Warning** (Yellow): Important notices
- **Error** (Red): Critical alerts

### 🚫 Account Management

#### Suspend Account
1. Click the ban icon next to a user
2. Enter a suspension reason
3. User is immediately suspended
4. They receive a notification about the suspension
5. Their account status changes to "Suspended"

#### Reactivate Account
1. Find a suspended user
2. Click the rotate icon
3. Confirm reactivation
4. User regains full access
5. They receive a reactivation notification

#### Delete Account
1. Click the trash icon next to a user
2. Enter deletion reason
3. Confirm deletion (this is a soft delete)
4. User's status changes to "Deleted"
5. Their data is preserved but marked as deleted

### 🔔 User Notification Bar
All users (including admin) have a notification bar:
- Bell icon in the top navigation
- Red badge shows unread notification count
- Click to view all notifications
- Mark as read or delete notifications
- Auto-refreshes every 30 seconds

## Security Features

### Access Control
- Only `devkane2343@gmail.com` can access admin features
- Admin status is verified on every page load
- Unauthorized users see an "Access Denied" message

### Row Level Security (RLS)
- All database operations are protected by Supabase RLS
- Regular users can only see their own data
- Admins can see all data through special policies
- All admin actions are logged with timestamps

### Audit Trail
Every admin action records:
- Who performed the action (admin user ID)
- When it was performed (timestamp)
- What reason was given (for suspensions/deletions)
- Target user information

## Usage Examples

### Example 1: Welcome New Users
1. Go to Admin Dashboard
2. Filter by "Active" status
3. Select all new users
4. Send a welcome message:
   - Type: Success
   - Title: "Welcome to KTR Financial Tracker!"
   - Message: "Thank you for joining. Start by logging your first income..."

### Example 2: Suspend a Problematic Account
1. Search for the user by email
2. Click the ban icon
3. Enter reason: "Suspicious activity detected"
4. User is suspended and notified

### Example 3: Send System Maintenance Notice
1. Select all active users
2. Send a warning message:
   - Type: Warning
   - Title: "System Maintenance"
   - Message: "Scheduled maintenance on [date]. Expect 1 hour downtime."

### Example 4: Monthly Activity Reminder
1. Filter users by activity (check their last sign-in)
2. Select inactive users
3. Send info message encouraging them to log their finances

## Technical Details

### Database Tables

#### admin_users
- Stores admin user IDs and emails
- Only users in this table can access admin features

#### user_accounts
- Tracks account status (active, suspended, deleted)
- Stores suspension/deletion reasons and timestamps

#### user_notifications
- Stores all notifications sent to users
- Tracks read/unread status

### API Functions
All admin operations use secure functions in `lib/adminUtils.ts`:
- `isUserAdmin()`: Check if current user is admin
- `getUserStatistics()`: Get user count statistics
- `getAllUsersWithDetails()`: Fetch all users with financial data
- `sendNotificationToUser()`: Send message to one user
- `sendNotificationToMultipleUsers()`: Bulk send messages
- `suspendUserAccount()`: Suspend a user
- `reactivateUserAccount()`: Reactivate suspended user
- `deleteUserAccount()`: Soft delete a user

### Components
- `AdminDashboard.tsx`: Main admin interface
- `NotificationBar.tsx`: User notification display
- `AdminGuard.tsx`: Security wrapper for admin routes

## Best Practices

1. **Always provide reasons**: When suspending or deleting accounts, always provide clear, professional reasons
2. **Use appropriate message types**: Match the message type to the content (don't use "Error" for general info)
3. **Review before bulk actions**: Double-check your selection before sending bulk messages
4. **Suspend before deleting**: Try suspension first, use deletion only when necessary
5. **Monitor regularly**: Check the dashboard regularly to stay informed about user activity
6. **Keep credentials secure**: Never share your admin account credentials

## Troubleshooting

### Admin tab not showing?
- Verify you're signed in with `devkane2343@gmail.com`
- Check that admin_schema.sql has been run
- Verify your user ID is in the admin_users table

### Can't see any users?
- Check Supabase authentication settings
- Verify RLS policies are enabled
- Check browser console for errors

### Notifications not sending?
- Verify user_notifications table exists
- Check that RLS policies allow admin to insert
- Ensure recipient user IDs are valid

## Future Enhancements

Potential features for future versions:
- Export user data to CSV
- Advanced analytics and reporting
- Email notifications (in addition to in-app)
- User activity logs
- Scheduled messages
- Custom user groups/tags
- Automated actions based on user behavior

---

**Remember**: With great power comes great responsibility. Use admin features ethically and in accordance with privacy laws and user agreements.
