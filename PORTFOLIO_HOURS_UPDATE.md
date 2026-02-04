# Portfolio Feature - Hours Per Day Update

## Overview

Added a customizable "Hours Per Day" field to the portfolio editor, allowing users to specify their actual working hours instead of assuming everyone works 8 hours per day.

## What Changed

### 1. Database Schema Update
**File:** `supabase/portfolio_schema.sql`

Added new column:
```sql
hours_per_day DECIMAL(4, 1) DEFAULT 8.0 CHECK (hours_per_day > 0 AND hours_per_day <= 24)
```

- Default value: 8.0 hours
- Allows decimal values (e.g., 7.5, 9.5)
- Range: 1 to 24 hours
- Used in all rate calculations

### 2. Type Definition
**File:** `types.ts`

Added `hours_per_day: number` to Portfolio interface.

### 3. Portfolio Utils
**File:** `lib/portfolioUtils.ts`

- Updated `loadPortfolio()` to fetch and parse `hours_per_day` field
- Updated `savePortfolio()` to save `hours_per_day` to database
- Default value: 8 if not set

### 4. Profile Page Editor
**File:** `components/ProfilePage.tsx`

**New UI Elements:**
- Hours Per Day input field (number input)
- Range: 1-24 hours, step 0.5
- Placed next to Rate Type buttons in a 3-column grid
- Shows "Default: 8 hours" hint below

**Updated Calculations:**
- `handleRateChange()`: Uses custom hours per day in conversions
- `handleHoursPerDayChange()`: New handler that updates hours and recalculates rates
- Real-time rate display shows custom hours in calculations

**Calculation Display:**
- Monthly mode: Shows hourly rate with custom hours (e.g., "₱X/hr (10h/day)")
- Hourly mode: Shows daily and monthly with custom hours (e.g., "Daily: ₱X (10h/day)")

### 5. Portfolio Card Display
**File:** `components/PortfolioCard.tsx`

**Visual Updates:**
- Shows hours per day badge in compensation section
- Badge displays: "Xh/day" (e.g., "8h/day", "10h/day")
- All rate calculations use custom hours
- Formula displays show actual hours used (e.g., "÷ 10 hours" instead of "÷ 8 hours")

## New Calculation Formulas

### With Custom Hours Per Day:

**Monthly to Hourly:**
```
hourly_rate = monthly_rate ÷ 22.5 days ÷ hours_per_day
```

**Hourly to Monthly:**
```
monthly_rate = hourly_rate × hours_per_day × 22.5 days
```

**Daily Rate:**
- From Hourly: `hourly_rate × hours_per_day`
- From Monthly: `monthly_rate ÷ 22.5 days`

## Example Scenarios

### Scenario 1: Part-time (6 hours/day)
- **Hourly Rate:** ₱100/hr
- **Daily Rate:** ₱600 (100 × 6)
- **Monthly:** ₱13,500 (100 × 6 × 22.5)

### Scenario 2: Standard (8 hours/day)
- **Hourly Rate:** ₱100/hr
- **Daily Rate:** ₱800 (100 × 8)
- **Monthly:** ₱18,000 (100 × 8 × 22.5)

### Scenario 3: Extended (10 hours/day)
- **Hourly Rate:** ₱100/hr
- **Daily Rate:** ₱1,000 (100 × 10)
- **Monthly:** ₱22,500 (100 × 10 × 22.5)

### Scenario 4: Monthly to Hourly (10 hours/day)
- **Monthly Rate:** ₱50,000
- **Daily Rate:** ₱2,222.22 (50,000 ÷ 22.5)
- **Hourly:** ₱222.22 (50,000 ÷ 22.5 ÷ 10)

## UI Layout Changes

### Profile Page - Rate Section (Now 3 columns on desktop):

```
┌─────────────────────────────────────────────────────────┐
│  Rate Type (2 cols)      │  Hours Per Day (1 col)       │
│  [Hourly] [Monthly]      │  [8.0] Default: 8 hours      │
└─────────────────────────────────────────────────────────┘
```

### Portfolio Card - Compensation Section:

```
┌──────────────────────────────────────────────────────────┐
│ 💰 COMPENSATION                          [8h/day]        │
│                                                           │
│  Monthly: ₱50,000    Daily: ₱2,222.22    Hourly: ₱277.78│
│                      ÷ 22.5 days          ÷ 8 hours      │
└──────────────────────────────────────────────────────────┘
```

## Database Migration

If you've already run the initial `portfolio_schema.sql`, you need to add the new column:

```sql
-- Add hours_per_day column to existing portfolio table
ALTER TABLE portfolio 
ADD COLUMN IF NOT EXISTS hours_per_day DECIMAL(4, 1) DEFAULT 8.0 
CHECK (hours_per_day > 0 AND hours_per_day <= 24);

-- Update existing records to have default 8 hours if NULL
UPDATE portfolio 
SET hours_per_day = 8.0 
WHERE hours_per_day IS NULL;
```

**OR** re-run the updated `portfolio_schema.sql` (it will create the table with the new column).

## User Benefits

✅ **Accurate Calculations** - Reflects actual working hours
✅ **Flexibility** - Supports part-time, full-time, and overtime schedules
✅ **Transparency** - Shows how calculations are performed
✅ **Easy to Use** - Simple number input with sensible defaults
✅ **Real-time Updates** - Rates recalculate immediately when hours change

## Edge Cases Handled

1. **Empty/Zero Hours:** Defaults to 8 hours
2. **Rate Recalculation:** When hours change, opposite rate automatically recalculates
3. **Display Formatting:** Properly formats hours in text (e.g., "8h/day", "10h/day")
4. **Database Constraint:** Prevents invalid hours (< 1 or > 24)
5. **Decimal Support:** Allows 0.5 increments (e.g., 7.5, 8.5, 9.5 hours)

## Testing Checklist

- [ ] Create new portfolio with default 8 hours → Calculations correct
- [ ] Change hours to 6 → Rates recalculate correctly
- [ ] Change hours to 10 → Rates recalculate correctly
- [ ] Enter hourly rate with custom hours → Monthly calculated correctly
- [ ] Enter monthly rate with custom hours → Hourly calculated correctly
- [ ] View Portfolio tab → Hours badge displays correctly
- [ ] View Portfolio tab → Rate formulas show custom hours
- [ ] Save and reload → Hours per day persists
- [ ] Try decimal hours (7.5) → Works correctly

## Files Modified

1. `supabase/portfolio_schema.sql` - Added hours_per_day column
2. `types.ts` - Added hours_per_day to Portfolio interface
3. `lib/portfolioUtils.ts` - Load/save hours_per_day
4. `components/ProfilePage.tsx` - Added input and calculation logic
5. `components/PortfolioCard.tsx` - Display hours badge and use in formulas

## Summary

The portfolio feature now supports customizable working hours, making rate calculations accurate for all work schedules:
- Part-time workers (4-6 hours)
- Standard workers (8 hours)
- Extended hours (9-12 hours)
- Any custom schedule

All calculations automatically adjust based on the specified hours per day!
