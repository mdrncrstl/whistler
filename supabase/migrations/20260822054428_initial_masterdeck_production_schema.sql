create extension if not exists pgcrypto;

create schema if not exists masterdeck_private;
revoke all on schema masterdeck_private from public, anon, authenticated;

DO $$ BEGIN
  CREATE TYPE public.masterdeck_provider AS ENUM ('ibkr', 'superhero', 'google_gmail');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.masterdeck_connection_status AS ENUM ('pending', 'connected', 'error', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.masterdeck_profiles (
  id uuid primary key,
  email text,
  full_name text,
  avatar_url text,
  base_currency text not null default 'AUD' check (base_currency = 'AUD'),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.masterdeck_broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider public.masterdeck_provider not null,
  label text not null check (char_length(label) between 1 and 80),
  status public.masterdeck_connection_status not null default 'pending',
  credentials_encrypted text,
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, label)
);

create table if not exists public.masterdeck_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_connection_id uuid not null references public.masterdeck_broker_connections(id) on delete cascade,
  provider public.masterdeck_provider not null,
  provider_account_id text not null,
  name text not null,
  base_currency text not null default 'AUD',
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create table if not exists public.masterdeck_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_connection_id uuid not null references public.masterdeck_broker_connections(id) on delete cascade,
  provider public.masterdeck_provider not null,
  provider_account_id text not null,
  account_name text not null,
  symbol text not null,
  name text,
  market text,
  currency text not null default 'AUD',
  asset_class text,
  sector text,
  quantity numeric not null default 0,
  average_cost numeric not null default 0,
  current_price numeric not null default 0,
  fx_rate numeric not null default 1,
  value_aud numeric not null default 0,
  cost_aud numeric not null default 0,
  unrealised_gain_aud numeric not null default 0,
  return_pct numeric not null default 0,
  day_change_aud numeric not null default 0,
  as_of timestamptz not null default now(),
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker_connection_id, provider, provider_account_id, symbol)
);

create table if not exists public.masterdeck_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_connection_id uuid references public.masterdeck_broker_connections(id) on delete set null,
  provider public.masterdeck_provider not null,
  provider_external_id text not null,
  provider_account_id text,
  account_name text,
  date timestamptz not null,
  type text not null check (char_length(type) between 1 and 32),
  symbol text,
  description text,
  quantity numeric not null default 0,
  price numeric not null default 0,
  currency text not null default 'AUD',
  amount numeric not null default 0,
  fees numeric not null default 0,
  fx_rate numeric not null default 1,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_external_id)
);

create table if not exists public.masterdeck_cash_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_connection_id uuid not null references public.masterdeck_broker_connections(id) on delete cascade,
  provider public.masterdeck_provider not null,
  provider_account_id text not null,
  account_name text not null,
  currency text not null,
  balance numeric not null default 0,
  fx_rate numeric not null default 1,
  value_aud numeric not null default 0,
  as_of timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, broker_connection_id, provider, provider_account_id, currency)
);

create table if not exists public.masterdeck_portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot_date date not null,
  value_aud numeric not null default 0,
  cash_aud numeric not null default 0,
  invested_aud numeric not null default 0,
  benchmark_value_aud numeric,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date, source)
);

create table if not exists public.masterdeck_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  broker_connection_id uuid references public.masterdeck_broker_connections(id) on delete set null,
  provider public.masterdeck_provider not null,
  status text not null check (status in ('running', 'success', 'error', 'partial')),
  message text,
  imported_count integer not null default 0 check (imported_count >= 0),
  details jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists masterdeck_connections_user_provider_idx on public.masterdeck_broker_connections(user_id, provider);
create index if not exists masterdeck_accounts_user_idx on public.masterdeck_accounts(user_id);
create index if not exists masterdeck_positions_user_value_idx on public.masterdeck_positions(user_id, value_aud desc);
create index if not exists masterdeck_transactions_user_date_idx on public.masterdeck_transactions(user_id, date desc);
create index if not exists masterdeck_cash_user_idx on public.masterdeck_cash_balances(user_id);
create index if not exists masterdeck_snapshots_user_date_idx on public.masterdeck_portfolio_snapshots(user_id, snapshot_date);
create index if not exists masterdeck_sync_user_started_idx on public.masterdeck_sync_runs(user_id, started_at desc);

alter table public.masterdeck_profiles enable row level security;
alter table public.masterdeck_broker_connections enable row level security;
alter table public.masterdeck_accounts enable row level security;
alter table public.masterdeck_positions enable row level security;
alter table public.masterdeck_transactions enable row level security;
alter table public.masterdeck_cash_balances enable row level security;
alter table public.masterdeck_portfolio_snapshots enable row level security;
alter table public.masterdeck_sync_runs enable row level security;

revoke all on public.masterdeck_profiles from anon, authenticated;
revoke all on public.masterdeck_broker_connections from anon, authenticated;
revoke all on public.masterdeck_accounts from anon, authenticated;
revoke all on public.masterdeck_positions from anon, authenticated;
revoke all on public.masterdeck_transactions from anon, authenticated;
revoke all on public.masterdeck_cash_balances from anon, authenticated;
revoke all on public.masterdeck_portfolio_snapshots from anon, authenticated;
revoke all on public.masterdeck_sync_runs from anon, authenticated;

grant all on public.masterdeck_profiles to service_role;
grant all on public.masterdeck_broker_connections to service_role;
grant all on public.masterdeck_accounts to service_role;
grant all on public.masterdeck_positions to service_role;
grant all on public.masterdeck_transactions to service_role;
grant all on public.masterdeck_cash_balances to service_role;
grant all on public.masterdeck_portfolio_snapshots to service_role;
grant all on public.masterdeck_sync_runs to service_role;

comment on table public.masterdeck_broker_connections is 'Server-only encrypted integration credentials. Browser roles have no privileges.';
comment on table public.masterdeck_positions is 'Normalised current positions, accessible only through the authenticated MASTERDECK Edge API.';
comment on table public.masterdeck_transactions is 'Deduplicated broker activity ledger, accessible only through the authenticated MASTERDECK Edge API.';;
