import { supabase } from './supabase';

export interface UserAccount {
  id: string;
  user_id: string;
  email: string;
  status: 'active' | 'suspended' | 'deleted';
  suspended_at?: string;
  suspended_by?: string;
  suspension_reason?: string;
  deleted_at?: string;
  deleted_by?: string;
  deletion_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  sent_by?: string;
  sent_at: string;
  read_at?: string;
  created_at: string;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  deleted_users: number;
}

export interface UserWithDetails {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
  full_name?: string;
  status: 'active' | 'suspended' | 'deleted';
  total_income: number;
  total_expenses: number;
  notification_count: number;
}

/**
 * Check if the current user is an admin
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('🔍 Checking admin status for user:', user?.email, 'ID:', user?.id);
    
    if (!user) {
      console.log('❌ No user found');
      return false;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('❌ Error checking admin status:', error);
      console.log('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return false;
    }

    console.log('✅ Admin check result:', !!data, 'Data:', data);
    return !!data;
  } catch (err) {
    console.error('❌ Error in isUserAdmin:', err);
    return false;
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_user_statistics');

    if (error) {
      console.error('Error fetching user statistics:', error);
      return null;
    }

    return {
      total_users: Number(data[0]?.total_users || 0),
      active_users: Number(data[0]?.active_users || 0),
      suspended_users: Number(data[0]?.suspended_users || 0),
      deleted_users: Number(data[0]?.deleted_users || 0),
    };
  } catch (err) {
    console.error('Error in getUserStatistics:', err);
    return null;
  }
}

/**
 * Get all users with details
 */
export async function getAllUsersWithDetails(): Promise<UserWithDetails[]> {
  try {
    // First, get all users from auth.users via admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return [];
    }

    // Get user accounts status
    const { data: accounts } = await supabase
      .from('user_accounts')
      .select('user_id, status');

    // Get income totals
    const { data: incomeTotals } = await supabase
      .from('income_history')
      .select('user_id, weekly_salary');

    // Get expense totals
    const { data: expenseTotals } = await supabase
      .from('expenses')
      .select('user_id, amount');

    // Get notification counts
    const { data: notificationCounts } = await supabase
      .from('user_notifications')
      .select('user_id, is_read');

    const accountsMap = new Map(accounts?.map(a => [a.user_id, a.status]) || []);
    
    const incomeMap = new Map<string, number>();
    incomeTotals?.forEach(i => {
      const current = incomeMap.get(i.user_id) || 0;
      incomeMap.set(i.user_id, current + Number(i.weekly_salary));
    });

    const expenseMap = new Map<string, number>();
    expenseTotals?.forEach(e => {
      const current = expenseMap.get(e.user_id) || 0;
      expenseMap.set(e.user_id, current + Number(e.amount));
    });

    const notificationMap = new Map<string, number>();
    notificationCounts?.forEach(n => {
      const current = notificationMap.get(n.user_id) || 0;
      notificationMap.set(n.user_id, current + 1);
    });

    return users.map(user => ({
      id: user.id,
      email: user.email || '',
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      full_name: user.user_metadata?.full_name,
      status: accountsMap.get(user.id) || 'active',
      total_income: incomeMap.get(user.id) || 0,
      total_expenses: expenseMap.get(user.id) || 0,
      notification_count: notificationMap.get(user.id) || 0,
    }));
  } catch (err) {
    console.error('Error in getAllUsersWithDetails:', err);
    return [];
  }
}

/**
 * Send notification to a user
 */
export async function sendNotificationToUser(
  userId: string,
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        sent_by: user.id,
      });

    if (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in sendNotificationToUser:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Send notification to multiple users
 */
export async function sendNotificationToMultipleUsers(
  userIds: string[],
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info'
): Promise<{ success: boolean; sentCount: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, sentCount: 0, error: 'Not authenticated' };

    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      sent_by: user.id,
    }));

    const { error, count } = await supabase
      .from('user_notifications')
      .insert(notifications);

    if (error) {
      console.error('Error sending notifications:', error);
      return { success: false, sentCount: 0, error: error.message };
    }

    return { success: true, sentCount: count || notifications.length };
  } catch (err) {
    console.error('Error in sendNotificationToMultipleUsers:', err);
    return { success: false, sentCount: 0, error: String(err) };
  }
}

/**
 * Suspend a user account
 */
export async function suspendUserAccount(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if account record exists
    const { data: existingAccount } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingAccount) {
      // Update existing record
      const { error } = await supabase
        .from('user_accounts')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: user.id,
          suspension_reason: reason,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error suspending user:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new record
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const targetUser = users.find(u => u.id === userId);
      
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }

      const { error } = await supabase
        .from('user_accounts')
        .insert({
          user_id: userId,
          email: targetUser.email || '',
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: user.id,
          suspension_reason: reason,
        });

      if (error) {
        console.error('Error creating suspended account:', error);
        return { success: false, error: error.message };
      }
    }

    // Send notification to user
    await sendNotificationToUser(
      userId,
      'Account Suspended',
      `Your account has been suspended. Reason: ${reason}`,
      'warning'
    );

    return { success: true };
  } catch (err) {
    console.error('Error in suspendUserAccount:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Reactivate a suspended user account
 */
export async function reactivateUserAccount(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_accounts')
      .update({
        status: 'active',
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error reactivating user:', error);
      return { success: false, error: error.message };
    }

    // Send notification to user
    await sendNotificationToUser(
      userId,
      'Account Reactivated',
      'Your account has been reactivated. You can now use all features.',
      'success'
    );

    return { success: true };
  } catch (err) {
    console.error('Error in reactivateUserAccount:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Delete a user account (soft delete)
 */
export async function deleteUserAccount(
  userId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if account record exists
    const { data: existingAccount } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingAccount) {
      // Update existing record
      const { error } = await supabase
        .from('user_accounts')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          deletion_reason: reason,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new record
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const targetUser = users.find(u => u.id === userId);
      
      if (!targetUser) {
        return { success: false, error: 'User not found' };
      }

      const { error } = await supabase
        .from('user_accounts')
        .insert({
          user_id: userId,
          email: targetUser.email || '',
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          deletion_reason: reason,
        });

      if (error) {
        console.error('Error creating deleted account:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteUserAccount:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Permanently delete a user (admin only - requires service role)
 */
export async function permanentlyDeleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // This requires service role key, so it should be done via backend
    // For now, we'll just mark as deleted
    const result = await deleteUserAccount(userId, 'Permanently deleted by admin');
    
    // You could also delete from auth.users if you have service role:
    // const { error } = await supabase.auth.admin.deleteUser(userId);
    
    return result;
  } catch (err) {
    console.error('Error in permanentlyDeleteUser:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Get user notifications
 */
export async function getUserNotifications(userId?: string): Promise<UserNotification[]> {
  try {
    let query = supabase
      .from('user_notifications')
      .select('*')
      .order('sent_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getUserNotifications:', err);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in markNotificationAsRead:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteNotification:', err);
    return { success: false, error: String(err) };
  }
}
