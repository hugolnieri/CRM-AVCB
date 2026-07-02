-- Follow-up: data/hora do próximo retorno agendado para o lead + nota curta.
alter table public.leads add column if not exists follow_up_at timestamptz;
alter table public.leads add column if not exists follow_up_note text;
