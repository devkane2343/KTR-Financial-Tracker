# Portfolio & Dreams Feature

## Overview

Added a comprehensive Portfolio section to the Profile page that allows users to track their professional information and career goals.

## Features Added

### 1. Portfolio Information
- **Company Name**: Track your current employer
- **Position**: Your job title or role
- **Rate Management**: 
  - Toggle between Hourly Rate and Monthly Rate
  - Automatic conversion between the two
  - Monthly rate is divided by 22.5 working days to show daily rate
  - Hourly rate is multiplied by 8 hours/day × 22.5 days to estimate monthly rate

### 2. Dreams & 5-Year Goals
- Large text area to describe your aspirations
- Career goals and personal development targets
- Where you see yourself in 5 years

## Database Setup

Run the following SQL script in your Supabase SQL Editor:

```sql
-- File: supabase/portfolio_schema.sql
```

This creates:
- A `portfolio` table with all necessary fields
- Row Level Security (RLS) policies to ensure users only see their own data
- Automatic timestamp tracking
- Foreign key constraints to the auth.users table

## Files Modified/Created

### Created Files:
1. `supabase/portfolio_schema.sql` - Database schema for portfolio table
2. `lib/portfolioUtils.ts` - Functions to load and save portfolio data
3. `PORTFOLIO_FEATURE.md` - This documentation file

### Modified Files:
1. `types.ts` - Added `Portfolio` interface
2. `components/ProfilePage.tsx` - Added Portfolio and Dreams sections with full UI

## Usage

1. **Setup Database**:
   - Go to Supabase Dashboard → SQL Editor
   - Run the `supabase/portfolio_schema.sql` script

2. **Access the Feature**:
   - Click on your profile picture in the top right
   - Select "Profile" from the dropdown
   - Scroll down to see:
     - Portfolio & Career section (blue)
     - Your Dreams section (purple)

3. **Enter Your Information**:
   - Fill in your company name and position
   - Choose rate type (Hourly or Monthly)
   - Enter your rate amount (automatically converts to show the other format)
   - Write your 5-year goals and dreams
   - Click "Save Portfolio" or "Save Dreams"

## Rate Conversion Logic

### Monthly to Hourly:
- **Formula**: `hourly_rate = monthly_rate / 22.5 / 8`
- Based on 22.5 working days per month (average)
- 8 hours per working day

### Hourly to Monthly:
- **Formula**: `monthly_rate = hourly_rate × 8 × 22.5`
- Based on 8 hours per day
- 22.5 working days per month (average)

## UI Features

- **Visual Feedback**: Success/error messages for save operations
- **Loading States**: Spinner animations during save
- **Real-time Calculation**: Shows converted rates as you type
- **Responsive Design**: Works on mobile and desktop
- **Themed Sections**: 
  - Blue gradient for Portfolio
  - Purple gradient for Dreams
  - Maintains the app's design language

## Security

- All data is protected by Row Level Security (RLS)
- Users can only view and edit their own portfolio information
- Data is tied to the authenticated user's ID
- Automatic CASCADE deletion if user account is deleted

## Data Storage

The portfolio data includes:
- `user_id` - Reference to auth.users
- `company_name` - Text field
- `position` - Text field
- `rate_type` - 'hourly' or 'monthly'
- `hourly_rate` - Decimal (up to 12 digits, 2 decimals)
- `monthly_rate` - Decimal (up to 12 digits, 2 decimals)
- `dreams` - Text field (unlimited length)
- `created_at` - Timestamp
- `updated_at` - Auto-updating timestamp

## Future Enhancements (Optional)

- Multiple portfolio entries (job history)
- Goal tracking with progress bars
- Timeline view of career progression
- Skills and certifications section
- Export portfolio as PDF
