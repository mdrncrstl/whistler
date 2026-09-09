create table if not exists public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  primary_goal text check (primary_goal in ('performance', 'tax', 'both')),
  portfolio_structure text check (portfolio_structure in ('single', 'multiple')),
  asset_types text[] not null default '{}',
  referral_source text check (referral_source in ('google', 'youtube', 'friend', 'social', 'professional', 'other')),
  onboarding_completed_at timestamptz,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  access_mode text not null default 'trial' check (access_mode in ('trial', 'grandfathered')),
  created_at timestamptz not null default now(),
  constraint account_access_trial_window check (trial_ends_at > trial_started_at),
  constraint account_access_asset_types check (asset_types <@ array['stocks_etfs','crypto','managed_funds','property','other']::text[])
);

alter table public.account_access enable row level security;
revoke all on public.account_access from anon, authenticated;
grant select on public.account_access to authenticated;
grant insert (user_id, primary_goal, portfolio_structure, asset_types, referral_source, onboarding_completed_at) on public.account_access to authenticated;
grant update (primary_goal, portfolio_structure, asset_types, referral_source, onboarding_completed_at) on public.account_access to authenticated;
grant all on public.account_access to service_role;

drop policy if exists "Users can read their own account access" on public.account_access;
create policy "Users can read their own account access"
on public.account_access for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own onboarding record" on public.account_access;
create policy "Users can create their own onboarding record"
on public.account_access for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own onboarding answers" on public.account_access;
create policy "Users can update their own onboarding answers"
on public.account_access for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.account_access (user_id, onboarding_completed_at, trial_started_at, trial_ends_at, access_mode)
select id, now(), created_at, created_at + interval '14 days', 'grandfathered'
from auth.users
on conflict (user_id) do nothing;

create schema if not exists private;

create or replace function private.handle_new_masterdeck_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_access (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_masterdeck_user() from public, anon, authenticated;

drop trigger if exists on_masterdeck_user_created on auth.users;
create trigger on_masterdeck_user_created
after insert on auth.users
for each row execute function private.handle_new_masterdeck_user();

comment on table public.account_access is 'Per-user onboarding answers and server-issued 14-day no-card trial window. Trial columns are not writable by browser roles.';
