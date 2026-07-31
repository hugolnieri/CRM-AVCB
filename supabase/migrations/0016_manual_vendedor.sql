-- Manual do Vendedor: material de apoio para argumentar a venda de cada tipo
-- do catálogo. Pendurado em tipos_servico, não em tabela nova -- "NR-35" já
-- existe ali, e duplicar a entidade produziria duas fontes falando do mesmo
-- treinamento. O gatilho tipos_servico_audit (migration 0009) já cobre
-- qualquer coluna nova por diff automático.
alter table public.tipos_servico add column if not exists material_venda text;

comment on column public.tipos_servico.material_venda is
  'Argumentos de venda, script de abordagem e objeções comuns para o vendedor. Null = ainda sem material cadastrado (Manual do Vendedor mostra a lacuna).';
