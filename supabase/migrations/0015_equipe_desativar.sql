-- Desativar o acesso de alguem e corrigir o nome de outra pessoa.
--
-- Sao duas mudancas pequenas, com razoes diferentes.
--
-- 1. Nome. Ate aqui a unica policy de UPDATE era "a propria linha", entao um
--    admin nao conseguia corrigir o nome de ninguem — e nome errado no cadastro
--    reaparece no relatorio diario, na agenda e no log de auditoria, que so
--    guardam o id. A policy nova libera a LINHA para o admin; o GRANT por
--    coluna da 0002 continua liberando so `full_name`, entao o admin ganha o
--    nome e nada alem dele. Mesma divisao de sempre: RLS decide linhas, GRANT
--    decide colunas.
--
-- 2. Situacao. `ativo` NAO ganha grant nenhum, nem para admin: ela muda so pela
--    RPC abaixo, exatamente como `role` muda so por `set_member_role`. O que
--    barra a pessoa de verdade e o ban no Auth (service role, feito na rota
--    app/api/equipe/route.ts) — uma coluna que ninguem aplica nao desativa nada:
--    sem o ban a pessoa continuaria entrando, e a RLS continuaria deixando ela
--    trabalhar, com a tela do admin dizendo "Inativo". A coluna e o espelho
--    legivel do ban.
--
--    A rota poderia escrever a coluna com a propria service role e economizar
--    esta funcao, mas o gatilho `registrar_audit` grava `auth.uid()`: escrito
--    pela service role, o log diria que ninguem desativou ninguem. Chamada com o
--    token de quem clicou, a RPC deixa a auditoria com dono.

create policy team_members_update_admin on public.team_members
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.set_member_ativo(target uuid, novo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem ativar ou desativar acessos.';
  end if;

  -- Mesma trava de set_member_role, pelo mesmo motivo: sem ela o unico
  -- administrador se desativa e tranca a equipe inteira do lado de fora.
  if target = auth.uid() and not novo then
    raise exception 'Voce nao pode desativar o proprio acesso.';
  end if;

  update public.team_members set ativo = novo where id = target;
end;
$$;

revoke execute on function public.set_member_ativo(uuid, boolean) from public, anon;
grant execute on function public.set_member_ativo(uuid, boolean) to authenticated;

comment on column public.team_members.ativo is
  'Espelho legivel do ban no Auth (app/api/equipe/route.ts). Escrita apenas pela RPC set_member_ativo; nao ha grant de UPDATE desta coluna para authenticated.';
