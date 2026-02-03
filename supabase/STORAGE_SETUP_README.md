# Profile Picture Storage Setup

This guide explains how to set up the Supabase Storage bucket for profile pictures.

## Storage Bucket Configuration

The profile picture feature uses Supabase Storage with the following specifications:

- **Bucket Name**: `avatars`
- **Max File Size**: 5MB (5,242,880 bytes)
- **Allowed File Types**: JPEG, JPG, PNG, WebP, GIF
- **Public Access**: Yes (avatars are publicly viewable)

## Setup Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Enabled
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg`
     - `image/png`
     - `image/webp`
     - `image/gif`
5. Click **"Create bucket"**

### Option 2: Using SQL (Advanced)

Run the SQL script from `storage_setup.sql` in the Supabase SQL Editor:

```bash
# Navigate to your Supabase project dashboard
# Go to SQL Editor
# Copy and paste the contents of storage_setup.sql
# Click "Run"
```

## Security Policies

The storage bucket has the following Row Level Security (RLS) policies:

1. **Upload Policy**: Users can only upload to their own folder (`user_id/`)
2. **Update Policy**: Users can only update their own avatar
3. **Delete Policy**: Users can only delete their own avatar
4. **Read Policy**: Anyone can view avatars (public bucket)

## File Structure

Avatars are stored in the following structure:

```
avatars/
  ├── user-id-1/
  │   └── avatar.jpg
  ├── user-id-2/
  │   └── avatar.png
  └── user-id-3/
      └── avatar.webp
```

Each user has their own folder named after their user ID.

## Usage in the App

The profile picture feature includes:

- **Upload**: Users can upload a new profile picture (max 5MB)
- **Preview**: Live preview of the uploaded image
- **Delete**: Users can remove their profile picture
- **Display**: Profile pictures appear in:
  - Profile page header
  - Navigation dropdown menu
  - Any other location where user info is displayed

## Troubleshooting

### Storage bucket not found
- Make sure you've created the `avatars` bucket in your Supabase project
- Check that the bucket name is exactly `avatars` (lowercase)

### Upload fails with "Policy violation"
- Ensure RLS policies are set up correctly
- Run the `storage_setup.sql` script to create the policies

### Images not displaying
- Check that the bucket is set to "Public"
- Verify the image URL is accessible
- Check browser console for CORS errors

### File size limit errors
- The free tier limit is 5MB per file
- Consider implementing client-side image compression for larger files
- You can adjust the limit in the bucket settings if needed

## Supabase Free Tier Limits

- **Storage**: 1GB total
- **File uploads**: Unlimited (within storage limit)
- **Bandwidth**: 2GB/month
- **Recommended file size**: 2-5MB per profile picture

For most use cases, the free tier is sufficient for hundreds to thousands of profile pictures.
