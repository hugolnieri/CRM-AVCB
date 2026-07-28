-- Baseline do CRM de Treinamentos e Serviços.
--
-- Este arquivo substitui as migrations 0001-0009 do CRM de AVCB (prospecção via
-- CSV do Google Maps + consulta ao Corpo de Bombeiros). Aquele banco não existe
-- mais e não havia dados a preservar, então o histórico foi consolidado: replayar
-- 9 migrations que criam e depois destroem place_id/maps_url/avcb_status/
-- bombeiros_consulta não ajudaria ninguém a entender um schema de 7 tabelas.
--
-- Espera um projeto vazio. Se rodar duas vezes, falha em "type already exists" —
-- e é para falhar mesmo, alto e claro, em vez de dropar dados por engano.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- Estágios genéricos de prospecção. Servem tanto para AVCB quanto para
-- treinamentos: o rótulo exibido vem de lib/pipeline/stages.ts, nada além disso
-- lê os valores crus para apresentação.
create type pipeline_stage as enum (
  'novo_lead',
  'contato_feito',
  'visita_diagnostico_agendado',
  'proposta_enviada',
  'fechado_ganho',
  'fechado_perdido'
);

create type user_role as enum ('admin', 'colaborador');

create type cliente_status as enum ('ativo', 'inativo');

-- ---------------------------------------------------------------------------
-- team_members: perfil de app espelhando auth.users
-- ---------------------------------------------------------------------------

create table public.team_members (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  email      text not null,
  role       user_role not null default 'colaborador',
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads: funil comercial (declarado antes de clientes por causa do FK)
-- ---------------------------------------------------------------------------

create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  cnpj             text,
  contato_nome     text,
  phone_raw        text,
  phone_e164       text,
  email            text,
  address          text,
  cidade           text,
  uf               text,
  -- Como o lead chegou: 'indicacao', 'site', 'telefone', 'evento'...
  origem           text,
  -- Que treinamento/serviço a empresa procura, em texto livre.
  interesse        text,
  valor_estimado   numeric(12,2),
  pipeline_stage   pipeline_stage not null default 'novo_lead',
  -- Próximo retorno agendado. timestamptz (tem hora), diferente das datas de
  -- vencimento que são date puro — ver o comentário em treinamentos.
  follow_up_at     timestamptz,
  follow_up_note   text,
  -- Ordenação dentro da coluna do kanban. Usa Date.now() ao mover, para que um
  -- card arrastado vá para o topo escrevendo uma linha só, sem reindexar a coluna.
  position         double precision not null default 0,
  assigned_user_id uuid references public.team_members(id) on delete set null,
  -- default auth.uid(): a camada de queries nunca precisa mandar esta coluna.
  -- É informativo (quem cadastrou), não fronteira de acesso.
  created_by       uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index leads_pipeline_stage_idx on public.leads (pipeline_stage);
create index leads_assigned_user_idx  on public.leads (assigned_user_id);
create index leads_follow_up_idx      on public.leads (follow_up_at)
  where follow_up_at is not null;

-- ---------------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------------

create table public.clientes (
  id             uuid primary key default gen_random_uuid(),
  razao_social   text not null,
  nome_fantasia  text,
  -- Anulável: Postgres trata NULLs como distintos, então vários clientes podem
  -- ficar sem CNPJ sem colidir no unique.
  cnpj           text unique,
  telefone       text,
  telefone_e164  text,
  email          text,
  contato_nome   text,
  contato_cargo  text,
  endereco       text,
  cidade         text,
  uf             text,
  cep            text,
  status         cliente_status not null default 'ativo',
  observacoes    text,
  -- Lead de origem, quando o cliente veio de uma conversão. O vínculo mora só
  -- aqui (e não em leads.cliente_id) para não haver dois lados a sincronizar:
  -- o cliente é o registro durável, o lead é o artefato histórico.
  lead_id        uuid unique references public.leads(id) on delete set null,
  responsavel_id uuid references public.team_members(id) on delete set null,
  created_by     uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index clientes_status_idx       on public.clientes (status);
create index clientes_razao_social_idx on public.clientes (lower(razao_social));

-- ---------------------------------------------------------------------------
-- tipos_treinamento: catálogo base (NRs)
-- ---------------------------------------------------------------------------

create table public.tipos_treinamento (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null unique,
  sigla          text,
  -- Meses de validade a partir da realização. NULL = não vence. É esta coluna
  -- que faz a tela de vencimentos existir: escolher "NR-35" já sugere
  -- data_vencimento = data_realizacao + 24 meses, em vez de depender de alguém
  -- digitar a data certa em todo registro.
  validade_meses integer check (validade_meses is null or validade_meses > 0),
  carga_horaria  integer,
  ativo          boolean not null default true,
  ordem          integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- treinamentos
-- ---------------------------------------------------------------------------

create table public.treinamentos (
  id                  uuid primary key default gen_random_uuid(),
  cliente_id          uuid not null references public.clientes(id) on delete cascade,
  -- restrict: um tipo já usado em treinamentos não pode ser apagado; desative-o
  -- com ativo = false.
  tipo_treinamento_id uuid references public.tipos_treinamento(id) on delete restrict,
  -- Snapshot do nome do tipo no momento do registro, de propósito. Treinamentos
  -- lastreiam certificados emitidos: renomear "NR-35" no catálogo NÃO pode
  -- reescrever o histórico. Também permite listar tudo com um select plano, sem
  -- embed do PostgREST.
  tipo_nome           text not null,
  data_realizacao     date not null,
  -- NULL = não vence (tipo sem validade_meses, ou vencimento ainda desconhecido).
  data_vencimento     date,
  participantes       integer check (participantes is null or participantes >= 0),
  instrutor           text,
  observacoes         text,
  created_by          uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint treinamentos_vencimento_apos_realizacao
    check (data_vencimento is null or data_vencimento >= data_realizacao)
);

create index treinamentos_cliente_idx    on public.treinamentos (cliente_id);
create index treinamentos_vencimento_idx on public.treinamentos (data_vencimento)
  where data_vencimento is not null;

-- ---------------------------------------------------------------------------
-- servicos
-- ---------------------------------------------------------------------------

create table public.servicos (
  id             uuid primary key default gen_random_uuid(),
  cliente_id     uuid not null references public.clientes(id) on delete cascade,
  -- Texto livre, como pedido nos requisitos ("inicialmente o tipo do serviço
  -- será digitado manualmente"). A UI alimenta um Autocomplete com os valores
  -- distintos já cadastrados, então o vocabulário converge sozinho. Se um dia
  -- precisar travar, cria-se tipos_servico + FK sem quebrar nada disto.
  tipo           text not null,
  data           date not null,
  -- Próxima manutenção/reavaliação. Manutenções recorrem, e é isto que coloca
  -- serviços na tela de vencimentos junto com treinamentos.
  data_proxima   date,
  responsavel_id uuid references public.team_members(id) on delete set null,
  observacoes    text,
  created_by     uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint servicos_proxima_apos_data
    check (data_proxima is null or data_proxima >= data)
);

create index servicos_cliente_idx on public.servicos (cliente_id);
create index servicos_data_idx    on public.servicos (data desc);
create index servicos_proxima_idx on public.servicos (data_proxima)
  where data_proxima is not null;

-- ---------------------------------------------------------------------------
-- activities: notas e histórico, de lead OU de cliente
-- ---------------------------------------------------------------------------

-- Dois FKs anuláveis com check de "exatamente um", em vez de entity_type/entity_id
-- polimórfico (que perderia integridade referencial e cascade) ou de duas tabelas
-- separadas (que duplicaria RLS, mapper, hook e o componente de timeline).
--
-- Treinamentos e serviços deliberadamente não têm activities: cada um é um evento
-- único e já tem observacoes.
create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references public.leads(id)    on delete cascade,
  cliente_id    uuid references public.clientes(id) on delete cascade,
  author_id     uuid references public.team_members(id) on delete set null,
  -- text e não enum: adicionar um tipo novo deve ser de graça. A segurança vem
  -- do union em types/activity.ts + os Records exaustivos em ActivityTimeline.
  activity_type text not null default 'note',
  body          text,
  metadata      jsonb,
  created_at    timestamptz not null default now(),
  constraint activities_one_owner check (
    (lead_id is not null)::int + (cliente_id is not null)::int = 1
  )
);

create index activities_lead_idx    on public.activities (lead_id)    where lead_id    is not null;
create index activities_cliente_idx on public.activities (cliente_id) where cliente_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

-- `set search_path` em toda funcao, inclusive de trigger: sem ele o linter do
-- Supabase acusa "Function Search Path Mutable", e um schema hostil no
-- search_path do chamador poderia sequestrar o que a funcao resolve.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at        before update on public.leads
  for each row execute function public.set_updated_at();
create trigger clientes_set_updated_at     before update on public.clientes
  for each row execute function public.set_updated_at();
create trigger treinamentos_set_updated_at before update on public.treinamentos
  for each row execute function public.set_updated_at();
create trigger servicos_set_updated_at     before update on public.servicos
  for each row execute function public.set_updated_at();
