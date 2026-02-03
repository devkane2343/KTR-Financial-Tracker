-- =============================================================================
-- FUNCTION: Get all users with details (for admin dashboard)
-- Run this in Supabase SQL Editor to fix "No users found" in Admin Dashboard
-- =============================================================================

CREATE OR REPLACE FUNCTION get_all_users_with_details()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  full_name TEXT,
  status TEXT,
  total_income NUMERIC,
  total_expenses NUMERIC,
  notification_count BIGINT
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    (u.raw_user_meta_data->>'full_name')::TEXT as full_name,
    COALESCE(ua.status, 'active')::TEXT as status,
    COALESCE(income_sum.total, 0)::NUMERIC as total_income,
    COALESCE(expense_sum.total, 0)::NUMERIC as total_expenses,
    COALESCE(notif_count.count, 0)::BIGINT as notification_count
  FROM auth.users u
  LEFT JOIN public.user_accounts ua ON u.id = ua.user_id
  LEFT JOIN (
    SELECT user_id, SUM(weekly_salary) as total
    FROM public.income_history
    GROUP BY user_id
  ) income_sum ON u.id = income_sum.user_id
  LEFT JOIN (
    SELECT user_id, SUM(amount) as total
    FROM public.expenses
    GROUP BY user_id
  ) expense_sum ON u.id = expense_sum.user_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as count
    FROM public.user_notifications
    GROUP BY user_id
  ) notif_count ON u.id = notif_count.user_id
  ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_with_details() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_with_details() TO service_role;
