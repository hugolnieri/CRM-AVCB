-- Cache de coordenadas por cidade, para o mapa do pipeline.
--
-- `leads.cidade` e `leads.uf` sao texto livre digitado a mao, entao nao ha
-- coordenada nenhuma no sistema. Esta tabela e um cache: cada cidade e
-- geocodificada UMA vez na vida (ver app/api/geocodificar/route.ts) e a partir
-- dai o mapa e leitura local. Nao e cadastro -- ninguem preenche isto a mao, e
-- apagar uma linha so faz a cidade ser geocodificada de novo.

create table public.cidades (
  -- Identidade normalizada, "sorocaba|sp": e o que impede "Sao Paulo",
  -- "sao paulo" e "SAO PAULO" de virarem tres cidades no mapa. Gerada em
  -- lib/mapa.ts (chaveCidade) e repetida aqui como chave primaria.
  chave            text primary key,
  -- Grafia para exibicao, com acento e caixa.
  nome             text not null,
  uf               text not null,
  -- NULL = geocodificacao ainda nao rodou ou falhou. A cidade aparece na lista
  -- "Sem localizacao" ao lado do mapa em vez de sumir -- e tambem como erro de
  -- digitacao fica visivel em vez de silencioso.
  lat              double precision,
  lng              double precision,
  -- Carimbo da ultima tentativa. Com lat/lng nulos, serve para nao repetir uma
  -- consulta que ja falhou a cada abertura da tela.
  tentada_em       timestamptz,
  created_at       timestamptz not null default now()
);

create index cidades_sem_coordenada_idx on public.cidades (tentada_em)
  where lat is null;

alter table public.cidades enable row level security;

-- Cache compartilhado: todo mundo le, e qualquer autenticado pode preencher --
-- a rota de geocodificacao roda com a sessao de quem abriu o mapa. Nao ha
-- policy de delete: limpar o cache e operacao de manutencao, nao de uso.
create policy cidades_select on public.cidades
  for select to authenticated using (true);
create policy cidades_insert on public.cidades
  for insert to authenticated with check (true);
create policy cidades_update on public.cidades
  for update to authenticated using (true) with check (true);
