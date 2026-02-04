-- =============================================================================
-- Add hours_per_day column to existing portfolio table
-- =============================================================================
-- Run this in Supabase SQL Editor if you already have the portfolio table
-- This migration adds the hours_per_day column with proper defaults and constraints
-- =============================================================================

-- Add the column (if it doesn't exist)
ALTER TABLE portfolio 
ADD COLUMN IF NOT EXISTS hours_per_day DECIMAL(4, 1) DEFAULT 8.0;

-- Add constraint (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'portfolio_hours_per_day_check'
  ) THEN
    ALTER TABLE portfolio 
    ADD CONSTRAINT portfolio_hours_per_day_check 
    CHECK (hours_per_day > 0 AND hours_per_day <= 24);
  END IF;
END $$;

-- Update any existing NULL values to default 8.0
UPDATE portfolio 
SET hours_per_day = 8.0 
WHERE hours_per_day IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'portfolio' 
  AND column_name = 'hours_per_day';

-- =============================================================================
-- DONE! The portfolio table now has the hours_per_day column
-- =============================================================================
