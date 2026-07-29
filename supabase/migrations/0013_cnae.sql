-- CNAE: a atividade economica da empresa, e a regra que liga cada tipo de
-- servico as atividades em que ele faz sentido.
--
-- O ganho e o cadastro parar de depender de alguem saber de cor o que se vende
-- para cada ramo: informado o segmento do lead, o sistema ja sugere os servicos.
--
-- O catalogo guarda PREFIXOS, nao codigos completos, porque o CNAE e
-- hierarquico -- 41 e a divisao "Construcao de edificios", 41204 a classe,
-- 4120-4/00 a subclasse. Configurar "41" no NR-35 cobre a construcao inteira
-- sem cadastrar as centenas de subclasses embaixo. Ver lib/cnae.ts.

-- Codigo so com digitos, de 2 (divisao) a 7 (subclasse). Nao exige os 7 de
-- proposito: quem cadastra costuma saber o ramo e nao o codigo exato, e
-- recusar a divisao obrigaria a inventar digitos.
alter table public.leads    add column if not exists cnae text;
alter table public.clientes add column if not exists cnae text;

-- Nome da atividade no momento do cadastro. Redundante com o codigo de
-- proposito, pela mesma razao de `servicos.tipo_nome`: a tabela CNAE do IBGE e
-- revisada de tempos em tempos, e o que foi cadastrado como "Construcao de
-- Edificios" precisa continuar legivel mesmo que o codigo mude de significado.
-- Tambem evita depender do catalogo embutido para exibir uma lista.
alter table public.leads    add column if not exists cnae_descricao text;
alter table public.clientes add column if not exists cnae_descricao text;

-- Lista de prefixos. NULL ou vazio = o tipo nunca e sugerido automaticamente,
-- o que e o padrao correto: sugestao errada custa mais caro que sugestao
-- ausente.
alter table public.tipos_servico add column if not exists cnaes text[];

comment on column public.leads.cnae is
  'CNAE so com digitos, 2 a 7. Casado por prefixo contra tipos_servico.cnaes.';
comment on column public.tipos_servico.cnaes is
  'Prefixos de CNAE (so digitos, 2 a 7) em que este servico se aplica. Casamento por prefixo.';

-- Apoia o filtro do catalogo pelos tipos que tem regra de CNAE.
create index if not exists tipos_servico_cnaes_idx on public.tipos_servico using gin (cnaes);

-- Apoia "quais leads sao do segmento X", que e como o comercial pensa a
-- carteira. `text_pattern_ops` e o que faz o indice servir para LIKE 'prefixo%'.
create index if not exists leads_cnae_idx on public.leads (cnae text_pattern_ops)
  where cnae is not null;
