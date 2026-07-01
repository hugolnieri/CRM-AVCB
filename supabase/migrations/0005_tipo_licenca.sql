-- Tipo de licença do Corpo de Bombeiros: AVCB, CLCB ou TAACB.
alter table public.leads add column if not exists tipo_licenca text not null default 'AVCB';
