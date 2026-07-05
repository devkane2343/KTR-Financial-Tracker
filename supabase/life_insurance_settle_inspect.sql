-- ============================================================================
-- INSPECT — why does "Life Insurance" keep showing as overdue after Settle?
-- ============================================================================
-- Run this FIRST in the Supabase SQL editor. It only SELECTs — nothing is
-- changed. Read the output, then run life_insurance_settle_fix.sql.
--
-- Replace the email below if you are inspecting a different account.
-- ============================================================================

-- 1) The bill row itself: what due_date does the app think it has?
select b.id            as bill_id,
       b.name,
       b.category,
       b.amount,
       b.due_date,
       b.total_payments,
       b.active,
       (b.due_date < current_date) as is_overdue_now
from public.bills b
join auth.users u on u.id = b.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and lower(b.name) like '%life insurance%';

-- 2) Every payment recorded against that bill, newest first.
--    A row whose due_date == the bill's current due_date is the collision that
--    makes Settle a no-op / makes the unique(bill_id, due_date) index reject
--    the next insert.
select p.id            as payment_id,
       p.bill_id,
       p.due_date,
       p.paid_date,
       p.amount,
       p.created_at
from public.bill_payments p
join public.bills b on b.id = p.bill_id
join auth.users u   on u.id = b.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and lower(b.name) like '%life insurance%'
order by p.due_date desc, p.created_at desc;

-- 3) Duplicate DETECTION: any (bill_id, due_date) pair with more than one
--    payment row. There should be zero rows — the unique index should prevent
--    it — but if the index was added after dupes existed, they can linger.
select p.bill_id, p.due_date, count(*) as copies
from public.bill_payments p
join public.bills b on b.id = p.bill_id
join auth.users u   on u.id = b.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and lower(b.name) like '%life insurance%'
group by p.bill_id, p.due_date
having count(*) > 1;
