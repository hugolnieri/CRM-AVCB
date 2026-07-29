-- Tarefas: o que alguem precisa fazer, com dono e prazo.
--
-- Complementa as pendencias calculadas em lib/painel.ts, nao as substitui. A
-- diferenca e conceitual: pendencia e um estado do dado ("este treinamento esta
-- sem instrutor") e some sozinha quando o dado e corrigido; tarefa e um
-- compromisso de alguem ("achar um instrutor ate sexta") e so some quando
-- alguem a conclui.
--
-- Materializar as pendencias como tarefas produziria linha fantasma: tarefa
-- dizendo "achar instrutor" para um servico que ja tem instrutor. Por isso as
-- automaticas seguem calculadas, e `origem_pendencia` existe so para o caminho
-- inverso -- o admin clica "Delegar" numa pendencia e ela vira tarefa de
-- verdade, com dono.

create type tarefa_prioridade as enum ('baixa', 'normal', 'alta');

create table public.tarefas (
  id             uuid primary key default gen_random_uuid(),
  titulo         text not null check (length(btrim(titulo)) >= 3),
  descricao      text,
  prioridade     tarefa_prioridade not null default 'normal',
  prazo          date,
  -- NULL = tarefa da administracao: sem dono, aparece para todo admin. E o caso
  -- do pedido "registrar pendencias para o administrador fazer".
  responsavel_id uuid references public.team_members(id) on delete set null,

  -- Nao ha enum de status: `concluida_em is null` E o status, e os mesmos dois
  -- campos ja respondem "quem concluiu e quando".
  concluida_em   timestamptz,
  concluida_por  uuid references public.team_members(id) on delete set null,

  -- Vinculo opcional com o registro que originou a tarefa. Cascata porque
  -- tarefa orfa de um cliente apagado nao tem o que fazer.
  cliente_id     uuid references public.clientes(id) on delete cascade,
  lead_id        uuid references public.leads(id)    on delete cascade,
  servico_id     uuid references public.servicos(id) on delete cascade,

  -- Pendencia.id de lib/painel.ts, quando a tarefa nasceu de "Delegar".
  origem_pendencia text,

  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint tarefas_concluida_coerente check (
    (concluida_em is null) = (concluida_por is null)
  )
);

-- Uma tarefa aberta por pendencia. Sem isto, clicar "Delegar" duas vezes cria
-- duas tarefas para o mesmo problema -- e a pendencia calculada some da lista
-- justamente por casar com esta coluna.
create unique index tarefas_origem_aberta_idx on public.tarefas (origem_pendencia)
  where origem_pendencia is not null and concluida_em is null;

create index tarefas_abertas_idx     on public.tarefas (prazo) where concluida_em is null;
create index tarefas_responsavel_idx on public.tarefas (responsavel_id) where concluida_em is null;

create trigger tarefas_set_updated_at before update on public.tarefas
  for each row execute function public.set_updated_at();

alter table public.tarefas enable row level security;

-- A lista e da equipe: todo mundo ve, e qualquer um pode levantar uma tarefa
-- para o administrador -- que e metade do que foi pedido.
create policy tarefas_select on public.tarefas
  for select to authenticated using (true);
create policy tarefas_insert on public.tarefas
  for insert to authenticated with check (true);

-- Admin edita qualquer uma; o responsavel edita e conclui a dele. O `with
-- check` avalia a LINHA NOVA, entao um colaborador nao consegue repassar a
-- tarefa para outra pessoa: a linha resultante deixaria de ser dele e a
-- verificacao falha.
create policy tarefas_update on public.tarefas
  for update to authenticated
  using ((select public.is_admin()) or responsavel_id = (select auth.uid()))
  with check ((select public.is_admin()) or responsavel_id = (select auth.uid()));

create policy tarefas_delete_admin on public.tarefas
  for delete to authenticated using ((select public.is_admin()));

-- Tarefa entra no log de auditoria como todo o resto.
create trigger tarefas_audit after insert or update or delete on public.tarefas
  for each row execute function public.registrar_audit();
