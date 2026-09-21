-- Phase 1 identity only. No marketplace entities or production seed data.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
revoke create on schema public from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (char_length(display_name) <= 100),
 created_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 200),
 created_at timestamptz not null default now()
);
-- Multiple roles and organizations per person; no global user.role column.
create table public.organization_memberships (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('MECHANIC','TECHNICIAN','SHOP_MANAGER','SHOP_OWNER')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 primary key (organization_id,user_id,role)
);
create index memberships_user_active on public.organization_memberships(user_id,organization_id) where active;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
revoke all on public.profiles,public.organizations,public.organization_memberships from public,anon,authenticated;
grant select on public.profiles,public.organizations,public.organization_memberships to authenticated;
grant update(display_name) on public.profiles to authenticated;
-- System provisioning is separate from the user-token Worker. No service key is used by the app.
grant all on public.profiles,public.organizations,public.organization_memberships to service_role;

create policy profile_read_self on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy profile_update_self on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy membership_read_self on public.organization_memberships for select to authenticated using ((select auth.uid())=user_id and active);
create policy organization_read_member on public.organizations for select to authenticated using (exists (
 select 1 from public.organization_memberships m where m.organization_id=organizations.id and m.user_id=(select auth.uid()) and m.active
));

-- Trigger-only definer with fixed search path. Never callable through the Data API.
create function private.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id) values (new.id);
 return new;
end;
$$;
revoke all on function private.create_profile() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.create_profile();
-- Safe if applied to a project with pre-existing identities; no privilege derived from metadata.
insert into public.profiles(id) select id from auth.users on conflict (id) do nothing;
