-- Catálogo inicial de tipos de treinamento.
--
-- ATENÇÃO — validade_meses aqui é um PONTO DE PARTIDA, não assessoria jurídica.
-- Algumas periodicidades vêm do texto da própria NR (NR-10 bienal, NR-33 anual,
-- NR-35 bienal, NR-20 básico trienal); outras são prática de mercado porque a
-- norma não fixa prazo (NR-06, NR-11, primeiros socorros). Confira contra a
-- redação vigente e ajuste em /admin > Tipos de treinamento — a tela existe
-- justamente para isso, e mudar aqui não altera treinamentos já registrados
-- (treinamentos.tipo_nome e data_vencimento são snapshots).
--
-- validade_meses NULL = não vence; o registro não aparece no controle de
-- vencimentos e a data de vencimento fica opcional no formulário.

insert into public.tipos_treinamento (nome, sigla, validade_meses, carga_horaria, ordem) values
  ('Trabalho em Altura',                          'NR-35', 24, 8,  10),
  ('Espaços Confinados',                          'NR-33', 12, 16, 20),
  ('Segurança em Instalações e Serviços em Eletricidade', 'NR-10', 24, 40, 30),
  ('Sistema Elétrico de Potência (SEP)',          'NR-10 SEP', 24, 40, 40),
  ('Segurança no Trabalho em Máquinas e Equipamentos', 'NR-12', 24, 8, 50),
  ('Operação de Empilhadeira',                    'NR-11', 12, 16, 60),
  ('Movimentação de Materiais',                   'NR-11', 12, 8,  70),
  ('Inflamáveis e Combustíveis - Básico',         'NR-20', 36, 8,  80),
  ('Inflamáveis e Combustíveis - Intermediário',  'NR-20', 24, 16, 90),
  ('Inflamáveis e Combustíveis - Avançado I',     'NR-20', 24, 20, 100),
  ('CIPA',                                        'NR-05', 12, 20, 110),
  ('Brigada de Incêndio',                         'NR-23', 12, 16, 120),
  ('Primeiros Socorros',                          null,    12, 8,  130),
  ('Trabalho na Indústria da Construção',         'NR-18', null, 6, 140),
  ('Trabalho a Quente',                           'NR-34', 12, 8,  150),
  ('Equipamento de Proteção Individual',          'NR-06', null, 4, 160),
  ('Ergonomia',                                   'NR-17', null, 4, 170),
  ('Integração de Segurança do Trabalho',         null,    null, 2, 180)
on conflict (nome) do nothing;
