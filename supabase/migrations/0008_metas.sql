-- Metas atribuiveis a colaboradores.
--
-- Modelada como METRICA x PERIODO x ALVO x PESSOA em vez de uma tabela por tipo
-- de meta. "Contatar 40 leads por dia" e so uma linha
-- (contatos_lead, diaria, 40, fulano) -- e "fechar 5 clientes no mes" ou "20 mil
-- em propostas na semana" saem da mesma estrutura, sem migration nova.
--
-- O PROGRESSO NAO E ARMAZENADO. E derivado de activities/leads/servicos em
-- lib/metas.ts, pela mesma razao de situacaoCliente: uma coluna de progresso
-- ficaria errada no instante em que alguem registrasse um contato, e exigiria
-- recalculo em todo lugar que escreve.

create type meta_metrica as enum (
  'contatos_lead',        -- leads DISTINTOS contatados (nao numero de atividades)
  'atividades',           -- total de atividades registradas
  'fechamentos',          -- leads convertidos em cliente
  'leads_novos',          -- leads cadastrados
  'servicos_realizados',  -- servicos concluidos
  'valor_fechado'         -- soma de valor_estimado dos leads ganhos
);

create type meta_periodo as enum ('diaria', 'semanal', 'mensal');

create table public.metas (
  id           uuid primary key default gen_random_uuid(),
  -- NULL = meta da equipe inteira: vale para todo colaborador, e cada um ve o
  -- proprio progresso. Evita ter que duplicar a mesma meta por pessoa.
  member_id    uuid references public.team_members(id) on delete cascade,
  nome         text not null,
  metrica      meta_metrica not null,
  periodo      meta_periodo not null default 'diaria',
  alvo         numeric(12,2) not null check (alvo > 0),
  ativa        boolean not null default true,
  -- Vigencia opcional: permite meta de campanha ("dobrar contatos em marco")
  -- sem precisar lembrar de desativar depois.
  inicio_em    date,
  fim_em       date,
  created_by   uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint metas_vigencia_coerente check (
    inicio_em is null or fim_em is null or fim_em >= inicio_em
  )
);

create index metas_member_idx on public.metas (member_id);
create index metas_ativa_idx  on public.metas (ativa) where ativa;

create trigger metas_set_updated_at before update on public.metas
  for each row execute function public.set_updated_at();

alter table public.metas enable row level security;

-- Todos veem todas as metas (a da equipe precisa ser visivel, e transparencia
-- entre colegas e desejada aqui). Só admin cria, edita e apaga -- meta que o
-- proprio avaliado pode baixar nao e meta.
create policy metas_select on public.metas
  for select to authenticated using (true);
create policy metas_insert_admin on public.metas
  for insert to authenticated with check ((select public.is_admin()));
create policy metas_update_admin on public.metas
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy metas_delete_admin on public.metas
  for delete to authenticated using ((select public.is_admin()));
