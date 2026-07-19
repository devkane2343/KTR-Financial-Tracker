-- =============================================================================
-- ADMIN READ ACCESS TO USER FINANCIAL DATA
-- Lets admins view (read-only) the income, expense, bill and bill-payment rows
-- each user has entered — powers the "Table Entries" section of the user
-- details modal in the Admin dashboard.
-- Mirrors the existing "Admins can view all portfolios" policy.
-- Run this in the Supabase SQL Editor.
-- =============================================================================

DROP POLICY IF EXISTS "Admins can view all income" ON income_history;
CREATE POLICY "Admins can view all income" ON income_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all expenses" ON expenses;
CREATE POLICY "Admins can view all expenses" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all bills" ON bills;
CREATE POLICY "Admins can view all bills" ON bills
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can view all bill payments" ON bill_payments;
CREATE POLICY "Admins can view all bill payments" ON bill_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );
