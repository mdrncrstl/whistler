create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  plan text check (plan in ('essential', 'investor', 'private_wealth')),
  billing_interval text check (billing_interval in ('monthly', 'annual')),
  status text not null default 'inactive',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
revoke all on public.billing_customers from anon;
grant select on public.billing_customers to authenticated;

drop policy if exists "Users can read their own billing status" on public.billing_customers;
create policy "Users can read their own billing status"
on public.billing_customers for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.billing_customers is 'Stripe identifiers and subscription state. Writes are restricted to service-role Edge Functions.';
