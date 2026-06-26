alter table public.team_members enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;

-- team_members: any authenticated team member can see the roster; only self can edit own row.
create policy team_members_select on public.team_members
  for select using (auth.uid() is not null);

create policy team_members_insert_self on public.team_members
  for insert with check (auth.uid() = id);

create policy team_members_update_self on public.team_members
  for update using (auth.uid() = id);

-- leads: team-shared model, not per-owner — any authenticated team member can
-- read/write any lead, since the pipeline is meant to be visible to everyone.
-- assigned_user_id is informational/filterable, not an access boundary.
create policy leads_select_team on public.leads
  for select using (auth.uid() is not null);

create policy leads_insert_team on public.leads
  for insert with check (auth.uid() is not null);

create policy leads_update_team on public.leads
  for update using (auth.uid() is not null);

-- No delete policy in v1: a lost deal moves to 'fechado_perdido', it isn't deleted.

create policy activities_select_team on public.activities
  for select using (auth.uid() is not null);

create policy activities_insert_team on public.activities
  for insert with check (auth.uid() is not null and author_id = auth.uid());
