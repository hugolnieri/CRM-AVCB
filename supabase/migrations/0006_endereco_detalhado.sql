-- Endereço detalhado e editável (logradouro, número, bairro, cidade, UF, CEP).
alter table public.leads add column if not exists endereco_detalhado jsonb;
