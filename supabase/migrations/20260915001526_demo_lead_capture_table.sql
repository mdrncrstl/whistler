create table if not exists public.masterdeck_demo_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  source text not null default 'public_demo' check (source = 'public_demo'),
  first_demo_opened_at timestamptz not null default now(),
  last_demo_opened_at timestamptz not null default now(),
  marketing_opt_in boolean not null default false,
  marketing_opted_in_at timestamptz,
  welcome_email_sent_at timestamptz,
  email_unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint masterdeck_demo_leads_user_source_key unique (user_id, source)
);

create index if not exists masterdeck_demo_leads_email_idx
  on public.masterdeck_demo_leads(email);

alter table public.masterdeck_demo_leads enable row level security;
revoke all on public.masterdeck_demo_leads from anon, authenticated;
grant all on public.masterdeck_demo_leads to service_role;

comment on table public.masterdeck_demo_leads is 'Server-only demo funnel records. The email is sourced from auth.users after the visitor signs in; marketing messages require explicit opt-in.';
