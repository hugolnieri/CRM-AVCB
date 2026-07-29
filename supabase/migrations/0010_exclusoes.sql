-- Exclusao de lead e cliente com aprovacao do administrador.
--
-- Muda uma regra que a 0002 tomou de proposito: cliente nao tinha policy de
-- DELETE nenhuma, porque servicos e notas cascateiam a partir dele e apagar um
-- cliente destroi o historico de conformidade da empresa inteira.
--
-- A regra nova preserva a intencao sem recusar a operacao: qualquer colaborador
-- pode PEDIR a exclusao, e so admin executa. A barreira continua sendo a RLS --
-- um colaborador nao apaga cliente nem pelo console do navegador, so registra
-- uma solicitacao. "Inativar" segue como o caminho normal.

create table public.solicitacoes_exclusao (
  id             uuid primary key default gen_random_uuid(),
  entidade       text not null check (entidade in ('lead','cliente')),
  -- Sem FK: aponta para duas tabelas diferentes conforme `entidade`. E sem FK
  -- tambem porque a linha alvo deixa de existir quando o pedido e aprovado, e o
  -- historico da solicitacao precisa sobreviver a isso.
  registro_id    uuid not null,
  -- Nome capturado no momento do pedido, pela mesma razao do `rotulo` do
  -- audit_log: depois da aprovacao nao ha mais de onde ler.
  rotulo         text not null,
  motivo         text,
  status         text not null default 'pendente'
                 check (status in ('pendente','aprovada','recusada')),
  solicitado_por uuid default auth.uid(),
  decidido_por   uuid,
  decidido_em    timestamptz,
  observacao     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Um pedido pendente por registro. Sem isto, clicar duas vezes em "Solicitar
-- exclusao" gera duas tarefas para o admin decidir sobre a mesma coisa.
create unique index solicitacoes_uma_pendente_idx
  on public.solicitacoes_exclusao (registro_id) where status = 'pendente';

create index solicitacoes_status_idx on public.solicitacoes_exclusao (status, created_at desc);

create trigger solicitacoes_set_updated_at before update on public.solicitacoes_exclusao
  for each row execute function public.set_updated_at();

alter table public.solicitacoes_exclusao enable row level security;

-- Transparente para a equipe: quem pediu ve o proprio pedido andar.
create policy solicitacoes_select on public.solicitacoes_exclusao
  for select to authenticated using (true);
-- Assinar pedido em nome de outro e proibido no banco, nao so na interface --
-- mesmo padrao de activities_insert.
create policy solicitacoes_insert on public.solicitacoes_exclusao
  for insert to authenticated with check (solicitado_por = (select auth.uid()));
-- A decisao e do admin, e so dele.
create policy solicitacoes_update_admin on public.solicitacoes_exclusao
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy solicitacoes_delete_admin on public.solicitacoes_exclusao
  for delete to authenticated using ((select public.is_admin()));

-- A policy que faltava. `leads_delete_admin` ja existia desde a 0002 (e estava
-- sem uso na interface); esta e a irma dela para clientes.
create policy clientes_delete_admin on public.clientes
  for delete to authenticated using ((select public.is_admin()));
