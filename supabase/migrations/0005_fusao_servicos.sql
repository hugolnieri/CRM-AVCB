-- Funde treinamentos e servicos numa entidade so, e introduz compromisso futuro.
--
-- Por que: treinamento E um servico prestado. Manter as duas tabelas obrigava a
-- duplicar formulario, tabela, hook, query e a normalizar os dois formatos em
-- lib/vencimentos.ts so para a UI tratar como a mesma coisa. Agora a diferenca
-- entre "NR-35" e "laudo de insalubridade" e a `categoria` do tipo, nao a tabela.
--
-- Alem disso o modelo antigo nao admitia agendamento: `data_realizacao` era NOT
-- NULL, entao so cabia registrar o que ja tinha acontecido. Agora um servico
-- nasce `agendado` (com data e hora) e vira `realizado` (com data) ao concluir.
--
-- Drop e recreate em vez de ALTER porque o banco esta sem nenhum dado
-- operacional (0 treinamentos, 0 servicos) -- conferido antes de escrever isto.

create type servico_status as enum ('agendado', 'realizado', 'cancelado');

-- ---------------------------------------------------------------------------
-- Catalogo unico
-- ---------------------------------------------------------------------------

create table public.tipos_servico (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null unique,
  sigla          text,
  -- Separa o que e treinamento normativo do que e servico tecnico. Controla
  -- quais campos o formulario mostra (participantes/instrutor so em treinamento)
  -- e permite quebrar relatorio por natureza do trabalho.
  categoria      text not null default 'treinamento'
                 check (categoria in ('treinamento', 'servico')),
  -- Preservado da antiga tipos_treinamento: e o que permite sugerir
  -- data_vencimento = data_realizacao + validade_meses. NULL = nao vence.
  validade_meses integer check (validade_meses is null or validade_meses > 0),
  carga_horaria  integer,
  ativo          boolean not null default true,
  ordem          integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Fora o modelo antigo (ordem importa: FKs)
-- ---------------------------------------------------------------------------

drop table if exists public.treinamentos;
drop table if exists public.servicos;
drop table if exists public.tipos_treinamento;

-- ---------------------------------------------------------------------------
-- servicos unificado
-- ---------------------------------------------------------------------------

create table public.servicos (
  id              uuid primary key default gen_random_uuid(),
  cliente_id      uuid not null references public.clientes(id) on delete cascade,
  -- restrict: tipo ja usado nao pode ser apagado; desative com ativo = false.
  tipo_servico_id uuid references public.tipos_servico(id) on delete restrict,
  -- Snapshot do nome no momento do registro. Servicos lastreiam certificados
  -- emitidos: renomear o tipo no catalogo NAO pode reescrever o historico.
  tipo_nome       text not null,
  status          servico_status not null default 'realizado',
  -- Compromisso: timestamptz porque tem hora marcada de verdade.
  data_agendada   timestamptz,
  -- Fato consumado: date puro, sem hora nem fuso (ver AGENTS.md sobre datas).
  data_realizacao date,
  data_vencimento date,
  participantes   integer check (participantes is null or participantes >= 0),
  instrutor       text,
  responsavel_id  uuid references public.team_members(id) on delete set null,
  observacoes     text,
  created_by      uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- O status manda em qual data e obrigatoria. Sem isto daria para ter um
  -- "agendado" sem quando, ou um "realizado" sem data, e a agenda e o controle
  -- de vencimentos ficariam com buracos silenciosos.
  constraint servicos_datas_por_status check (
    (status = 'agendado'  and data_agendada   is not null) or
    (status = 'realizado' and data_realizacao is not null) or
    (status = 'cancelado')
  ),
  constraint servicos_vencimento_apos_realizacao check (
    data_vencimento is null
    or data_realizacao is null
    or data_vencimento >= data_realizacao
  )
);

create index servicos_cliente_idx    on public.servicos (cliente_id);
create index servicos_status_idx     on public.servicos (status);
create index servicos_agendada_idx   on public.servicos (data_agendada)
  where data_agendada is not null;
create index servicos_realizacao_idx on public.servicos (data_realizacao desc)
  where data_realizacao is not null;
create index servicos_vencimento_idx on public.servicos (data_vencimento)
  where data_vencimento is not null;

create trigger servicos_set_updated_at before update on public.servicos
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Possiveis servicos em lead e cliente
-- ---------------------------------------------------------------------------

-- Array de nomes de tipo (nao FK): e uma intencao comercial, nao um vinculo
-- referencial. Guardar o nome mantem a anotacao legivel mesmo se o tipo for
-- renomeado ou desativado depois, na mesma logica do snapshot de tipo_nome.
alter table public.leads    add column possiveis_servicos text[];
alter table public.clientes add column possiveis_servicos text[];

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.tipos_servico enable row level security;
alter table public.servicos      enable row level security;

create policy tipos_servico_select on public.tipos_servico
  for select to authenticated using (true);
create policy tipos_servico_insert_admin on public.tipos_servico
  for insert to authenticated with check ((select public.is_admin()));
create policy tipos_servico_update_admin on public.tipos_servico
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy tipos_servico_delete_admin on public.tipos_servico
  for delete to authenticated using ((select public.is_admin()));

create policy servicos_select on public.servicos for select to authenticated using (true);
create policy servicos_insert on public.servicos for insert to authenticated with check (true);
create policy servicos_update on public.servicos for update to authenticated using (true) with check (true);
create policy servicos_delete_admin on public.servicos for delete to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Catalogo inicial
-- ---------------------------------------------------------------------------

-- ATENCAO: validade_meses aqui e ponto de partida, nao assessoria juridica.
-- Algumas periodicidades vem do texto da norma (NR-10 bienal, NR-33 anual,
-- NR-35 bienal, NR-20 basico trienal); outras sao pratica de mercado porque a
-- norma nao fixa prazo. Confira e ajuste em /admin > Tipos de servico.
insert into public.tipos_servico (nome, sigla, categoria, validade_meses, carga_horaria, ordem) values
  ('Trabalho em Altura',                          'NR-35',     'treinamento', 24, 8,  10),
  ('Espacos Confinados',                          'NR-33',     'treinamento', 12, 16, 20),
  ('Seguranca em Instalacoes e Servicos em Eletricidade', 'NR-10', 'treinamento', 24, 40, 30),
  ('Sistema Eletrico de Potencia (SEP)',          'NR-10 SEP', 'treinamento', 24, 40, 40),
  ('Seguranca em Maquinas e Equipamentos',        'NR-12',     'treinamento', 24, 8,  50),
  ('Operacao de Empilhadeira',                    'NR-11',     'treinamento', 12, 16, 60),
  ('Movimentacao de Materiais',                   'NR-11',     'treinamento', 12, 8,  70),
  ('Inflamaveis e Combustiveis - Basico',         'NR-20',     'treinamento', 36, 8,  80),
  ('Inflamaveis e Combustiveis - Intermediario',  'NR-20',     'treinamento', 24, 16, 90),
  ('Inflamaveis e Combustiveis - Avancado I',     'NR-20',     'treinamento', 24, 20, 100),
  ('CIPA',                                        'NR-05',     'treinamento', 12, 20, 110),
  ('Brigada de Incendio',                         'NR-23',     'treinamento', 12, 16, 120),
  ('Primeiros Socorros',                          null,        'treinamento', 12, 8,  130),
  ('Trabalho na Industria da Construcao',         'NR-18',     'treinamento', null, 6, 140),
  ('Trabalho a Quente',                           'NR-34',     'treinamento', 12, 8,  150),
  ('Equipamento de Protecao Individual',          'NR-06',     'treinamento', null, 4, 160),
  ('Ergonomia',                                   'NR-17',     'treinamento', null, 4, 170),
  ('Integracao de Seguranca do Trabalho',         null,        'treinamento', null, 2, 180),
  -- Servicos tecnicos: sem carga horaria, alguns com validade legal propria.
  ('Laudo de Insalubridade',                      null,        'servico',     12, null, 200),
  ('Laudo de Periculosidade',                     null,        'servico',     12, null, 210),
  ('PGR - Programa de Gerenciamento de Riscos',   'NR-01',     'servico',     24, null, 220),
  ('PCMSO - Controle Medico de Saude Ocupacional', 'NR-07',    'servico',     12, null, 230),
  ('LTCAT',                                       null,        'servico',     12, null, 240),
  ('Manutencao de Extintores',                    null,        'servico',     12, null, 250),
  ('Inspecao de Mangueiras de Incendio',          null,        'servico',     12, null, 260),
  ('Acompanhamento de Atividade de Risco',        null,        'servico',     null, null, 270),
  ('Operacao de Maquinario Pesado',               null,        'servico',     null, null, 280)
on conflict (nome) do nothing;
