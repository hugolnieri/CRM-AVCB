-- Log de tudo que os usuarios fazem, para o administrador fiscalizar.
--
-- Por que trigger no banco e nao uma chamada no app: todas as paginas falam
-- PostgREST direto do navegador, entao qualquer `registrarLog()` client-side e
-- opcional na pratica -- basta abrir o console para escrever sem deixar rastro,
-- e esquecer de chama-lo numa mutacao nova falha em silencio. O trigger pega
-- tudo que comita, venha de onde vier, e monta o diff sozinho.
--
-- `activities` e `notificacoes` ficam de fora: ja sao log, e duplicariam cada
-- nota e cada aviso. `audit_log` fica de fora de si mesma, por razoes obvias.

create table public.audit_log (
  -- bigint identity e nao uuid: e log, so cresce, e a ordem de insercao ja e a
  -- ordem cronologica.
  id          bigint generated always as identity primary key,
  tabela      text not null,
  registro_id uuid,
  acao        text not null check (acao in ('insert','update','delete')),
  -- Sem FK para team_members de proposito: um log que pode falhar por
  -- integridade referencial derrubaria a acao do usuario junto. O nome sai da
  -- lista de membros na hora de exibir.
  member_id   uuid,
  -- Nome do registro capturado no momento do evento. Depois de um delete a
  -- linha nao existe mais, mas o log precisa continuar dizendo de quem era.
  rotulo      text,
  -- insert/delete: a linha inteira. update: so {campo: {de, para}}.
  dados       jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx  on public.audit_log (created_at desc);
create index audit_log_member_idx   on public.audit_log (member_id, created_at desc);
create index audit_log_registro_idx on public.audit_log (tabela, registro_id);

-- ---------------------------------------------------------------------------
-- Gatilho
-- ---------------------------------------------------------------------------

create or replace function public.registrar_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linha  jsonb;
  v_dados  jsonb;
  v_id     uuid;
begin
  -- coalesce(new, old) nao funciona com record em plpgsql; precisa ser por ramo.
  v_linha := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_op = 'UPDATE' then
    -- So o que mudou de fato. `updated_at` sai porque muda em todo update, e
    -- `position` porque o kanban a reescreve a cada arrastar -- reordenar um
    -- card dentro da mesma coluna nao e evento que alguem precise fiscalizar.
    select jsonb_object_agg(n.key, jsonb_build_object('de', o.value, 'para', n.value))
      into v_dados
      from jsonb_each(to_jsonb(new)) n
      join jsonb_each(to_jsonb(old)) o on o.key = n.key
     where n.value is distinct from o.value
       and n.key not in ('updated_at', 'created_at', 'position');

    -- Nada relevante mudou: nao polui o log.
    if v_dados is null then
      return new;
    end if;
  else
    v_dados := v_linha;
  end if;

  v_id := (v_linha->>'id')::uuid;

  insert into public.audit_log (tabela, registro_id, acao, member_id, rotulo, dados)
  values (
    tg_table_name,
    v_id,
    lower(tg_op),
    auth.uid(),
    coalesce(
      v_linha->>'name',           -- leads
      v_linha->>'nome_fantasia',  -- clientes
      v_linha->>'razao_social',
      v_linha->>'nome',           -- tipos_servico, metas
      v_linha->>'tipo_nome',      -- servicos
      v_linha->>'full_name',      -- team_members
      v_linha->>'titulo'          -- tarefas
    ),
    v_dados
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- A funcao so e chamada pelo gatilho; ninguem precisa dela como RPC.
revoke execute on function public.registrar_audit() from public, anon, authenticated;

-- AFTER: so registra o que comitou. Se o statement falhar depois, a transacao
-- leva o log junto, que e o correto.
create trigger leads_audit              after insert or update or delete on public.leads              for each row execute function public.registrar_audit();
create trigger clientes_audit           after insert or update or delete on public.clientes           for each row execute function public.registrar_audit();
create trigger servicos_audit           after insert or update or delete on public.servicos           for each row execute function public.registrar_audit();
create trigger tipos_servico_audit      after insert or update or delete on public.tipos_servico      for each row execute function public.registrar_audit();
create trigger metas_audit              after insert or update or delete on public.metas              for each row execute function public.registrar_audit();
create trigger team_members_audit       after insert or update or delete on public.team_members       for each row execute function public.registrar_audit();
create trigger registros_diarios_audit  after insert or update or delete on public.registros_diarios  for each row execute function public.registrar_audit();

-- configuracoes tem `id boolean`, entao o cast de v_id para uuid falharia.
-- Nao ha gatilho nela; a mudanca de destinatario de e-mail e visivel na propria
-- aba de Notificacoes.

-- ---------------------------------------------------------------------------
-- RLS: leitura de admin, e escrita de ninguem
-- ---------------------------------------------------------------------------

alter table public.audit_log enable row level security;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create policy audit_log_select_admin on public.audit_log
  for select to authenticated using ((select public.is_admin()));

-- Sem policy de insert/update/delete, e sem GRANT: so o gatilho SECURITY
-- DEFINER escreve aqui. Nem o admin edita o proprio log pelo console -- que e o
-- que separa um registro de auditoria de um bloco de notas.
