-- Autenticação, perfis de acesso e RLS.
--
-- Modelo: equipe única compartilhada. Todo mundo autenticado lê e escreve o
-- operacional (leads, clientes, treinamentos, serviços, notas). O que separa
-- admin de colaborador é: excluir registros, manter o catálogo de tipos de
-- treinamento e alterar o perfil dos outros.

-- ---------------------------------------------------------------------------
-- Provisionamento do perfil no cadastro
-- ---------------------------------------------------------------------------

-- Inserir o perfil pelo cliente logo após signUp não funciona quando a
-- confirmação de e-mail está ligada: naquele momento não há sessão, auth.uid()
-- é null e a policy bloqueia. O usuário ficava autenticado e sem perfil,
-- causando violação de FK em toda nota. Um trigger SECURITY DEFINER roda com os
-- privilégios do dono da função e ignora RLS, então o perfil sempre existe.
--
-- O primeiro usuário a se cadastrar vira admin. Sem isso ninguém nunca
-- alcançaria a área administrativa: todos nasceriam colaboradores e só um admin
-- pode promover alguém.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_members (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.email),
    new.email,
    case
      when (select count(*) from public.team_members) = 0 then 'admin'::public.user_role
      else 'colaborador'::public.user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Funcao de trigger nao deve ser chamavel via /rest/v1/rpc/handle_new_user.
-- O trigger continua funcionando: ele roda como dono de auth.users, nao pelo
-- papel de quem fez a requisicao.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leitura do perfil dentro das policies
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER é o que evita a recursão clássica: sem ele, uma policy sobre
-- team_members que consulta team_members se chama para sempre. Rodando como dona
-- da função, a consulta interna ignora RLS e não recursa.
--
-- Preferida a uma claim customizada no JWT porque rebaixar alguém precisa valer
-- na hora — uma claim só mudaria no próximo refresh do token (até ~1h) — e
-- porque o hook de claim se configura no painel, fora das migrations, e sumiria
-- na próxima vez que o projeto fosse recriado.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.team_members where id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Alteração de perfil: só por RPC, nunca por UPDATE direto
-- ---------------------------------------------------------------------------

-- RLS decide LINHAS; GRANT decide COLUNAS. Sem o grant por coluna abaixo, a
-- policy "posso editar minha própria linha" deixaria qualquer colaborador rodar
--   supabase.from('team_members').update({ role: 'admin' }).eq('id', meuId)
-- no console do navegador e se promover. Por isso: só full_name é atualizável
-- direto, e role só passa por esta função.
create or replace function public.set_member_role(target uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem alterar perfis de acesso.';
  end if;

  -- Sem esta trava o único admin pode se rebaixar e trancar todo mundo do lado
  -- de fora da área administrativa, sem caminho de volta pela aplicação.
  if target = auth.uid() and new_role <> 'admin' then
    raise exception 'Você não pode remover seu próprio acesso de administrador.';
  end if;

  update public.team_members set role = new_role where id = target;
end;
$$;

revoke execute on function public.set_member_role(uuid, public.user_role) from public, anon;
grant execute on function public.set_member_role(uuid, public.user_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on public.team_members from anon, authenticated;
grant select on public.team_members to authenticated;
grant update (full_name) on public.team_members to authenticated;
-- INSERT nunca é concedido: quem cria perfil é o trigger handle_new_user().
-- DELETE nunca é concedido: apagar o auth.user já cascateia para cá.

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.team_members      enable row level security;
alter table public.leads             enable row level security;
alter table public.clientes          enable row level security;
alter table public.tipos_treinamento enable row level security;
alter table public.treinamentos      enable row level security;
alter table public.servicos          enable row level security;
alter table public.activities        enable row level security;

-- Todas as policies são "to authenticated". Isso é o que torna "using (true)"
-- seguro: uma requisição sem sessão chega como anon e não casa com policy
-- nenhuma. Também é mais rápido que "auth.uid() is not null", que o Postgres
-- reavalia linha a linha.
--
-- is_admin() é sempre chamada como (select public.is_admin()) para o Postgres
-- promovê-la a InitPlan e avaliar uma vez por statement em vez de por linha —
-- diferença que pesa em activities.

-- team_members ---------------------------------------------------------------
create policy team_members_select on public.team_members
  for select to authenticated using (true);

-- Sem "with check", um UPDATE poderia mudar a linha para id de outra pessoa.
create policy team_members_update_self on public.team_members
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- leads ----------------------------------------------------------------------
create policy leads_select on public.leads for select to authenticated using (true);
create policy leads_insert on public.leads for insert to authenticated with check (true);
create policy leads_update on public.leads for update to authenticated using (true) with check (true);
create policy leads_delete_admin on public.leads for delete to authenticated
  using ((select public.is_admin()));

-- clientes -------------------------------------------------------------------
create policy clientes_select on public.clientes for select to authenticated using (true);
create policy clientes_insert on public.clientes for insert to authenticated with check (true);
create policy clientes_update on public.clientes for update to authenticated using (true) with check (true);
-- Sem policy de DELETE, de propósito: treinamentos, serviços e activities
-- cascateiam a partir de clientes, então um clique errado apagaria o histórico
-- de conformidade inteiro da empresa. Cliente que saiu vira status = 'inativo'.

-- tipos_treinamento ----------------------------------------------------------
create policy tipos_treinamento_select on public.tipos_treinamento
  for select to authenticated using (true);
create policy tipos_treinamento_insert_admin on public.tipos_treinamento
  for insert to authenticated with check ((select public.is_admin()));
create policy tipos_treinamento_update_admin on public.tipos_treinamento
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tipos_treinamento_delete_admin on public.tipos_treinamento
  for delete to authenticated using ((select public.is_admin()));

-- treinamentos ---------------------------------------------------------------
create policy treinamentos_select on public.treinamentos for select to authenticated using (true);
create policy treinamentos_insert on public.treinamentos for insert to authenticated with check (true);
create policy treinamentos_update on public.treinamentos for update to authenticated using (true) with check (true);
create policy treinamentos_delete_admin on public.treinamentos for delete to authenticated
  using ((select public.is_admin()));

-- servicos -------------------------------------------------------------------
create policy servicos_select on public.servicos for select to authenticated using (true);
create policy servicos_insert on public.servicos for insert to authenticated with check (true);
create policy servicos_update on public.servicos for update to authenticated using (true) with check (true);
create policy servicos_delete_admin on public.servicos for delete to authenticated
  using ((select public.is_admin()));

-- activities -----------------------------------------------------------------
create policy activities_select on public.activities for select to authenticated using (true);
-- Assinar nota em nome de outra pessoa é proibido no banco, não só na UI.
create policy activities_insert on public.activities for insert to authenticated
  with check (author_id = (select auth.uid()));
-- Sem policy de UPDATE: nota registrada é imutável, é histórico.
create policy activities_delete_admin on public.activities for delete to authenticated
  using ((select public.is_admin()));
