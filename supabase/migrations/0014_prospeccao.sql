-- Base de prospeccao: as empresas da regiao levantadas do dump do CNPJ, ainda
-- nao decididas. Nao e lead -- e o material bruto de onde o lead sai.
--
-- Por que uma tabela e nao um JSON no navegador: quem importa precisa recortar
-- por cidade, segmento, porte e quantidade, e isso e um WHERE com indice, nao
-- um filter() sobre alguns milhares de linhas baixadas a cada abertura da tela.

create table if not exists public.prospeccao (
  id uuid primary key default gen_random_uuid(),

  -- Chave natural. UNIQUE e o que faz a coleta mensal ser idempotente: rodar
  -- duas vezes o mesmo mes atualiza, nao duplica.
  cnpj text not null unique,

  razao_social  text not null,
  nome_fantasia text,
  matriz        boolean not null default true,

  cnae           text not null,
  cnae_descricao text,

  endereco text,
  bairro   text,
  cep      text,
  cidade   text not null,
  uf       text not null,

  telefone text,
  email    text,

  -- Sinais de porte. Guardados crus porque a regra de "qualificado" muda com o
  -- tempo e derivar na leitura permite mudar de ideia sem recoletar 27 GB.
  porte            text,
  capital_social   numeric,
  inicio_atividade date,

  -- 'AAAA-MM' do dump que trouxe a linha. Serve para saber se a base envelheceu
  -- e para o rodape da tela dizer de quando e o material.
  competencia text not null,

  -- Decisao ja tomada sobre esta empresa. Preenchidos, ela some da fila --
  -- por isso nao ha DELETE: apagar faria a proxima coleta trazer de volta o que
  -- alguem ja tinha descartado.
  virou_lead_em timestamptz,
  lead_id       uuid references public.leads on delete set null,
  descartada_em timestamptz,
  descartada_por uuid references public.team_members on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger prospeccao_set_updated_at
  before update on public.prospeccao
  for each row execute function public.set_updated_at();

-- Os tres filtros da tela. Parcial em "ainda na fila" porque a consulta sempre
-- exclui o que ja foi decidido, e a fila e a minoria da tabela com o tempo.
create index if not exists prospeccao_fila_idx
  on public.prospeccao (cidade, cnae)
  where virou_lead_em is null and descartada_em is null;

create index if not exists prospeccao_cnae_idx
  on public.prospeccao (cnae text_pattern_ops);

alter table public.prospeccao enable row level security;

-- Leitura para a equipe: prospectar e o trabalho do comercial, nao do admin.
create policy prospeccao_select on public.prospeccao
  for select to authenticated using (true);

-- Marcar como importada ou descartada e decisao de quem esta trabalhando a
-- lista. A coleta tambem escreve por aqui, com a conta do robo.
create policy prospeccao_insert on public.prospeccao
  for insert to authenticated with check (true);

create policy prospeccao_update on public.prospeccao
  for update to authenticated using (true) with check (true);

-- Sem policy de DELETE, de proposito: ver o comentario de `descartada_em`.

-- SEM gatilho de auditoria, pela mesma razao de `activities` e `notificacoes`
-- estarem fora: a tabela ja e o proprio registro. Quem descartou e quando estao
-- em `descartada_por`/`descartada_em`, e o lead gerado em `lead_id`.
--
-- E o gatilho aqui seria ativamente nocivo: a coleta mensal grava milhares de
-- linhas de uma vez, e cada uma viraria uma entrada no log. O registro de quem
-- fez o que ficaria afogado em ruido de robo -- que e o oposto do que ele serve.

comment on table public.prospeccao is
  'Empresas levantadas do dump do CNPJ, ainda nao decididas. Alimenta Leads > Importar.';
comment on column public.prospeccao.competencia is
  'AAAA-MM do dump da Receita que trouxe a linha.';
