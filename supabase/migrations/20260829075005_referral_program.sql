create table if not exists public.referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  constraint referral_profiles_code_format check (code ~ '^MD-[A-Z0-9]{8}$')
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null unique references auth.users(id) on delete cascade,
  invitee_label text not null default 'New investor',
  source text not null default 'link' check (source in ('link', 'email', 'share', 'manual')),
  status text not null default 'signed_up' check (status in ('signed_up', 'qualified', 'rewarded', 'reversed')),
  signed_up_at timestamptz not null default now(),
  qualified_at timestamptz,
  rewarded_at timestamptz,
  qualifying_invoice_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_attributions_no_self_referral check (referrer_user_id <> referred_user_id)
);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.referral_attributions(id) on delete cascade,
  beneficiary_user_id uuid not null references auth.users(id) on delete cascade,
  beneficiary_kind text not null check (beneficiary_kind in ('referrer', 'friend')),
  amount_aud_cents integer not null default 2000 check (amount_aud_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'applied', 'reversed')),
  stripe_event_id text,
  stripe_balance_transaction_id text unique,
  applied_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attribution_id, beneficiary_kind)
);

create index if not exists referral_attributions_referrer_created_idx
  on public.referral_attributions (referrer_user_id, created_at desc);
create index if not exists referral_rewards_beneficiary_created_idx
  on public.referral_rewards (beneficiary_user_id, created_at desc);
create index if not exists referral_rewards_pending_idx
  on public.referral_rewards (beneficiary_user_id, status) where status = 'pending';

alter table public.referral_profiles enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.referral_rewards enable row level security;

revoke all on public.referral_profiles, public.referral_attributions, public.referral_rewards from anon, authenticated;
grant select on public.referral_profiles, public.referral_attributions, public.referral_rewards to authenticated;
grant all on public.referral_profiles, public.referral_attributions, public.referral_rewards to service_role;

drop policy if exists "Users can read their own referral profile" on public.referral_profiles;
create policy "Users can read their own referral profile"
on public.referral_profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read referrals they participate in" on public.referral_attributions;
create policy "Users can read referrals they participate in"
on public.referral_attributions for select
to authenticated
using ((select auth.uid()) = referrer_user_id or (select auth.uid()) = referred_user_id);

drop policy if exists "Users can read their own referral rewards" on public.referral_rewards;
create policy "Users can read their own referral rewards"
on public.referral_rewards for select
to authenticated
using ((select auth.uid()) = beneficiary_user_id);

create schema if not exists private;

create or replace function private.ensure_referral_profile(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_code text;
  generated_code text;
begin
  select profile.code into existing_code
  from public.referral_profiles as profile
  where profile.user_id = p_user_id;

  if existing_code is not null then
    return existing_code;
  end if;

  loop
    generated_code := 'MD-' || upper(substr(md5(p_user_id::text || clock_timestamp()::text || random()::text), 1, 8));
    begin
      insert into public.referral_profiles (user_id, code)
      values (p_user_id, generated_code);
      return generated_code;
    exception when unique_violation then
      select profile.code into existing_code
      from public.referral_profiles as profile
      where profile.user_id = p_user_id;
      if existing_code is not null then return existing_code; end if;
    end;
  end loop;
end;
$$;

revoke all on function private.ensure_referral_profile(uuid) from public, anon, authenticated;

create or replace function public.get_my_referral_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;
  return private.ensure_referral_profile(current_user_id);
end;
$$;

revoke all on function public.get_my_referral_code() from public, anon;
grant execute on function public.get_my_referral_code() to authenticated;

create or replace function public.claim_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  owner_user_id uuid;
  existing_owner_id uuid;
  invitee_first_name text;
  normalized_code text := upper(trim(coalesce(p_code, '')));
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if normalized_code !~ '^MD-[A-Z0-9]{8}$' then
    return jsonb_build_object('accepted', false, 'reason', 'invalid');
  end if;

  select profile.user_id into owner_user_id
  from public.referral_profiles as profile
  where profile.code = normalized_code;

  if owner_user_id is null then
    return jsonb_build_object('accepted', false, 'reason', 'not_found');
  end if;

  if owner_user_id = current_user_id then
    return jsonb_build_object('accepted', false, 'reason', 'self_referral');
  end if;

  select attribution.referrer_user_id into existing_owner_id
  from public.referral_attributions as attribution
  where attribution.referred_user_id = current_user_id;

  if existing_owner_id is not null then
    return jsonb_build_object(
      'accepted', existing_owner_id = owner_user_id,
      'reason', case when existing_owner_id = owner_user_id then 'already_claimed' else 'already_attributed' end
    );
  end if;

  select coalesce(
    nullif(split_part(trim(coalesce(user_record.raw_user_meta_data ->> 'full_name', '')), ' ', 1), ''),
    nullif(split_part(coalesce(user_record.email, ''), '@', 1), ''),
    'New investor'
  ) into invitee_first_name
  from auth.users as user_record
  where user_record.id = current_user_id;

  insert into public.referral_attributions (
    referrer_user_id,
    referred_user_id,
    invitee_label,
    source
  ) values (
    owner_user_id,
    current_user_id,
    left(invitee_first_name, 48),
    'link'
  );

  return jsonb_build_object('accepted', true, 'reason', 'claimed');
end;
$$;

revoke all on function public.claim_referral_code(text) from public, anon;
grant execute on function public.claim_referral_code(text) to authenticated;

create or replace function private.handle_new_referral_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_referral_profile(new.id);
  return new;
end;
$$;

revoke all on function private.handle_new_referral_user() from public, anon, authenticated;

drop trigger if exists on_masterdeck_referral_user_created on auth.users;
create trigger on_masterdeck_referral_user_created
after insert on auth.users
for each row execute function private.handle_new_referral_user();

do $$
declare
  user_record record;
begin
  for user_record in select id from auth.users loop
    perform private.ensure_referral_profile(user_record.id);
  end loop;
end;
$$;

comment on table public.referral_profiles is 'Stable, non-guessable-enough sharing codes. Users can read only their own code.';
comment on table public.referral_attributions is 'One immutable referral attribution per invited account, qualified only by server-side billing events.';
comment on table public.referral_rewards is 'Auditable A$20 Stripe invoice-balance credits for referrers and referred customers.';
