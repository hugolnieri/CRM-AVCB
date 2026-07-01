-- Ordenação manual dos cards no Kanban. Maior position = mais ao topo da coluna.
-- Leads nunca movidos ficam com 0 e mantêm a ordem por data de criação.
alter table public.leads add column if not exists position double precision not null default 0;
