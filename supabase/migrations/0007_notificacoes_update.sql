-- Permite marcar uma notificacao como enviada.
--
-- Quem faz isso e a rota app/api/notificar/route.ts, depois que o provedor de
-- e-mail aceita a mensagem. Ela roda com a sessao do usuario (RLS normal), nao
-- com service role -- o projeto nao tem service role key, e nao precisa ter so
-- para carimbar uma coluna.
--
-- O UPDATE e restrito a coluna enviada_em pelo GRANT: mesmo autenticado,
-- ninguem reescreve titulo, corpo ou destino de uma notificacao ja registrada.
-- Mesma logica do grant por coluna em team_members (0002_auth_rls.sql).

create policy notificacoes_update on public.notificacoes
  for update to authenticated using (true) with check (true);

revoke update on public.notificacoes from authenticated;
grant update (enviada_em) on public.notificacoes to authenticated;
