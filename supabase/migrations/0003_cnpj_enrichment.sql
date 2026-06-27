-- Enriquecimento opcional via CNPJ (dados públicos da Receita Federal / BrasilAPI).
alter table public.leads add column if not exists cnpj text;
alter table public.leads add column if not exists receita_data jsonb;
