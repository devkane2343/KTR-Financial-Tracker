-- ============================================================================
-- FIX — settle "Life Insurance" for the CURRENT month and roll it forward.
-- ============================================================================
-- What this does, in one transaction, for the account below:
--   1. Removes any duplicate bill_payments rows for the bill (keeps the newest
--      per due_date) so the unique(bill_id, due_date) index is clean.
--   2. Records ONE payment for the bill's current (overdue) due_date, if one
--      isn't already there — this is the "settle for this month" step.
--   3. Advances the bill's due_date by one month so it leaves the Overdue group
--      and shows up again only when next month's payment is actually due.
--
-- Idempotent: run it twice and the second run is a no-op (the payment already
-- exists for that due_date and the due_date has already moved on).
--
-- Run life_insurance_settle_inspect.sql first to confirm the rows.
-- Replace the email if fixing a different account.
-- ============================================================================

do $$
declare
  v_user_id  uuid;
  v_bill_id  uuid;
  v_due      date;
  v_amount   numeric(12,2);
begin
  -- Resolve the account + the target bill.
  select b.user_id, b.id, b.due_date, b.amount
    into v_user_id, v_bill_id, v_due, v_amount
  from public.bills b
  join auth.users u on u.id = b.user_id
  where lower(u.email) = lower('devkane2343@gmail.com')
    and lower(b.name) like '%life insurance%'
  order by b.active desc
  limit 1;

  if v_bill_id is null then
    raise notice 'No Life Insurance bill found for that account — nothing to do.';
    return;
  end if;

  -- 1) De-duplicate payment rows: keep the newest row per (bill_id, due_date).
  delete from public.bill_payments p
  using (
    select id,
           row_number() over (
             partition by bill_id, due_date
             order by created_at desc, id desc
           ) as rn
    from public.bill_payments
    where bill_id = v_bill_id
  ) ranked
  where p.id = ranked.id
    and ranked.rn > 1;

  -- 2) Settle the current cycle: insert a payment for the current due_date
  --    unless one already exists. paid_date = today.
  if not exists (
    select 1 from public.bill_payments
    where bill_id = v_bill_id and due_date = v_due
  ) then
    insert into public.bill_payments (id, user_id, bill_id, due_date, paid_date, amount)
    values (gen_random_uuid(), v_user_id, v_bill_id, v_due, current_date, v_amount);
    raise notice 'Recorded settle payment for % on due_date %.', v_bill_id, v_due;
  else
    raise notice 'Payment for due_date % already exists — skipping insert.', v_due;
  end if;

  -- 3) Roll the bill forward one month so it stops reading as overdue, but only
  --    if it hasn't already been advanced past the settled cycle.
  if v_due <= current_date then
    update public.bills
    set due_date = (v_due + interval '1 month')::date
    where id = v_bill_id;
    raise notice 'Advanced due_date to %.', (v_due + interval '1 month')::date;
  else
    raise notice 'due_date % is already in the future — not advancing.', v_due;
  end if;
end $$;

-- Verify: the bill should now be in the future, with a payment logged for the
-- month you just settled.
select b.name, b.due_date as next_due, b.active,
       (select count(*) from public.bill_payments p where p.bill_id = b.id) as payments_recorded
from public.bills b
join auth.users u on u.id = b.user_id
where lower(u.email) = lower('devkane2343@gmail.com')
  and lower(b.name) like '%life insurance%';
