create extension if not exists "pgcrypto";

create type pipeline_stage as enum (
  'novo_lead',
  'contato_feito',
  'visita_diagnostico_agendado',
  'proposta_enviada',
  'fechado_ganho',
  'fechado_perdido'
);

create type avcb_status as enum (
  'em_dia',
  'a_vencer',
  'vencido',
  'nao_informado'
);

-- team_members: maps auth.users -> app-level profile, single shared team for v1.
create table public.team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  place_id text unique,
  maps_url text not null unique,
  name text not null,
  category text,
  rating numeric(2,1),
  review_count integer,
  phone_raw text,
  phone_e164 text,
  address text,
  lat double precision,
  lng double precision,
  photo_url text,
  last_review_snippet text,
  pipeline_stage pipeline_stage not null default 'novo_lead',
  avcb_status avcb_status not null default 'nao_informado',
  avcb_validade date,
  assigned_user_id uuid references public.team_members(id),
  source text not null default 'google_maps_scraper',
  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_pipeline_stage_idx on public.leads (pipeline_stage);
create index leads_avcb_status_idx on public.leads (avcb_status);
create index leads_category_idx on public.leads (category);
create index leads_assigned_user_idx on public.leads (assigned_user_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.team_members(id),
  activity_type text not null default 'note',
  body text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index activities_lead_id_idx on public.activities (lead_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();
