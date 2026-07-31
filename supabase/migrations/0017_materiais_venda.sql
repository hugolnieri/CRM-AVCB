-- Arquivos do Manual do Vendedor: o material de apoio que a empresa já produziu
-- em PDF/DOCX, anexado ao tipo do catálogo.
--
-- Convive com `tipos_servico.material_venda` (texto) em vez de substituí-lo, e
-- os dois têm papéis distintos: o texto é o script curto que o vendedor lê na
-- tela antes de ligar; o arquivo é a apostila/apresentação pronta, que ele abre
-- ou reenvia. Trocar um pelo outro obrigaria a abrir um PDF para lembrar de uma
-- objeção -- ou a redigitar uma apostila inteira numa textarea.

-- --- onde os arquivos ficam ------------------------------------------------
--
-- Bucket **privado**: material de venda é interno, e um bucket público serve o
-- arquivo a quem tiver a URL, sem passar por sessão nenhuma. A leitura é feita
-- por URL assinada de vida curta.
--
-- O limite de tamanho e a lista de tipos são impostos aqui, e não só na tela:
-- validação de formulário é conveniência, o bucket é a barreira -- qualquer um
-- pode chamar a API de storage direto do console.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'material-venda',
  'material-venda',
  false,
  20971520, -- 20 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

-- Quem lê é qualquer pessoa logada; quem escreve é admin, exatamente como o
-- resto do catálogo (o material de venda é mantido junto com o tipo).
create policy material_venda_select on storage.objects
  for select to authenticated
  using (bucket_id = 'material-venda');

create policy material_venda_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'material-venda' and (select public.is_admin()));

create policy material_venda_update on storage.objects
  for update to authenticated
  using (bucket_id = 'material-venda' and (select public.is_admin()))
  with check (bucket_id = 'material-venda' and (select public.is_admin()));

create policy material_venda_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'material-venda' and (select public.is_admin()));

-- --- o índice dos arquivos --------------------------------------------------
--
-- A tabela existe porque `storage.objects` não guarda o nome original nem a
-- qual tipo o arquivo pertence de um jeito consultável junto com o catálogo. O
-- caminho no bucket é gerado (uuid), então o nome legível vive aqui.
create table public.materiais_venda (
  id              uuid primary key default gen_random_uuid(),
  tipo_servico_id uuid not null references public.tipos_servico(id) on delete cascade,
  -- Nome como o admin subiu: "Apostila NR-35 2026.pdf". O caminho no bucket é
  -- um uuid justamente para acento e barra no nome do arquivo não virarem
  -- chave de storage.
  nome            text not null,
  caminho         text not null unique,
  tamanho_bytes   bigint,
  mime            text,
  created_by      uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now()
);

create index materiais_venda_tipo_idx on public.materiais_venda (tipo_servico_id);

alter table public.materiais_venda enable row level security;

create policy materiais_venda_select on public.materiais_venda
  for select to authenticated using (true);

create policy materiais_venda_insert on public.materiais_venda
  for insert to authenticated with check ((select public.is_admin()));

-- Sem policy de UPDATE de propósito: renomear a linha sem mexer no arquivo
-- faria a tela mentir sobre o que vai ser baixado. Trocar material é excluir e
-- subir de novo.
create policy materiais_venda_delete on public.materiais_venda
  for delete to authenticated using ((select public.is_admin()));

create trigger materiais_venda_audit
  after insert or update or delete on public.materiais_venda
  for each row execute function public.registrar_audit();

comment on table public.materiais_venda is
  'Arquivos de apoio à venda (PDF/DOCX/PPTX) anexados a um tipo do catálogo. O binário vive no bucket privado material-venda; aqui fica o nome legível e o vínculo com o tipo.';
