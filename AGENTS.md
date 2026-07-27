<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRM de Treinamentos e Serviços (SEICO)

CRM operacional de uma empresa de treinamentos e segurança do trabalho. Duas
metades ligadas: o **funil comercial** (leads → kanban → conversão) e o
**cadastro operacional** (clientes → treinamentos/serviços → vencimentos).

Next 16 (App Router, `proxy.ts` e não `middleware.ts`), React 19, Mantine 9,
TanStack Query + Table, Supabase, Vitest. Todas as páginas são `"use client"` e
consultam o PostgREST direto do navegador — não há Server Action nem RPC de
leitura.

## Convenções que valem para código novo

**Camada de queries** (`lib/supabase/queries/*.ts`) — para cada entidade:
`interface XRow` (snake_case, espelha a migration), `mapRowToX` (→ camelCase),
`mapPatchToRow` (só emite as chaves presentes, para update parcial não zerar
campo), funções async planas com `if (error) throw error`. **Uma** `updateX(id,
patch)` genérica, nunca uma função por grupo de campos.

**Mutações** — `useCrudMutation` (`hooks/useCrudMutation.ts`) para todo
create/update/delete: já faz invalidate + `notifications.show` +
`getErrorMessage`. A única exceção é `useUpdateLeadStage`, que tem caminho
otimista escrito à mão porque reordena o cache para o card do kanban pular no
drop — não genericize.

**Erros** — sempre `getErrorMessage(err, "mensagem em pt-BR")` (`lib/errors.ts`).
Erros do PostgREST são objetos simples e falham em `instanceof Error`.
Constraints conhecidas são traduzidas lá; as desconhecidas passam cruas de
propósito, para bug não virar mensagem bonitinha.

**Tabelas** — `components/shared/DataTable.tsx` com um `ColumnDef<T>[]`.
**Modais de detalhe** — `components/shared/DetailModal.tsx`; o `key={record.id}`
lá dentro é load-bearing (reseta o estado do formulário sem efeito de sync).
**Formulários** — `@mantine/form` `useForm`, sempre. `useState` por campo é o que
produziu o arquivo de 765 linhas que este projeto acabou de desmontar.

**Lógica pura vai para `lib/*.ts` com teste** (`environment: "node"`, só lógica,
sem componente). É o que mantém `vencimentos`, `painel`, `treinamentos`,
`conversao` e `search` testáveis sem jsdom.

## Datas — a pegadinha do Mantine v9

`DateInput`/`DateTimePicker`/`Calendar` trabalham com **strings**, não `Date`:
`"YYYY-MM-DD"` e `"YYYY-MM-DD HH:mm:ss"`. `getDayProps`/`renderDay` também
recebem string.

- Colunas `date` (`data_realizacao`, `data_vencimento`, `data`, `data_proxima`):
  string `"YYYY-MM-DD"` do input direto para o PostgREST. **Nunca** passe por
  `new Date(...)` nem `.toISOString()` — `new Date("2026-03-01")` é lido como UTC
  e volta como 28/02 em UTC-3.
- Coluna `timestamptz` (`leads.follow_up_at`): aí sim `dayjs(x).toISOString()`,
  porque tem hora de verdade.
- Ao juntar os dois num calendário, converta só o timestamptz. Reformatar uma
  data pura "por consistência" reintroduz o bug de fuso.

`dayjs.locale("pt-br")` **não** é chamado globalmente (o `DatesProvider` em
`app/providers.tsx` configura só os componentes do Mantine), então
`.endOf("week")` usaria o locale `en` calado. Por isso as janelas de vencimento
são móveis (+7/+30 dias), não de calendário.

## Perfis e segurança

`admin` vs `colaborador` em `team_members.role`. A barreira real é a RLS
(`supabase/migrations/0002_auth_rls.sql`); `RequireAdmin` e o menu escondido são
conveniência.

Duas regras que não podem ser afrouxadas:

1. `team_members` tem `GRANT UPDATE (full_name)` apenas. `role` só muda pela RPC
   `set_member_role`, que checa `is_admin()`. RLS decide linhas, GRANT decide
   colunas — sem os dois, qualquer colaborador se promove pelo console.
2. Não existe policy de DELETE em `clientes`, de propósito: treinamentos,
   serviços e notas cascateiam a partir dele. Cliente que saiu vira
   `status = 'inativo'`.

Ao escrever policy nova: sempre `to authenticated`, e chame a função como
`(select public.is_admin())` para ela ser avaliada uma vez por statement.

## Depois de mexer no schema

Aplicar a migration, rodar `get_advisors` (pega tabela sem RLS e função com
`search_path` mutável) e atualizar à mão o `XRow` correspondente — não há tipos
gerados.
