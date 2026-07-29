-- CNAE: a atividade economica da empresa, e a regra que liga cada tipo de
-- servico as atividades em que ele faz sentido.
--
-- O ganho e o cadastro parar de depender de alguem saber de cor o que se vende
-- para cada ramo: informado o CNAE do lead, o sistema ja sugere os servicos.
--
-- O catalogo guarda PREFIXOS, nao codigos completos, porque o CNAE e
-- hierarquico -- 41 e a divisao "Construcao de edificios", 4120 a classe,
-- 4120-4/00 a subclasse. Configurar "41" no NR-35 cobre a construcao inteira
-- sem cadastrar as centenas de subclasses embaixo. Ver lib/cnae.ts.

alter table public.leads    add column if not exists cnae text;
alter table public.clientes add column if not exists cnae text;

-- Lista de prefixos. NULL ou vazio = o tipo nunca e sugerido automaticamente,
-- o que e o padrao correto: sugestao errada custa mais caro que sugestao
-- ausente.
alter table public.tipos_servico add column if not exists cnaes text[];

comment on column public.tipos_servico.cnaes is
  'Prefixos de CNAE (so digitos, 2 a 7) em que este servico se aplica. Casamento por prefixo.';

-- Indice de apoio para filtrar o catalogo pelos tipos que tem regra.
create index if not exists tipos_servico_cnaes_idx on public.tipos_servico using gin (cnaes);
