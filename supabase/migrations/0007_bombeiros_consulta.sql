-- Guarda o resultado da última consulta de AVCB/CLCB via API (Infosimples).
alter table public.leads add column if not exists bombeiros_consulta jsonb;
