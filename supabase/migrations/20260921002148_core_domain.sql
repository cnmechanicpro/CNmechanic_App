-- Phase 2 canonical core domain. No discovery, scheduling, pricing, payments or seed businesses.
alter table public.organizations
  add column legal_name text,
  add column slug text,
  add column description text,
  add column organization_type text not null default 'OTHER' check (organization_type in ('REPAIR_SHOP','MOBILE_MECHANIC','DEALERSHIP','SPECIALTY_SHOP','SERVICE_NETWORK','OTHER')),
  add column status text not null default 'ACTIVE' check (status in ('DISCOVERED','UNCLAIMED','CLAIM_PENDING','CLAIMED','VERIFICATION_PENDING','CN_VERIFIED','ACTIVE','INACTIVE','ARCHIVED','SUSPENDED','CLOSED','REMOVED')),
  add column updated_at timestamptz not null default now();
update public.organizations set legal_name = name, slug = 'org-' || substring(id::text from 1 for 8) where legal_name is null or slug is null;
alter table public.organizations alter column legal_name set not null;
alter table public.organizations alter column slug set not null;
alter table public.organizations add constraint organizations_slug_unique unique (slug);
alter table public.organizations add constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
alter table public.organizations add constraint organizations_description_length check (description is null or char_length(description) <= 4000);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  location_type text not null check (location_type in ('STOREFRONT','MOBILE','SERVICE_AREA')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED','SUSPENDED','CLOSED')),
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code char(2) not null default 'US' check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  public_phone text check (public_phone is null or char_length(public_phone) <= 30),
  public_email text check (public_email is null or char_length(public_email) <= 254),
  timezone text not null default 'America/New_York' check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  check ((latitude is null) = (longitude is null)),
  check (location_type <> 'STOREFRONT' or (address_line_1 is not null and city is not null and region is not null and postal_code is not null))
);
create index locations_organization_status_idx on public.locations(organization_id, status);

create table public.professional_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  public_name text check (public_name is null or char_length(public_name) between 1 and 100),
  headline text check (headline is null or char_length(headline) <= 160),
  biography text check (biography is null or char_length(biography) <= 4000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED','SUSPENDED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.professional_location_assignments (
  profile_id uuid not null references public.professional_profiles(profile_id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, location_id)
);
create index professional_location_assignments_location_idx on public.professional_location_assignments(location_id, profile_id);

create table private.platform_role_assignments (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('CN_SUPPORT','CN_VERIFICATION_AGENT','CN_ADMIN','SUPER_ADMIN')),
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create table public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);
create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  start_year smallint check (start_year between 1886 and 2200),
  end_year smallint check (end_year between 1886 and 2200),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (make_id, slug),
  check (end_year is null or start_year is null or end_year >= start_year)
);
create index vehicle_models_make_status_idx on public.vehicle_models(make_id, status);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vin text unique check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  model_id uuid not null references public.vehicle_models(id) on delete restrict,
  model_year smallint not null check (model_year between 1886 and 2200),
  trim text check (trim is null or char_length(trim) <= 100),
  engine_description text check (engine_description is null or char_length(engine_description) <= 200),
  propulsion_type text not null check (propulsion_type in ('ICE_GASOLINE','ICE_DIESEL','HYBRID','PLUG_IN_HYBRID','BATTERY_ELECTRIC','FUEL_CELL','OTHER')),
  drivetrain text check (drivetrain is null or drivetrain in ('FWD','RWD','AWD','FOUR_WD','OTHER')),
  transmission_type text check (transmission_type is null or transmission_type in ('AUTOMATIC','MANUAL','CVT','DCT','SINGLE_SPEED','OTHER')),
  mileage integer check (mileage is null or mileage >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED','SALVAGED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.vehicle_ownerships (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  ownership_status text not null default 'CURRENT' check (ownership_status in ('PENDING','CURRENT','FORMER')),
  ownership_started_at timestamptz not null default now(),
  ownership_ended_at timestamptz,
  source_type text not null default 'OWNER_DECLARED' check (source_type in ('OWNER_DECLARED','ORGANIZATION_VERIFIED','EXTERNAL_VERIFIED','TRANSFERRED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vehicle_id, owner_profile_id, ownership_started_at),
  check ((ownership_status = 'FORMER') = (ownership_ended_at is not null)),
  check (ownership_ended_at is null or ownership_ended_at >= ownership_started_at)
);
create index vehicle_ownerships_owner_current_idx on public.vehicle_ownerships(owner_profile_id, vehicle_id) where ownership_status = 'CURRENT';
create index vehicle_ownerships_vehicle_idx on public.vehicle_ownerships(vehicle_id, ownership_started_at desc);
create unique index vehicle_ownerships_one_current_owner_idx on public.vehicle_ownerships(vehicle_id) where ownership_status = 'CURRENT';

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 150),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_category_status_idx on public.services(category_id, status);
create table public.service_vehicle_makes (
  service_id uuid not null references public.services(id) on delete cascade,
  vehicle_make_id uuid not null references public.vehicle_makes(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (service_id, vehicle_make_id)
);
create table public.organization_services (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, service_id)
);
create index organization_services_service_idx on public.organization_services(service_id, organization_id) where status = 'ACTIVE';
create table public.location_services (
  location_id uuid not null references public.locations(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (location_id, service_id)
);
create index location_services_service_idx on public.location_services(service_id, location_id) where status = 'ACTIVE';

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','CANCELLED','CLOSED')),
  customer_note text check (customer_note is null or char_length(customer_note) <= 2000),
  submitted_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'SUBMITTED') = (submitted_at is not null)),
  check ((status = 'CLOSED') = (closed_at is not null))
);
create index service_requests_customer_idx on public.service_requests(customer_profile_id, created_at desc);
create index service_requests_vehicle_idx on public.service_requests(vehicle_id, created_at desc);
create index service_requests_organization_idx on public.service_requests(organization_id, created_at desc);

create function private.set_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create function private.has_active_membership(p_organization_id uuid, p_roles text[] default null) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_memberships m where m.organization_id = p_organization_id and m.user_id = (select auth.uid()) and m.active and (p_roles is null or m.role = any(p_roles)));
$$;
create function private.is_cn_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.platform_role_assignments r where r.profile_id = (select auth.uid()) and r.role in ('CN_ADMIN','SUPER_ADMIN'));
$$;
create function private.organization_offers_service(p_organization_id uuid, p_location_id uuid, p_service_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organization_services os where os.organization_id=p_organization_id and os.service_id=p_service_id and os.status='ACTIVE')
    and (p_location_id is null or exists (select 1 from public.locations l join public.location_services ls on ls.location_id=l.id where l.id=p_location_id and l.organization_id=p_organization_id and ls.service_id=p_service_id and ls.status='ACTIVE'));
$$;
create function private.can_access_vehicle(p_vehicle_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.vehicle_ownerships o where o.vehicle_id=p_vehicle_id and o.owner_profile_id=(select auth.uid()) and o.ownership_status='CURRENT')
    or exists (select 1 from public.service_requests r where r.vehicle_id=p_vehicle_id and private.has_active_membership(r.organization_id, null))
    or private.is_cn_admin();
$$;
create function public.create_vehicle_with_owner(p_model_id uuid, p_model_year smallint, p_trim text, p_engine_description text, p_propulsion_type text, p_drivetrain text, p_transmission_type text, p_mileage integer, p_vin text default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode='42501'; end if;
  insert into public.vehicles(vin,model_id,model_year,trim,engine_description,propulsion_type,drivetrain,transmission_type,mileage)
  values (p_vin,p_model_id,p_model_year,p_trim,p_engine_description,p_propulsion_type,p_drivetrain,p_transmission_type,p_mileage) returning id into v_id;
  insert into public.vehicle_ownerships(vehicle_id,owner_profile_id) values (v_id,(select auth.uid()));
  return v_id;
end;
$$;
create function private.validate_professional_location_assignment() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if not exists (select 1 from public.locations l join public.organization_memberships m on m.organization_id=l.organization_id where l.id=new.location_id and m.user_id=new.profile_id and m.active) then raise exception 'professional must belong to location organization' using errcode='23514'; end if;
 return new;
end;
$$;
create function private.validate_service_request() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.location_id is not null and not exists (select 1 from public.locations where id=new.location_id and organization_id=new.organization_id) then raise exception 'location does not belong to organization' using errcode='23514'; end if;
 if tg_op = 'UPDATE' then
   if new.customer_profile_id <> old.customer_profile_id or new.vehicle_id <> old.vehicle_id or new.organization_id <> old.organization_id or new.location_id is distinct from old.location_id or new.service_id <> old.service_id then raise exception 'service request relationships are immutable' using errcode='23514'; end if;
   if not ((old.status='DRAFT' and new.status in ('DRAFT','SUBMITTED','CANCELLED')) or (old.status='SUBMITTED' and new.status in ('SUBMITTED','CANCELLED','CLOSED')) or (old.status in ('CANCELLED','CLOSED') and new.status=old.status)) then raise exception 'invalid service request transition' using errcode='23514'; end if;
 end if;
 if new.status='SUBMITTED' and new.submitted_at is null then new.submitted_at=now(); end if;
 if new.status='CLOSED' and new.closed_at is null then new.closed_at=now(); end if;
 return new;
end;
$$;
revoke all on function private.set_updated_at(), private.has_active_membership(uuid,text[]), private.is_cn_admin(), private.organization_offers_service(uuid,uuid,uuid), private.can_access_vehicle(uuid), private.validate_professional_location_assignment(), private.validate_service_request(), public.create_vehicle_with_owner(uuid,smallint,text,text,text,text,text,integer,text) from public, anon, authenticated;
grant execute on function private.has_active_membership(uuid,text[]), private.is_cn_admin(), private.organization_offers_service(uuid,uuid,uuid), private.can_access_vehicle(uuid), public.create_vehicle_with_owner(uuid,smallint,text,text,text,text,text,integer,text) to authenticated;

create trigger organizations_updated_at before update on public.organizations for each row execute function private.set_updated_at();
create trigger locations_updated_at before update on public.locations for each row execute function private.set_updated_at();
create trigger professional_profiles_updated_at before update on public.professional_profiles for each row execute function private.set_updated_at();
create trigger vehicle_makes_updated_at before update on public.vehicle_makes for each row execute function private.set_updated_at();
create trigger vehicle_models_updated_at before update on public.vehicle_models for each row execute function private.set_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute function private.set_updated_at();
create trigger vehicle_ownerships_updated_at before update on public.vehicle_ownerships for each row execute function private.set_updated_at();
create trigger service_categories_updated_at before update on public.service_categories for each row execute function private.set_updated_at();
create trigger services_updated_at before update on public.services for each row execute function private.set_updated_at();
create trigger organization_services_updated_at before update on public.organization_services for each row execute function private.set_updated_at();
create trigger location_services_updated_at before update on public.location_services for each row execute function private.set_updated_at();
create trigger service_requests_validate before insert or update on public.service_requests for each row execute function private.validate_service_request();
create trigger service_requests_set_updated_at before update on public.service_requests for each row execute function private.set_updated_at();
create trigger professional_location_assignment_validate before insert or update on public.professional_location_assignments for each row execute function private.validate_professional_location_assignment();

alter table public.locations enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_location_assignments enable row level security;
alter table private.platform_role_assignments enable row level security;
alter table public.vehicle_makes enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_ownerships enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_vehicle_makes enable row level security;
alter table public.organization_services enable row level security;
alter table public.location_services enable row level security;
alter table public.service_requests enable row level security;
revoke all on public.locations, public.professional_profiles, public.professional_location_assignments, public.vehicle_makes, public.vehicle_models, public.vehicles, public.vehicle_ownerships, public.service_categories, public.services, public.service_vehicle_makes, public.organization_services, public.location_services, public.service_requests from public, anon, authenticated;
revoke all on private.platform_role_assignments from public, anon, authenticated;
grant select on public.organizations, public.locations, public.professional_profiles, public.professional_location_assignments, public.vehicles, public.vehicle_ownerships, public.organization_services, public.location_services, public.service_requests to authenticated;
grant select on public.vehicle_makes, public.vehicle_models, public.service_categories, public.services, public.service_vehicle_makes to anon, authenticated;
grant insert, update, delete on public.locations, public.professional_profiles, public.professional_location_assignments, public.organization_services, public.location_services to authenticated;
grant insert on public.service_requests to authenticated;
grant update(status, customer_note) on public.service_requests to authenticated;
grant all on public.locations, public.professional_profiles, public.professional_location_assignments, private.platform_role_assignments, public.vehicle_makes, public.vehicle_models, public.vehicles, public.vehicle_ownerships, public.service_categories, public.services, public.service_vehicle_makes, public.organization_services, public.location_services, public.service_requests to service_role;

create policy organization_read_member_or_admin on public.organizations for select to authenticated using (private.has_active_membership(id,null) or private.is_cn_admin());
create policy locations_read_member_or_admin on public.locations for select to authenticated using (private.has_active_membership(organization_id,null) or private.is_cn_admin());
create policy locations_manage_owner_manager on public.locations for all to authenticated using (private.has_active_membership(organization_id,array['SHOP_OWNER','SHOP_MANAGER']) or private.is_cn_admin()) with check (private.has_active_membership(organization_id,array['SHOP_OWNER','SHOP_MANAGER']) or private.is_cn_admin());
create policy professional_profiles_read_related on public.professional_profiles for select to authenticated using (profile_id=(select auth.uid()) or private.is_cn_admin() or exists (select 1 from public.professional_location_assignments a join public.locations l on l.id=a.location_id where a.profile_id=professional_profiles.profile_id and private.has_active_membership(l.organization_id,null)));
create policy professional_profiles_manage_self on public.professional_profiles for all to authenticated using (profile_id=(select auth.uid()) or private.is_cn_admin()) with check (profile_id=(select auth.uid()) or private.is_cn_admin());
create policy professional_assignments_read_related on public.professional_location_assignments for select to authenticated using (profile_id=(select auth.uid()) or private.is_cn_admin() or exists (select 1 from public.locations l where l.id=location_id and private.has_active_membership(l.organization_id,null)));
create policy professional_assignments_manage_owner_manager on public.professional_location_assignments for all to authenticated using (private.is_cn_admin() or exists (select 1 from public.locations l where l.id=location_id and private.has_active_membership(l.organization_id,array['SHOP_OWNER','SHOP_MANAGER']))) with check (private.is_cn_admin() or exists (select 1 from public.locations l where l.id=location_id and private.has_active_membership(l.organization_id,array['SHOP_OWNER','SHOP_MANAGER'])));
create policy vehicle_makes_public_read on public.vehicle_makes for select to anon, authenticated using (status='ACTIVE');
create policy vehicle_models_public_read on public.vehicle_models for select to anon, authenticated using (status='ACTIVE');
create policy services_categories_public_read on public.service_categories for select to anon, authenticated using (status='ACTIVE');
create policy services_public_read on public.services for select to anon, authenticated using (status='ACTIVE');
create policy service_make_public_read on public.service_vehicle_makes for select to anon, authenticated using (true);
create policy vehicles_read_authorized on public.vehicles for select to authenticated using (private.can_access_vehicle(id));
create policy vehicles_update_owner_or_admin on public.vehicles for update to authenticated using (exists (select 1 from public.vehicle_ownerships o where o.vehicle_id=vehicles.id and o.owner_profile_id=(select auth.uid()) and o.ownership_status='CURRENT') or private.is_cn_admin()) with check (exists (select 1 from public.vehicle_ownerships o where o.vehicle_id=vehicles.id and o.owner_profile_id=(select auth.uid()) and o.ownership_status='CURRENT') or private.is_cn_admin());
create policy ownerships_read_self_or_admin on public.vehicle_ownerships for select to authenticated using (owner_profile_id=(select auth.uid()) or private.is_cn_admin());
create policy organization_services_read_member_or_admin on public.organization_services for select to authenticated using (private.has_active_membership(organization_id,null) or private.is_cn_admin());
create policy organization_services_manage_owner_manager on public.organization_services for all to authenticated using (private.has_active_membership(organization_id,array['SHOP_OWNER','SHOP_MANAGER']) or private.is_cn_admin()) with check (private.has_active_membership(organization_id,array['SHOP_OWNER','SHOP_MANAGER']) or private.is_cn_admin());
create policy location_services_read_member_or_admin on public.location_services for select to authenticated using (private.is_cn_admin() or exists (select 1 from public.locations l where l.id=location_id and private.has_active_membership(l.organization_id,null)));
create policy location_services_manage_owner_manager on public.location_services for all to authenticated using (private.is_cn_admin() or exists (select 1 from public.locations l where l.id=location_id and private.has_active_membership(l.organization_id,array['SHOP_OWNER','SHOP_MANAGER']))) with check (private.is_cn_admin() or exists (select 1 from public.locations l where l.id=location_id and private.has_active_membership(l.organization_id,array['SHOP_OWNER','SHOP_MANAGER'])));
create policy service_requests_read_customer_org_or_admin on public.service_requests for select to authenticated using (customer_profile_id=(select auth.uid()) or private.has_active_membership(organization_id,null) or private.is_cn_admin());
create policy service_requests_create_owner on public.service_requests for insert to authenticated with check (customer_profile_id=(select auth.uid()) and exists (select 1 from public.vehicle_ownerships o where o.vehicle_id=service_requests.vehicle_id and o.owner_profile_id=(select auth.uid()) and o.ownership_status='CURRENT') and private.organization_offers_service(organization_id,location_id,service_id));
create policy service_requests_update_customer_or_admin on public.service_requests for update to authenticated using (customer_profile_id=(select auth.uid()) or private.is_cn_admin()) with check (customer_profile_id=(select auth.uid()) or private.is_cn_admin());
