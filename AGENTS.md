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

**Uma fonte de pendências.** `computePainel` (`lib/painel.ts`) é a única coisa
que decide o que conta como pendência. Painel, `/tarefas` e o sino do cabeçalho
consomem a mesma lista — a ordem em que `computePainel` monta o array **é** a
prioridade nos três lugares. Pendência nova é um `case` lá, não uma tela.

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
Ordenação por clique no cabeçalho vem ligada; coluna sem valor comparável (selo
derivado, botão) declara `enableSorting: false`. Duas armadilhas com
`sortingFn`: ordenar `pipelineStage` pelo valor dá ordem alfabética do enum
(`fechado_ganho` antes de `novo_lead`), então use `ordenarPorEtapa` de
`lib/pipeline/ordenacao.ts`; e coluna numérica anulável deve emitir `undefined`
no `accessorFn` com `sortUndefined: "last"`, senão o vazio é tratado como zero.
**Modais de detalhe** — `components/shared/DetailModal.tsx`; o `key={record.id}`
lá dentro é load-bearing (reseta o estado do formulário sem efeito de sync).
**Formulários** — `@mantine/form` `useForm`, sempre. `useState` por campo é o que
produziu o arquivo de 765 linhas que este projeto acabou de desmontar. As regras
de Lead e Cliente moram juntas em `lib/validacao.ts` porque os dois **precisam**
concordar: o lead vira cliente pela conversão, e se o cadastro de cliente exigir
algo a mais, a conversão produz um cliente que não passaria no próprio
formulário. Telefone e e-mail são um par (`exigirContato`) — a regra é aplicada
aos dois campos, para acenderem juntos.

Responsável é obrigatório e já nasce preenchido com quem está cadastrando: a
métrica `leads_novos` de `lib/metas.ts` conta por `assignedUserId`, então lead
sem dono não contava para ninguém.

Cada linha do formulário é um `Grid` de 12 colunas, **não** `SimpleGrid`: campo
estreito ao lado de largo (UF ao lado de Cidade) precisa de proporção, e uma
`description` sob um campo só empurra o input vizinho para baixo num grid de
colunas iguais — foi o que deixou o cadastro torto. Regra que vale para os dois
campos (telefone/e-mail) vira **uma** linha de `Text` sob o par, nunca a mesma
frase repetida em cada um.

## CNAE e a sugestão automática de serviços

O CNAE é hierárquico (`41` divisão → `4120` classe → `4120-4/00` subclasse), e é
isso que faz a coisa funcionar: `tipos_servico.cnaes` guarda **prefixos**, não
códigos completos, então configurar `41` no NR-35 cobre a construção inteira sem
cadastrar centenas de subclasses. `servicosParaCnae` (`lib/cnae.ts`, com teste)
casa por prefixo e ordena do mais específico para o mais genérico — regra escrita
para a subclasse exata é mais deliberada que uma que pegou a divisão.

Tipo sem `cnaes` **nunca** é sugerido, e esse é o padrão certo: sugestão errada
custa mais caro que sugestão ausente. A comparação é sempre só por dígitos dos
dois lados, então pontuação no cadastro não quebra o casamento.

A sugestão **não** preenche `possiveisServicos` sozinha — ela aparece com um
botão. Preencher calado tiraria de quem cadastra a chance de discordar, e o
campo passaria a significar "o que o sistema achou" em vez de "o que decidimos
oferecer".

`lib/cnaeCatalogo.ts` é **gerado** por `scripts/gerar-cnae-catalogo.mjs` a partir
da API do IBGE: 87 divisões + 673 classes, ~51 KB. Não edite à mão; rode o
script. É commitado e não buscado em tempo de execução porque a tabela CNAE muda
de década em década, e uma tela de cadastro não pode depender de o IBGE estar no
ar. Subclasses (1.332 itens, 3,6 MB) ficam de fora — o casamento é por prefixo,
então uma subclasse informada cai naturalmente sob a classe dela.

`CnaeInput` são **dois** campos, e é deliberado: quem está ao telefone sabe
dizer "é uma construtora" e não o código; quem tem o cartão CNPJ na mão tem o
código e não quer procurar numa lista de 760. Os dois se preenchem. O
`filter={({options}) => options}` do `Autocomplete` desliga o filtro do Mantine
porque `buscarCnae` já filtrou — deixá-lo ligado refiltraria por substring do
rótulo e derrubaria os acertos por número.

`cnae_descricao` é redundante com o código de propósito, pela mesma razão de
`servicos.tipo_nome`: a tabela do IBGE é revisada, e o que foi cadastrado
precisa continuar legível mesmo que o código mude de significado.

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

**Trocar de usuário limpa o cache do React Query** (`AuthListener`), e é
obrigatório. `useCurrentMember` tem `staleTime` e entrega o valor em cache antes
de revalidar, então sem o `queryClient.clear()` um colaborador que entra logo
depois de um admin no mesmo navegador vê o menu de Administração, o sino com
avisos de admin e os botões de excluir até a revalidação chegar. A limpeza é
condicionada a o `user.id` ter mudado — `SIGNED_IN` dispara a cada sessão
reestabelecida, e limpar sempre viraria enxurrada de refetch. Estado por
dispositivo (as não-lidas do sino) leva o id do usuário na chave pela mesma
razão.

Duas regras que não podem ser afrouxadas:

1. `team_members` tem `GRANT UPDATE (full_name)` apenas. `role` só muda pela RPC
   `set_member_role`, que checa `is_admin()`. RLS decide linhas, GRANT decide
   colunas — sem os dois, qualquer colaborador se promove pelo console. É essa
   divisão que deixa `team_members_update_admin` (migration 0015) ser uma policy
   de uma linha: ela libera a **linha** de qualquer pessoa para o admin corrigir
   o nome, e o GRANT por coluna continua barrando `role` e `ativo` no mesmo
   movimento.
2. `audit_log` não tem policy de INSERT, UPDATE nem DELETE — **para ninguém**,
   nem admin. Só o gatilho `SECURITY DEFINER` escreve. É o que separa um
   registro de auditoria de um bloco de notas.

Ao escrever policy nova: sempre `to authenticated`, e chame a função como
`(select public.is_admin())` para ela ser avaliada uma vez por statement.

### Criar acesso, redefinir senha e desativar

`app/api/equipe/route.ts` é a **única** parte do projeto que toca a
`SUPABASE_SERVICE_ROLE_KEY`, e ela ignora RLS por completo. Duas razões para a
rota existir: `supabase.auth.signUp()` no navegador **troca a sessão corrente
pela do usuário recém-criado** (o admin cadastraria alguém e sairia do próprio
login), e criar conta para outra pessoa exige a API de admin do Supabase.

A ordem das checagens é a segurança inteira: sessão → `is_admin()` perguntado ao
banco com o token de quem chamou → só então a service role. Confiar num campo do
corpo da requisição seria deixar o chamador declarar o próprio poder.

A rota **não** define perfil. `handle_new_user` sempre cria como `colaborador`
(a tabela nunca está vazia depois do primeiro), e promover continua sendo
`set_member_role`, chamada pelo cliente. Aceitar `role` ali abriria um segundo
caminho para promoção — e um caminho a mais é uma trava a menos.

`email_confirm: true` na criação porque não há SMTP configurado no Supabase: sem
isso a pessoa ficaria presa esperando um e-mail que nunca chega. A senha aparece
uma vez só na interface, e o modal segura o admin até ele copiar — o Supabase
guarda apenas o hash, então perdê-la significa redefinir outra.

**Desativar é banir no Auth; `team_members.ativo` é só o espelho legível disso.**
Uma coluna que ninguém aplica não desativa ninguém: a pessoa continuaria
entrando, a RLS continuaria deixando ela trabalhar, e a tela do admin diria
"Inativo". Por isso a ação também mora nesta rota (a service role é quem bane) e
o ban vem **antes** do flag — falhar entre os dois deixa alguém barrado que a
tela mostra como ativo, corrigível com um segundo clique; a ordem inversa
mostraria "Inativo" para quem continua entrando, que é a mentira perigosa. Mesmo
raciocínio de `aprovarExclusao`. Quem já está com o sistema aberto continua até o
access token expirar (≤1h) — dito na interface, não escondido.

`ativo` não tem GRANT de UPDATE para `authenticated`, nem para admin: muda só
pela RPC `set_member_ativo`, exatamente como `role` muda só por
`set_member_role` — e ela recusa o admin desativar a si mesmo, pelo mesmo motivo
de `set_member_role` não deixar ele se rebaixar. A rota podia escrever a coluna
com a service role que já tem na mão e economizar a função; não escreve porque o
gatilho `registrar_audit` grava `auth.uid()`, e escrita de service role deixaria
o log dizendo que ninguém desativou ninguém.

Desativado some das listas de responsável (`opcoesDeMembro`, `lib/equipe.ts`),
mas continua aparecendo no registro que já era dele, marcado como inativo — se a
opção sumisse, abrir aquele cadastro mostraria o campo vazio e salvar qualquer
outra coisa apagaria calado a quem o trabalho pertencia. Filtro de relatório não
usa isso: lá se quer justamente consultar o histórico de quem saiu.

### Exclusão de lead e cliente

Apagar cliente cascateia serviços e notas — o histórico que comprova
conformidade. Por isso o DELETE das duas tabelas exige `is_admin()`, e o
colaborador passa por `solicitacoes_exclusao`: ele registra o pedido, o admin
decide. Não é etiqueta de cortesia; a RLS não o deixa apagar nem pelo console.

`aprovarExclusao` **apaga primeiro e marca depois**. Não há transação pelo
PostgREST: falhar entre os dois passos deixa um pedido pendente apontando para
registro morto — visível e corrigível. A ordem inversa deixaria um pedido
"aprovado" para um registro que continua lá, que é mentira no histórico.

"Inativar" segue como o caminho normal e o botão em destaque.

### Exclusão de tipo do catálogo

`servicos.tipo_servico_id` é `on delete restrict`, então o banco recusa apagar um
tipo já usado — o serviço lastreia certificado emitido. A tela não descobre isso
pelo erro: a aba Catálogo conta os usos de cada tipo e só mostra o botão de
excluir para os que têm zero, que é o caso real de exclusão (erro de digitação,
duplicata, teste). Com uso, no lugar do botão aparece a instrução de desmarcar
`ativo`. A mensagem de `servicos_tipo_servico_id_fkey` fica em `lib/errors.ts`
mesmo assim, porque a corrida entre a contagem e o clique existe.

### Log de usuário

`audit_log` é escrito por gatilho (`registrar_audit`, migration 0009), não pelo
app. Todas as páginas falam PostgREST direto do navegador, então qualquer
`registrarLog()` no cliente seria opcional na prática — bastaria abrir o console
para escrever sem rastro, e esquecer de chamá-lo numa mutação nova falharia em
silêncio.

O gatilho monta o diff sozinho e ignora `updated_at`, `created_at` e
`position` — arrastar um card dentro da mesma coluna do kanban não gera linha
nenhuma. Ficam de fora `activities` e `notificacoes` (já são log) e
`configuracoes` (tem `id boolean`, e o cast para uuid falharia).

Tabela nova que mereça auditoria precisa do gatilho adicionado à mão. A tradução
para português vive em `lib/auditoria.ts`, com teste; coluna sem rótulo aparece
crua, o que é feio de propósito — melhor do que sumir.

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

## Tarefas e avisos

**Tarefa e pendência são coisas diferentes.** Pendência é estado do dado
("este treinamento está sem instrutor") e some sozinha quando o dado é
corrigido; tarefa é compromisso de alguém e só some quando alguém a conclui.
`lib/tarefas.ts` funde as duas numa lista, e é por isso que as automáticas **não**
viram linha no banco: materializá-las produziria tarefa fantasma dizendo "achar
instrutor" para um serviço que já tem instrutor.

O caminho inverso existe: o botão **Delegar** cria uma tarefa com
`origem_pendencia` preenchido, e a pendência calculada some da lista por casar
com essa coluna. O índice único parcial garante uma tarefa aberta por pendência.
Concluir a tarefa sem corrigir o dado faz a pendência voltar — que é o correto.

`tarefas` não tem enum de status: `concluida_em is null` **é** o status, e os
mesmos dois campos já respondem "quem concluiu e quando".

**O sino é derivado, como todo o resto.** `lib/avisos.ts` não lê tabela de
notificação nenhuma (`notificacoes` é o log de e-mail, outra coisa). Quem recebe
o quê está em `AVISO_REGRAS`, uma linha por tipo: `admin`, `dono` ou `todos`.
`avisosPara` é a única função que decide — se a regra começar a aparecer em `if`
espalhado pela interface, foi para o lugar errado. Lead sem responsável cai para
o admin: aviso que não é de ninguém não é aviso.

Não-lidas ficam em `localStorage`, não no banco. É conveniência por dispositivo,
e a alternativa seria abrir o `GRANT UPDATE (full_name)` de `team_members` pelo
motivo mais frágil possível.

## Cores

`PIPELINE_STAGES` carrega a cor de cada etapa. A rampa acompanha o funil
(cinza → azul → ciano → violeta); só ganho e perdido fogem dela, porque neles a
cor significa resultado e não posição.

**Laranja e amarelo estão reservados** para "a vencer" e "dado incompleto"
(`lib/vencimentos.ts`, `lib/painel.ts`). Etapa saudável do funil pintada de
laranja colide com o único lugar do app onde laranja quer dizer urgência. Cor
nunca é o único sinal: `StageBadge` sempre leva o rótulo junto.

## Prospecção a partir dos dados abertos da Receita

`scripts/prospectar.mjs` roda todo mês pelo GitHub Actions
(`.github/workflows/prospeccao.yml`), levanta as empresas da região e grava em
`public.prospeccao`. `Leads → Importar` recorta e decide. **Ninguém baixa nada.**

A rodada mensal faz **duas** coisas, e manter cadastro atualizado é só metade:
traz quem abriu na região desde a última coleta, e refresca razão social, nome
fantasia, telefone, e-mail, endereço, porte e capital de quem **ainda está na
fila** — o upsert é `onConflict` no CNPJ.

**Ela não atualiza `leads` nem `clientes`, e isso é deliberado.** Importar copia
os dados para `leads` e preenche `virou_lead_em`; dali em diante a coleta nunca
mais toca naquela empresa. Um lead é o retrato do que foi negociado, com as
correções feitas ao telefone — a Receita sobrescrevendo isso todo mês apagaria
trabalho humano com dado de cadastro que costuma ser pior.

**Empresa que fecha não é marcada**, e é a lacuna conhecida: a coleta só olha
situação cadastral `02`, então quem deu baixa simplesmente para de aparecer e a
linha continua na fila parecendo viva. O sinal existe e está no schema — a
`competencia` fica presa no mês antigo enquanto as outras avançam. Nada na tela
usa isso ainda; se for usar, é daí que sai.

`--partes 0` baixa 1 dos 10 pedaços (~2,7 GB em vez de ~27 GB) e serve para
testar o caminho inteiro. Traz **bem menos** empresas do que a região tem, e não
é defeito: `Estabelecimentos` e `Empresas` não são particionados igual, então a
maioria dos CNPJs achados no pedaço 0 do primeiro não acha razão social no pedaço
0 do segundo, e essas linhas caem no filtro final.

**Prospecção não é lead, e a separação é o ponto.** `prospeccao` é o material
bruto; `leads` é o funil. Despejar 3.000 empresas em `leads` faria toda métrica
de conversão mentir, porque contaria como trabalho comercial gente que ninguém
olhou. A tabela não tem DELETE de propósito: `descartada_em` preenchido é o que
impede a coleta do mês seguinte de ressuscitar quem já foi recusado.

**O endereço não é o que a internet diz.** `dadosabertos.rfb.gov.br` está fora do
ar e as URLs planas (`/dados/cnpj/dados_abertos_cnpj/AAAA-MM/`) devolvem 404 —
inclusive as que o Google ainda tem indexadas. O que existe hoje é um
compartilhamento Nextcloud servido por **WebDAV**, com o token como usuário e
senha vazia:

```
https://arquivos.receitafederal.gov.br/public.php/dav/files/<token>/Dados/Cadastros/CNPJ/AAAA-MM/
```

O mês vem de um `PROPFIND` na pasta, não de um palpite: a Receita publica com
atraso variável e o mês corrente costuma não existir ainda. Baixar funciona **de
qualquer lugar, inclusive de servidor** — verificado. Uma versão anterior deste
arquivo dizia que o portal recusava IP de datacenter; era inferência errada a
partir do host antigo estar morto, e ela fechava a porta para automatizar isso.

**Nada toca o disco.** São ~27 GB e nenhum runner de CI tem espaço para eles.
Cada zip da Receita tem **uma** entrada deflate, então o script tira o local file
header em `Transform` e infla a própria resposta HTTP — sem biblioteca de zip, que
imporia o arquivo em disco.

Cinco coisas que quebram este import, nenhuma óbvia, e as duas últimas só
apareceram contra o arquivo real:

1. Os CSVs são **latin1**. `fluxo.setEncoding("latin1")` é obrigatório: sem ele o
   readline decodifica como UTF-8 e todo "SÃO" vira "S?O" em silêncio, porque os
   bytes são válidos e só o resultado está errado.
2. A Receita usa a tabela **TOM** de municípios, **não** o código do IBGE
   (Cerquilho é `6331` lá e `3512001` no IBGE). O casamento é por nome
   normalizado, via o arquivo `Municipios`.
3. `Socios*.zip` traz nome e CPF de pessoas físicas. **Não tocar** — dado de
   empresa é público, dado de sócio é dado pessoal.
4. **`split(";")` não serve.** Os campos são citados e alguns contêm ponto e
   vírgula de verdade; o split ingênuo produz 31 colunas e derruba a conferência
   de layout.
5. **Um registro não é uma linha.** Alguns campos citados contêm quebra de linha,
   então a leitura acumula até as aspas fecharem.

Registro sujo se pula; layout trocado aborta. A diferença é a proporção — o teto
de 0,1% é o que separa um endereço maldigitado em 2003 de uma coluna nova da
Receita.

Os 10 pedaços (`Estabelecimentos0..9`) são repartição arbitrária do cadastro, não
recorte geográfico: cada um traz empresas do Brasil inteiro, então `--partes 0`
já dá amostra representativa para testar. `Estabelecimentos` e `Empresas` **não**
são particionados igual, então o join é em duas passadas: primeiro os
estabelecimentos da região, depois as razões sociais dos CNPJs básicos achados.

O filtro de CNAE é o mesmo `tipos_servico.cnaes` do catálogo: a configuração que
gera as sugestões é a query de prospecção. Catálogo sem CNAE **aborta a coleta**,
em vez de trazer o comércio inteiro da região.

**Os filtros vivem na tela, não no script.** Cidade, segmento, qualificação e
quantidade são decisão de quem vai ligar na segunda-feira, e não de um arquivo de
configuração escrito um mês antes. O robô traz a região; a tela recorta.

`lib/qualificacao.ts` pontua com o que existe — o dump **não traz número de
funcionários**, que seria o sinal direto. Sobram proxies: quantos serviços do
catálogo se aplicam ao ramo (o único que fala do nosso negócio), porte, capital,
matriz, idade e ter os dois meios de contato. O score **sempre** vem com os
motivos: um número opaco de 0 a 10 não deixa ninguém discordar dele, e quem
conhece a região precisa poder corrigir o sistema em vez de obedecer a ele.

`lib/regiao.ts` tem as cidades em camadas a partir de Cerquilho. Não usa a
"região imediata" do IBGE direto porque ela agrupa por polo econômico e a de
Sorocaba **exclui Tatuí e Laranjal Paulista**, que fazem divisa com a sede.
`scripts/regiao.mjs` duplica as listas porque os scripts rodam fora do bundler e
não importam TypeScript — e `lib/regiao.test.ts` compara as duas, para a
duplicação não divergir em silêncio.

### A conta do robô

O workflow **não usa a service role**, e o motivo é o repositório ser público. A
conta do robô é um usuário comum: a RLS vale para ela como para qualquer
colaborador, então um segredo vazado custa o acesso de um colaborador, não o de
quem ignora RLS por completo.

Os gatilhos são só `schedule` e `workflow_dispatch`. **Não existe
`pull_request`** — é assim que um PR vindo de fork conseguiria ler os segredos.

## Mapa por cidade

`cidades` é **cache**, não cadastro: ninguém preenche à mão, e apagar uma linha
só faz a cidade ser geocodificada de novo. A chave é a normalizada
(`chaveCidade`, `lib/mapa.ts`), senão "São Paulo" e "sao paulo" viram duas
cidades — `leads.cidade` é texto livre.

`app/api/geocodificar/route.ts` é a segunda (e última) rota de servidor, pelo
mesmo tipo de motivo da primeira: o Nominatim exige `User-Agent` identificável e
1 req/s, e o navegador não deixa definir `User-Agent`. Cada cidade é consultada
uma vez na vida — `tentada_em` preenchido com `lat` nula significa "não achou", e
não volta para a fila; senão toda abertura do mapa gastaria cota tentando
geocodificar um erro de digitação.

`PipelineMapa` carrega o Leaflet com `next/dynamic` e `ssr: false`: ele toca
`window` na importação do módulo e quebra o build sem isso. E o raio da bolha é
proporcional à **raiz quadrada** da contagem — o olho compara círculos por área.

## Depois de mexer no schema

Aplicar a migration, rodar `get_advisors` (pega tabela sem RLS e função com
`search_path` mutável) e atualizar à mão o `XRow` correspondente — não há tipos
gerados. Se a tabela nova merece auditoria, adicionar o gatilho
`registrar_audit` explicitamente.
