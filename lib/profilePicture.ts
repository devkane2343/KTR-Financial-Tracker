import { supabase } from './supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

export const uploadProfilePicture = async (file: File, userId: string): Promise<{ url: string | null; error: string | null }> => {
  try {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return { url: null, error: 'File size must be less than 5MB' };
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { url: null, error: 'File type must be JPEG, PNG, WebP, or GIF' };
    }

    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    // Delete old avatar if exists
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
      await supabase.storage
        .from('avatars')
        .remove(filesToDelete);
    }

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      return { url: null, error: uploadError.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Update user metadata with avatar URL
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: publicUrl }
    });

    if (updateError) {
      return { url: null, error: updateError.message };
    }

    return { url: publicUrl, error: null };
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Upload failed' };
  }
};

export const deleteProfilePicture = async (userId: string): Promise<{ success: boolean; error: string | null }> => {
  try {
    // List and delete all files in user's folder
    const { data: files } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (files && files.length > 0) {
      const filesToDelete = files.map(f => `${userId}/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove(filesToDelete);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }
    }

    // Remove avatar URL from user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: null }
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
};

export const getProfilePictureUrl = (user: any): string | null => {
  return user?.user_metadata?.avatar_url || null;
};
