-- Video Editing Project Tracker schema
-- Run this file in a new Supabase project's SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.editors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'editor' check (role in ('admin', 'editor')),
  editor_id uuid unique references public.editors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null check (char_length(trim(project_name)) between 1 and 180),
  description text not null default '',
  editor_id uuid references public.editors(id) on delete set null,
  difficulty text not null check (difficulty in ('Easy', 'Hard')),
  price integer not null check (price in (350, 500)),
  status text not null default 'Not Started'
    check (status in ('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled')),
  created_at timestamptz not null default now(),
  due_date date,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists projects_editor_id_idx on public.projects(editor_id);
create index if not exists projects_status_idx on public.projects(status);
create index if not exists projects_created_at_idx on public.projects(created_at desc);
create index if not exists projects_completed_at_idx on public.projects(completed_at desc);

-- These SECURITY DEFINER functions perform role/profile lookup without recursive RLS.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.users u
    where u.id = (select auth.uid()) and u.role = 'admin'
  );
$$;

create or replace function public.my_editor_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select u.editor_id from public.users u where u.id = (select auth.uid()) limit 1;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.my_editor_id() from public;
grant execute on function public.my_editor_id() to authenticated;

-- Auth users are automatically given an editor-level application profile.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'editor'
  )
  on conflict (id) do update
    set email = excluded.email,
        name = case when public.users.name = '' then excluded.name else public.users.name end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_project_tracker on auth.users;
create trigger on_auth_user_created_project_tracker
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create or replace function public.sync_auth_user_email()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.users set email = coalesce(new.email, '') where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated_project_tracker on auth.users;
create trigger on_auth_user_updated_project_tracker
after update of email on auth.users
for each row execute procedure public.sync_auth_user_email();

create or replace function public.guard_user_profile_changes()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  if (select auth.uid()) is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.editor_id is distinct from old.editor_id
       or new.id is distinct from old.id
       or new.email is distinct from old.email then
      raise exception 'You may only update your own display name.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_user_profile_changes_trigger on public.users;
create trigger guard_user_profile_changes_trigger
before update on public.users
for each row execute procedure public.guard_user_profile_changes();

-- Price and completion dates are server/database-controlled values.
create or replace function public.apply_project_rules()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.difficulty not in ('Easy', 'Hard') then
    raise exception 'Difficulty must be Easy or Hard.';
  end if;

  new.price := case new.difficulty when 'Easy' then 350 when 'Hard' then 500 end;
  new.updated_at := now();

  if new.status = 'Completed' then
    if tg_op = 'INSERT' then
      new.completed_at := coalesce(new.completed_at, now());
    elsif old.status is distinct from new.status or old.completed_at is null then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  elsif tg_op = 'INSERT' or old.status = 'Completed' then
    new.completed_at := null;
  end if;

  -- Non-admin users can change status only. RLS also restricts them to assigned projects.
  if tg_op = 'UPDATE' and (select auth.uid()) is not null and not public.is_admin() then
    if new.project_name is distinct from old.project_name
       or new.description is distinct from old.description
       or new.editor_id is distinct from old.editor_id
       or new.difficulty is distinct from old.difficulty
       or new.created_at is distinct from old.created_at
       or new.due_date is distinct from old.due_date then
      raise exception 'Editors may only update project status.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists apply_project_rules_trigger on public.projects;
create trigger apply_project_rules_trigger
before insert or update on public.projects
for each row execute procedure public.apply_project_rules();

create or replace function public.prevent_editor_delete_with_history()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.projects p where p.editor_id = old.id) then
    raise exception 'This editor has project history. Deactivate the editor instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_editor_delete_with_history_trigger on public.editors;
create trigger prevent_editor_delete_with_history_trigger
before delete on public.editors
for each row execute procedure public.prevent_editor_delete_with_history();

alter table public.editors enable row level security;
alter table public.users enable row level security;
alter table public.projects enable row level security;

drop policy if exists "admins manage editors" on public.editors;
create policy "admins manage editors" on public.editors
for all to authenticated using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "editors read own editor record" on public.editors;
create policy "editors read own editor record" on public.editors
for select to authenticated using (id = (select public.my_editor_id()));

drop policy if exists "users read own profile or admins read all" on public.users;
create policy "users read own profile or admins read all" on public.users
for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "users update own profile or admins update all" on public.users;
create policy "users update own profile or admins update all" on public.users
for update to authenticated
using (id = (select auth.uid()) or (select public.is_admin()))
with check (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "admins insert profiles" on public.users;
create policy "admins insert profiles" on public.users
for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "users read allowed projects" on public.projects;
create policy "users read allowed projects" on public.projects
for select to authenticated
using ((select public.is_admin()) or editor_id = (select public.my_editor_id()));

drop policy if exists "admins or assigned editor update projects" on public.projects;
create policy "admins or assigned editor update projects" on public.projects
for update to authenticated
using ((select public.is_admin()) or editor_id = (select public.my_editor_id()))
with check ((select public.is_admin()) or editor_id = (select public.my_editor_id()));

drop policy if exists "admins insert projects" on public.projects;
create policy "admins insert projects" on public.projects
for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "admins delete projects" on public.projects;
create policy "admins delete projects" on public.projects
for delete to authenticated using ((select public.is_admin()));

grant select, insert, update, delete on public.editors to authenticated;
grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.projects to authenticated;

-- STEP: after you create your own account in Supabase Auth, promote your user:
-- update public.users set role = 'admin' where email = 'you@example.com';
