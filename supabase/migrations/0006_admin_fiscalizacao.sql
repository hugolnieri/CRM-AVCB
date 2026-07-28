-- Fiscalizacao da equipe: jornada diaria, relatorio por colaborador e
-- notificacoes configuraveis.
--
-- Nao ha gancho de "usuario comecou a trabalhar" no Supabase Auth utilizavel
-- aqui: o evento SIGNED_IN do client dispara a cada refresh de pagina em que a
-- sessao e reestabelecida, entao usa-lo como inicio de jornada geraria varios
-- registros falsos por dia. Por isso a jornada e marcada por acao explicita
-- (botao "Iniciar dia" / "Finalizar o dia"), que tambem e o que o usuario pediu
-- para o fechamento.

-- ---------------------------------------------------------------------------
-- configuracoes: linha unica
-- ---------------------------------------------------------------------------

-- Singleton forcado pelo tipo: `id boolean primary key check (id)` so admite o
-- valor true, entao existe no maximo uma linha. Mais simples que uma tabela
-- key/value e mantem cada configuracao com seu proprio tipo.
create table public.configuracoes (
  id                    boolean primary key default true check (id),
  -- Para onde vao os avisos. NULL = ninguem configurou ainda; nada e enviado.
  email_notificacoes    text,
  notificar_inicio_dia  boolean not null default true,
  notificar_fim_dia     boolean not null default true,
  notificar_fechamento  boolean not null default true,
  updated_at            timestamptz not null default now(),
  updated_by            uuid references public.team_members(id) on delete set null
);

insert into public.configuracoes (id) values (true) on conflict (id) do nothing;

create trigger configuracoes_set_updated_at before update on public.configuracoes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- registros_diarios: um por colaborador por dia
-- ---------------------------------------------------------------------------

create table public.registros_diarios (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.team_members(id) on delete cascade,
  -- `date` puro: a jornada pertence a um dia civil, nao a um instante.
  data        date not null default current_date,
  inicio_at   timestamptz,
  fim_at      timestamptz,
  -- Preenchida no fechamento do dia; e o texto que aparece no relatorio.
  observacoes text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint registros_diarios_um_por_dia unique (member_id, data),
  constraint registros_diarios_fim_apos_inicio check (
    fim_at is null or inicio_at is null or fim_at >= inicio_at
  )
);

create index registros_diarios_data_idx   on public.registros_diarios (data desc);
create index registros_diarios_member_idx on public.registros_diarios (member_id);

create trigger registros_diarios_set_updated_at before update on public.registros_diarios
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notificacoes: log do que foi (ou seria) avisado
-- ---------------------------------------------------------------------------

-- Registrar em tabela, e nao so disparar e-mail, tem duas razoes: o admin
-- consegue ver o historico dentro do sistema mesmo sem e-mail configurado, e o
-- envio pode falhar sem que o evento se perca.
create table public.notificacoes (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null,   -- 'inicio_dia' | 'fim_dia' | 'fechamento'
  titulo        text not null,
  corpo         text,
  member_id     uuid references public.team_members(id) on delete set null,
  email_destino text,
  -- NULL = registrada mas nao enviada (sem e-mail configurado ou envio falhou).
  enviada_em    timestamptz,
  created_at    timestamptz not null default now()
);

create index notificacoes_created_idx on public.notificacoes (created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.configuracoes     enable row level security;
alter table public.registros_diarios enable row level security;
alter table public.notificacoes      enable row level security;

-- Todos leem (o app precisa saber se deve notificar); so admin escreve.
create policy configuracoes_select on public.configuracoes
  for select to authenticated using (true);
create policy configuracoes_update_admin on public.configuracoes
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Jornada e visivel para a equipe inteira (e uma ferramenta de acompanhamento,
-- nao um diario privado), mas cada um so bate o proprio ponto -- mesmo padrao de
-- activities_insert, que exige author_id = auth.uid().
create policy registros_diarios_select on public.registros_diarios
  for select to authenticated using (true);
create policy registros_diarios_insert_self on public.registros_diarios
  for insert to authenticated with check (member_id = (select auth.uid()));
create policy registros_diarios_update_self on public.registros_diarios
  for update to authenticated
  using (member_id = (select auth.uid()))
  with check (member_id = (select auth.uid()));
create policy registros_diarios_delete_admin on public.registros_diarios
  for delete to authenticated using ((select public.is_admin()));

create policy notificacoes_select on public.notificacoes
  for select to authenticated using (true);
create policy notificacoes_insert on public.notificacoes
  for insert to authenticated with check (true);
