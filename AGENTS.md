<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CRM de Treinamentos e Serviços (SEICO)

CRM operacional de uma empresa de treinamentos e segurança do trabalho. Duas
metades ligadas: o **funil comercial** (leads → kanban → conversão) e o
**cadastro operacional** (clientes → serviços → vencimentos).

**Treinamento é um serviço.** Não existe tabela `treinamentos`: o que separa
"NR-35" de "laudo de insalubridade" é `tipos_servico.categoria`
(`treinamento` | `servico`), não a tabela. Um serviço nasce `agendado` (com
`data_agendada`, timestamptz) e vira `realizado` (com `data_realizacao`, date) —
a constraint `servicos_datas_por_status` garante que a data certa exista para
cada status.

**Menu enxuto de propósito.** Serviços e vencimentos não estão na navegação:
serviço se cadastra pelo cliente ou pela Agenda, e vencimento aparece como
kanban de conformidade no Painel. `/servicos` existe mas é alcançada por link no
Painel — era item de menu que ninguém procurava.

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
sem componente). É o que mantém `vencimentos`, `painel`, `servicos`,
`relatorioDiario`, `conversao` e `search` testáveis sem jsdom.

**Painéis reutilizáveis, não páginas duplicadas.** `ServicosPanel` encapsula
tabela + modais de criar/editar/concluir/excluir e serve tanto `/servicos`
quanto a aba do cliente. Antes disso a mesma orquestração vivia duplicada nos
dois lugares.

## Datas — a pegadinha do Mantine v9

`DateInput`/`DateTimePicker`/`Calendar` trabalham com **strings**, não `Date`:
`"YYYY-MM-DD"` e `"YYYY-MM-DD HH:mm:ss"`. `getDayProps`/`renderDay` também
recebem string.

- Colunas `date` (`servicos.data_realizacao`, `servicos.data_vencimento`,
  `registros_diarios.data`):
  string `"YYYY-MM-DD"` do input direto para o PostgREST. **Nunca** passe por
  `new Date(...)` nem `.toISOString()` — `new Date("2026-03-01")` é lido como UTC
  e volta como 28/02 em UTC-3.
- Colunas `timestamptz` (`leads.follow_up_at`, `servicos.data_agendada`): aí sim
  `dayjs(x).toISOString()`, porque têm hora de verdade.
- Ao juntar os dois num calendário, converta só o timestamptz. Reformatar uma
  data pura "por consistência" reintroduz o bug de fuso.

`dayjs.locale("pt-br")` **não** é chamado globalmente (o `DatesProvider` em
`app/providers.tsx` configura só os componentes do Mantine), então
`.endOf("week")` usaria o locale `en` calado. Consequências espalhadas pelo
código, todas deliberadas:

- janelas de vencimento são móveis (+7/+30 dias), não de calendário;
- `AgendaCalendar` tem array de meses escrito à mão em vez de `format("MMMM")`;
- o início da semana da grade usa `.day()` (valor absoluto), não
  `.startOf("week")`.

Se algum dia alguém chamar `dayjs.locale("pt-br")` globalmente, nada disso
quebra — é justamente o ponto.

## Perfis e segurança

`admin` vs `colaborador` em `team_members.role`. A barreira real é a RLS
(`supabase/migrations/0002_auth_rls.sql`); `RequireAdmin` e o menu escondido são
conveniência.

Duas regras que não podem ser afrouxadas:

1. `team_members` tem `GRANT UPDATE (full_name)` apenas. `role` só muda pela RPC
   `set_member_role`, que checa `is_admin()`. RLS decide linhas, GRANT decide
   colunas — sem os dois, qualquer colaborador se promove pelo console.
2. Não existe policy de DELETE em `clientes`, de propósito: serviços e notas
   cascateiam a partir dele. Cliente que saiu vira `status = 'inativo'`.

Ao escrever policy nova: sempre `to authenticated`, e chame a função como
`(select public.is_admin())` para ela ser avaliada uma vez por statement.

## E-mail e servidor

`app/api/notificar/route.ts` é a **única** rota de servidor do projeto: existe só
porque a chave do provedor não pode ir para o navegador. Todo o resto fala direto
com o PostgREST.

Sem `RESEND_API_KEY` definida a rota responde `sent: false` em vez de falhar — a
notificação fica registrada em `notificacoes` e aparece no admin como "só
registrado". A funcionalidade inteira é utilizável antes de existir conta de
e-mail.

Notificação nunca derruba a ação que a originou: `registrarNotificacao` é
best-effort e o envio é `catch`-ado. Fechar um cliente não pode falhar porque o
e-mail caiu.

## Metas

Modeladas como **métrica × período × alvo × pessoa** (`metas`), não uma tabela
por tipo de meta. "Contatar 40 leads por dia" e "fechar 20 mil no mês" são a
mesma estrutura — adicionar um tipo novo de meta é adicionar um valor ao enum
`meta_metrica` e um `case` em `calcularRealizado`, nunca uma migration de tabela.

`member_id` nulo = meta da equipe: vale para todos, cada um com o próprio
progresso. Evita duplicar a mesma meta por pessoa.

**Progresso nunca é armazenado** — `lib/metas.ts` deriva de activities/leads/
serviços a cada leitura, pela mesma razão de `situacaoCliente`. Uma coluna de
progresso estaria errada no instante seguinte a qualquer registro.

`contatos_lead` conta leads **distintos**; `atividades` conta interações. Cinco
ligações para a mesma empresa são 1 lead contatado e 5 atividades.

Janela do período é de **calendário** (semana corrente, mês corrente), ao
contrário de `lib/vencimentos.ts`, que usa janela móvel — lá não existe "a semana
do vencimento", só distância até ele. A semana é calculada com `.day()` e não
`.startOf("week")`, pelo motivo de locale descrito acima.

Metas aparecem no Painel e na Agenda, **não como evento do calendário**: uma meta
diária marcaria todos os dias do mês e afogaria os compromissos reais.

## Jornada de trabalho

Início e fim de jornada são **ação explícita** (botão no Painel), não derivados
do login: `SIGNED_IN` do Supabase dispara a cada refresh em que a sessão é
reestabelecida, então geraria vários registros falsos por dia.
`registros_diarios` tem unique `(member_id, data)` e RLS que exige
`member_id = auth.uid()` — ninguém bate ponto por outro.

## Depois de mexer no schema

Aplicar a migration, rodar `get_advisors` (pega tabela sem RLS e função com
`search_path` mutável) e atualizar à mão o `XRow` correspondente — não há tipos
gerados.
