-- ============================================================
-- Roll — group decision engine schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- groups ----------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  code text not null unique check (code ~ '^[A-Z0-9]{5}$'),
  category text not null default 'movies_series',
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists group_members_group_idx on public.group_members (group_id);

-- ---------- items ----------
-- Generic item model: movies today, restaurants/games/travel tomorrow.
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('movie', 'series', 'restaurant', 'food')),
  title text not null check (char_length(title) between 1 and 300),
  normalized_title text not null,
  external_id text,
  external_source text,
  metadata jsonb,
  status text not null default 'want' check (status in ('want', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists items_group_owner_idx on public.items (group_id, owner_id);
create index if not exists items_group_type_idx on public.items (group_id, type);
-- One copy of a given thing per owner per group (duplicate detection).
create unique index if not exists items_owner_text_unique
  on public.items (group_id, owner_id, type, normalized_title)
  where external_id is null;
create unique index if not exists items_owner_external_unique
  on public.items (group_id, owner_id, external_source, external_id)
  where external_id is not null;

-- ---------- decisions ----------
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  type text not null,
  mode text not null check (mode in ('pure_random', 'balanced_random', 'head_to_head', 'mutual_match', 'auto')),
  status text not null default 'active' check (status in ('active', 'complete', 'abandoned')),
  winner_item_id uuid references public.items (id) on delete set null,
  metadata jsonb,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists decisions_group_idx on public.decisions (group_id, created_at desc);

create table if not exists public.decision_participants (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  unique (decision_id, user_id)
);

create table if not exists public.decision_candidates (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  round int not null default 1
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references public.decisions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  candidate_id uuid not null references public.decision_candidates (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Helper functions (security definer to avoid recursive RLS)
-- ============================================================

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- Create a group with a unique, unambiguous 5-character code.
create or replace function public.create_group(p_name text, p_category text default 'movies_series')
returns public.groups
language plpgsql
security definer set search_path = public
as $$
declare
  -- No O/0, I/1/L: easy to read out loud and type on a phone.
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  new_code text;
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  loop
    new_code := '';
    for i in 1..5 loop
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where code = new_code);
  end loop;

  insert into public.groups (name, code, category, created_by)
  values (trim(p_name), new_code, p_category, auth.uid())
  returning * into g;

  insert into public.group_members (group_id, user_id)
  values (g.id, auth.uid());

  return g;
end;
$$;

-- Join a group by its code (case-insensitive). Returns the group id.
create or replace function public.join_group(p_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select id into gid
  from public.groups
  where code = upper(trim(p_code));

  if gid is null then
    raise exception 'GROUP_NOT_FOUND';
  end if;

  insert into public.group_members (group_id, user_id)
  values (gid, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return gid;
end;
$$;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.items enable row level security;
alter table public.decisions enable row level security;
alter table public.decision_participants enable row level security;
alter table public.decision_candidates enable row level security;
alter table public.votes enable row level security;

-- profiles: any signed-in user can read display names/avatars
-- (needed to render group member lists); only you can change yours.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- groups: readable only by members; created via create_group RPC;
-- editable by the creator (settings/name).
drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
  for select to authenticated using (public.is_group_member(id));

drop policy if exists "groups_update_creator" on public.groups;
create policy "groups_update_creator" on public.groups
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "groups_delete_creator" on public.groups;
create policy "groups_delete_creator" on public.groups
  for delete to authenticated using (created_by = auth.uid());

-- group_members: members can see the roster; you can leave yourself;
-- the group creator can remove members. Joining goes through join_group.
drop policy if exists "members_select" on public.group_members;
create policy "members_select" on public.group_members
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "members_delete_self_or_admin" on public.group_members;
create policy "members_delete_self_or_admin" on public.group_members
  for delete to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid())
  );

-- items: readable by group members; writable only by their owner
-- (who must be a member of the group).
drop policy if exists "items_select_member" on public.items;
create policy "items_select_member" on public.items
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
  for insert to authenticated
  with check (owner_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own" on public.items
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own" on public.items
  for delete to authenticated using (owner_id = auth.uid());

-- decisions: readable by members; any member can start one;
-- only the creator can update it, and completed decisions are frozen.
drop policy if exists "decisions_select_member" on public.decisions;
create policy "decisions_select_member" on public.decisions
  for select to authenticated using (public.is_group_member(group_id));

drop policy if exists "decisions_insert_member" on public.decisions;
create policy "decisions_insert_member" on public.decisions
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_group_member(group_id));

drop policy if exists "decisions_update_creator_active" on public.decisions;
create policy "decisions_update_creator_active" on public.decisions
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "decisions_delete_creator" on public.decisions;
create policy "decisions_delete_creator" on public.decisions
  for delete to authenticated using (created_by = auth.uid());

-- Freeze completed decisions against edits (defense in depth).
create or replace function public.prevent_completed_decision_edits()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'complete' and new.status = 'complete' then
    raise exception 'Completed decisions cannot be modified';
  end if;
  return new;
end;
$$;

drop trigger if exists decisions_freeze_completed on public.decisions;
create trigger decisions_freeze_completed
  before update on public.decisions
  for each row execute function public.prevent_completed_decision_edits();

-- decision_participants / candidates: readable by members,
-- written by the decision creator.
drop policy if exists "participants_select" on public.decision_participants;
create policy "participants_select" on public.decision_participants
  for select to authenticated using (
    exists (
      select 1 from public.decisions d
      where d.id = decision_id and public.is_group_member(d.group_id)
    )
  );

drop policy if exists "participants_insert" on public.decision_participants;
create policy "participants_insert" on public.decision_participants
  for insert to authenticated with check (
    exists (
      select 1 from public.decisions d
      where d.id = decision_id and d.created_by = auth.uid()
    )
  );

drop policy if exists "candidates_select" on public.decision_candidates;
create policy "candidates_select" on public.decision_candidates
  for select to authenticated using (
    exists (
      select 1 from public.decisions d
      where d.id = decision_id and public.is_group_member(d.group_id)
    )
  );

drop policy if exists "candidates_insert" on public.decision_candidates;
create policy "candidates_insert" on public.decision_candidates
  for insert to authenticated with check (
    exists (
      select 1 from public.decisions d
      where d.id = decision_id and d.created_by = auth.uid()
    )
  );

-- votes: only participants of the decision can vote, and only as
-- themselves. Nobody can cast a vote as another user.
drop policy if exists "votes_select" on public.votes;
create policy "votes_select" on public.votes
  for select to authenticated using (
    exists (
      select 1 from public.decisions d
      where d.id = decision_id and public.is_group_member(d.group_id)
    )
  );

drop policy if exists "votes_insert_self_participant" on public.votes;
create policy "votes_insert_self_participant" on public.votes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.decision_participants p
      where p.decision_id = decision_id and p.user_id = auth.uid()
    )
  );
