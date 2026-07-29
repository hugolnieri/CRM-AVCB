# Migrations

Ordem numérica, aplicadas de uma vez só num projeto novo. Não há tipos gerados:
depois de aplicar, atualizar à mão o `XRow` correspondente em
`lib/supabase/queries/` e rodar `get_advisors`.

## Estado no projeto `tyhmvwzskymebetbkdko` (seico)

| Arquivo | Aplicada | O quê |
|---|---|---|
| `0001_schema.sql` | sim | baseline: team_members, leads, clientes, activities |
| `0002_auth_rls.sql` | sim | RLS, `is_admin()`, `set_member_role`, grants de coluna |
| `0003_seed_tipos_treinamento.sql` | sim | catálogo inicial de NRs |
| `0005_fusao_servicos.sql` | sim | treinamento vira serviço; `tipos_servico`, `servicos` |
| `0006_admin_fiscalizacao.sql` | sim | `configuracoes`, `registros_diarios`, `notificacoes` |
| `0007_notificacoes_update.sql` | sim | policy de UPDATE restrita a `enviada_em` |
| `0008_metas.sql` | sim | `metas` (métrica × período × alvo × pessoa) |
| `0009_auditoria.sql` | sim | `audit_log` + gatilho `registrar_audit` |
| `0010_exclusoes.sql` | sim | `solicitacoes_exclusao`, `clientes_delete_admin` |
| `0011_tarefas.sql` | sim | `tarefas` |
| `0012_cidades.sql` | sim | cache de coordenadas para o mapa |
| `0013_cnae.sql` | sim | CNAE em leads/clientes e prefixos em `tipos_servico` |
| `0014_prospeccao.sql` | sim | base de prospecção da Receita, preenchida pelo robô mensal |
| `0015_equipe_desativar.sql` | sim | admin corrige o nome dos outros; `ativo` só pela service role |

Não há `0004`: o número foi consumido por uma migration de AVCB descartada no
pivô, e renumerar o que já estava aplicado criaria divergência pior que o buraco.

## Aplicar

Com o conector ou o CLI ligado, na ordem. Todas as instruções da 0013 são
idempotentes (`if not exists`), então repeti-la é seguro.
