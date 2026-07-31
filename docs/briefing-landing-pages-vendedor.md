# Briefing: apresentação da NR-35 para o cliente

Documento de contexto para o Codex construir uma versão desta página. Já existe
uma versão feita pelo Claude Code em `app/(public)/lp/nr-35/` — a ideia é
comparar as duas e escolher, então **leia este briefing antes de olhar a
implementação existente**, para não ancorar nela.

## O público: cliente que já disse que quer

Este é o ponto que muda tudo, e é o erro mais fácil de cometer aqui.

**Não é página de captação.** Ninguém chega nela por busca no Google ou anúncio.
O vendedor da SEICO já conversou com a empresa, o cliente demonstrou interesse em
contratar, e o link é mandado por WhatsApp **depois** dessa conversa.

Consequências diretas:

- Não precisa convencer que segurança do trabalho importa, nem gastar metade da
  página explicando o que é queda de altura. Quem abriu já sabe.
- O trabalho da página é responder **o que vem depois do "quero"**: o que a
  equipe recebe, quanto tempo leva, o que está incluso, o que a empresa precisa
  providenciar, como marca a data.
- O sucesso é a conversa seguinte ser sobre **data**, não sobre o que está
  incluso.
- Sem formulário de captura de lead. O contato já existe — pedir e-mail de quem
  já está no WhatsApp com o vendedor é atrito puro (e, tecnicamente, abriria a
  discussão de RLS do item abaixo).

## Restrições técnicas que não são negociáveis

### A página é estática, sem ler o Supabase

Toda leitura deste projeto é `to authenticated`; a RLS é a barreira real de
segurança (ver `AGENTS.md`), não convenção de tela. Abrir a primeira policy
`to anon` do projeto é uma decisão de segurança grande, e não deve ser tomada de
passagem dentro de uma tarefa de landing page. O conteúdo fica escrito na
própria página.

### A rota precisa estar em `PUBLIC_PATHS`, no `proxy.ts` da raiz

Sem isso o middleware manda todo visitante não-logado para `/login` antes de a
página carregar. **Já foi feito**: `PUBLIC_PATHS` hoje é `["/login", "/lp"]`.
Qualquer rota nova sob `/lp` já está liberada.

### Fica fora do shell autenticado

`app/(app)/layout.tsx` injeta menu lateral, sino de avisos e botão de sair — nada
disso pode aparecer para o cliente. Por isso a página vive em `app/(public)/`,
que só herda o layout raiz (`app/layout.tsx`: fontes, `Providers` com Mantine e
React Query, nenhum código de auth).

### Server component, por causa do preview do WhatsApp

O link vai ser colado numa conversa, e o card de preview é a primeira impressão.
`export const metadata` (title/description/openGraph) só funciona fora do
cliente — então nada de `"use client"` no topo desta página.

## Conteúdo

### O que pode ser afirmado (informação pública da norma)

A NR-35 define isso, então não é invenção:

- Aplica-se a trabalho acima de **2 metros** do nível inferior com risco de queda.
- Carga horária mínima de **8 horas** (item 35.3.2).
- **Reciclagem bienal** (item 35.3.3), e também em mudança de procedimento, troca
  de função ou retorno de afastamento maior que 90 dias.
- Conteúdo programático mínimo do item 35.3.2: normas e regulamentos aplicáveis;
  análise de risco e condições impeditivas; riscos potenciais e medidas de
  prevenção e controle; sistemas, equipamentos e procedimentos de proteção
  coletiva; EPI para trabalho em altura (seleção, inspeção, conservação e
  limitação de uso); acidentes típicos; condutas em emergência, incluindo noções
  de resgate e primeiros socorros.

Os números batem com o que está cadastrado no catálogo do CRM para o NR-35
(8h, validade 24 meses) — se divergirem, o catálogo é a fonte.

### O que NÃO pode ser inventado

Deixe como placeholder **visualmente óbvio** (a versão do Claude usa uma caixa
tracejada âmbar, justamente para ser impossível publicar sem ver):

- Telefone/WhatsApp e e-mail de contato.
- Diferenciais da SEICO: tempo de mercado, formação dos instrutores, região
  atendida, estrutura para a parte prática.
- Preço, prazo de agendamento, modalidade (in-company ou na sede).
- Depoimentos, logos de clientes, números de "X empresas atendidas".

Placeholder discreto vai para produção sem ninguém notar — e aqui vira promessa
feita a um cliente real. Prefira a lacuna gritante.

## Estilo

- **Mobile-first**: o link chega pelo WhatsApp, a maioria abre no celular.
- Não precisa usar Mantine. O tema do projeto está calibrado para telas de
  administração, e uma apresentação ao cliente pede outra densidade. CSS Module
  escopado na rota é suficiente e não vaza para o CRM.
- Tom profissional e direto. Empresa de segurança do trabalho vendendo para
  outra empresa — não é startup.

## Onde ficam as coisas

| O quê | Onde |
|---|---|
| Este briefing | `docs/briefing-landing-pages-vendedor.md` |
| Versão do Claude Code | `app/(public)/lp/nr-35/page.tsx` + `page.module.css` |
| Liberação da rota pública | `proxy.ts` (`PUBLIC_PATHS`) |
| Manual do Vendedor (link para a apresentação) | `app/(app)/manual-vendedor/page.tsx` |
| Material de venda interno (outro público!) | coluna `tipos_servico.material_venda`, editada em `/admin` → Catálogo |

**Sugestão para a versão do Codex**: criar em `app/(public)/lp/nr-35-codex/`
para as duas coexistirem e serem comparadas lado a lado no mesmo deploy. Depois
de escolhida, a perdedora sai e a vencedora fica em `/lp/nr-35`.

## Fora de escopo

- Uma página por tipo do catálogo — só NR-35 agora, como piloto.
- Captura de lead pela página.
- Coluna `slug` em `tipos_servico`. O Manual do Vendedor hoje mapeia sigla →
  URL num objeto chumbado (`APRESENTACAO_POR_SIGLA`); vira coluna quando houver
  páginas o bastante para justificar a migration.
- Reaproveitar `material_venda` como texto da landing. São públicos diferentes:
  aquele é o argumento **interno** que o vendedor lê antes de ligar, escrito para
  quem já sabe vender; este é o material que o **cliente** lê. Misturar os dois
  faz um dos dois ficar errado.
