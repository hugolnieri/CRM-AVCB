# Briefing: landing pages do Manual do Vendedor

Documento de referência para quem for construir a landing page (proposta:
Codex, em paralelo ao trabalho no Claude Code). Não é tarefa implementada
ainda — só o contexto necessário para começar.

## O que já existe (feito pelo Claude Code)

- Menu **Manual do Vendedor** (`/manual-vendedor`), autenticado, dentro do
  CRM. Lista os itens ativos de `tipos_servico` com um texto de argumentos de
  venda (`tipos_servico.material_venda`), editado pelo admin na aba Catálogo
  (`/admin`).
- Esse material é **interno** — script de abordagem, objeções comuns. Tom de
  quem já sabe que vai vender. **Não é o texto da landing page**: a landing
  page fala com o cliente final, que talvez nem saiba o que é NR-35.
- Piloto: **NR-35 — Trabalho em Altura**, já cadastrado no catálogo. É o
  único tipo com material de venda preenchido até agora, propositalmente,
  para testar o fluxo ponta a ponta com um caso real antes de generalizar.

## O que falta (proposto para o Codex)

Uma landing page pública, uma por tipo de serviço, para o vendedor mandar por
WhatsApp/e-mail ao invés de explicar o serviço por telefone. Começar só pela
de NR-35.

### Por que isso é uma decisão de arquitetura, não só uma página

Hoje **toda** rota do projeto exige login — `proxy.ts` (raiz do repo) só
libera `/login` em `PUBLIC_PATHS`. Uma landing page para cliente não pode
pedir senha, então esta é a **primeira rota pública de verdade** do projeto.
Duas implicações que valem a pena respeitar:

1. **A página deve ser estática — sem `select` no Supabase.** Toda leitura
   hoje é `to authenticated`; abrir a primeira policy `to anon` é uma decisão
   de segurança grande (RLS é a barreira real deste projeto, não convenção de
   tela — ver `AGENTS.md`), e não deveria ser tomada de passagem dentro de uma
   tarefa de landing page. Se o conteúdo precisar vir do banco no futuro, é
   melhor separar isso como uma decisão à parte, revisada como tal.
2. **A rota entra em `PUBLIC_PATHS`, em `proxy.ts`.** Sem isso o middleware
   redireciona todo visitante não-logado para `/login` antes mesmo de a
   página carregar.

### Estrutura sugerida

- Novo grupo de rota fora do shell autenticado, por exemplo
  `app/(public)/lp/[slug]/page.tsx` — sem o `AppShellNav` (sem menu, sem
  botão de sair, layout próprio e enxuto).
- `slug` legível (`nr-35`, não um uuid) — hoje `tipos_servico` não tem essa
  coluna; se for usar uma por tipo, é uma migration pequena e aditiva
  (`alter table tipos_servico add column slug text unique`). Pro piloto,
  pode simplesmente hardcodar a rota `app/(public)/lp/nr-35/page.tsx` sem
  nem tocar no banco — o objetivo agora é validar o formato da página, não
  generalizar para todo o catálogo.
- Meta tags de Open Graph (`title`, `description`, `image`) — o link vai ser
  colado no WhatsApp, e sem isso o preview do link fica feio/genérico.

### O que a página do piloto (NR-35) precisa comunicar

Conteúdo de regulamentação (o que é NR-35, quem precisa, por que é
obrigatório) é informação pública e pode ser escrito com conhecimento geral
do assunto. **O que é específico da SEICO abaixo está marcado como
placeholder — não inventar.**

- **O que é a NR-35**: treinamento obrigatório para quem trabalha em altura
  (acima de 2 metros com risco de queda), normativo do Ministério do
  Trabalho.
- **Quem precisa**: construção civil, manutenção predial/industrial, limpeza
  de fachada, telecom (torres/antenas) — qualquer atividade com risco de
  queda de altura.
- **O que o treinamento inclui**: carga horária e validade em meses — puxar
  do cadastro real em `tipos_servico` (`cargaHoraria`, `validadeMeses`) uma
  vez que o admin preencher esses campos para o NR-35; não fabricar um
  número aqui.
- **Diferenciais da SEICO** — `[placeholder: preencher com o que a empresa
  quer destacar — instrutores, anos de mercado, região atendida, etc.]`
- **Chamada para ação** — botão de WhatsApp/telefone/e-mail.
  `[placeholder: número e e-mail reais de contato]`. Por ora, **não** ligar
  isso a um formulário que grava lead no Supabase — isso reabriria a mesma
  discussão de RLS `to anon` do item acima. Se quiserem captura de lead pela
  landing page, tratar como decisão separada, não como parte deste piloto.
- **Sem depoimentos, sem preço, sem foto de cliente** até existir conteúdo
  real — página com espaço reservado (`[placeholder]`) é melhor que dado
  inventado.

### Estilo visual

O CRM usa Mantine com o tema padrão (nenhuma cor de marca customizada em
`app/providers.tsx` hoje). A landing page **não precisa** usar componentes
Mantine — é uma página pública isolada, pode ser HTML/CSS livre — mas deve
parecer profissional e ser mobile-first, já que a maioria vai abrir o link
pelo celular vindo do WhatsApp.

### Fora de escopo deste piloto

- Uma landing page por tipo do catálogo (só o NR-35 agora).
- Captura de lead pela própria página.
- Puxar `material_venda` para dentro da landing — são textos com público e
  tom diferentes; misturar os dois é reintroduzir a instrução do
  `AGENTS.md` sobre nunca duplicar a mesma frase em dois lugares com
  propósitos diferentes.
- Botão "copiar link" dentro do Manual do Vendedor apontando para a landing
  — vem depois que a página existir e tiver uma URL estável.
