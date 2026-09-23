-- Phase 3: public discovery and two-sided marketplace foundation.
-- Public search is database-backed, contains no fixture data, and exposes only curated columns.

-- Foreign-key lookup indexes identified by the production performance advisor.
create index service_requests_location_idx on public.service_requests(location_id) where location_id is not null;
create index service_requests_service_idx on public.service_requests(service_id);
create index service_vehicle_makes_make_idx on public.service_vehicle_makes(vehicle_make_id);
create index vehicles_model_idx on public.vehicles(model_id);

alter table public.organizations
  add column public_visibility text not null default 'DRAFT' check (public_visibility in ('DRAFT','PUBLISHED','HIDDEN')),
  add column website_url text check (website_url is null or (char_length(website_url) <= 2048 and website_url ~ '^https://')),
  add column public_phone text check (public_phone is null or char_length(public_phone) <= 30),
  add column last_confirmed_at timestamptz,
  add column last_source_refresh_at timestamptz,
  add column owner_verified_at timestamptz,
  add column search_document tsvector generated always as
    (setweight(to_tsvector('simple', coalesce(name,'')), 'A') || setweight(to_tsvector('simple', coalesce(description,'')), 'B')) stored;
create index organizations_public_search_idx on public.organizations using gin(search_document) where public_visibility='PUBLISHED';
create index organizations_public_status_idx on public.organizations(public_visibility,status,slug);

alter table public.locations
  add column public_visibility text not null default 'DRAFT' check (public_visibility in ('DRAFT','PUBLISHED','HIDDEN'));
create index locations_public_geo_idx on public.locations(public_visibility,country_code,region,city,postal_code);

alter table public.professional_profiles
  add column id uuid not null default gen_random_uuid(),
  add column slug text unique check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  add column lifecycle_status text not null default 'PROFILE_INCOMPLETE' check (lifecycle_status in ('PROFILE_INCOMPLETE','VERIFICATION_REQUIRED','VERIFICATION_SUBMITTED','VERIFICATION_PENDING','VERIFIED','ACTIVE','ELIGIBLE_FOR_JOBS','REJECTED','SUSPENDED','REVERIFICATION_REQUIRED','INACTIVE')),
  add column verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED','APPLICATION_SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','VERIFIED','SUSPENDED','REMOVED')),
  add column operation_mode text not null default 'SHOP_ASSOCIATED' check (operation_mode in ('INDEPENDENT','SHOP_ASSOCIATED','HYBRID')),
  add column mobile_capable boolean not null default false,
  add column public_visibility text not null default 'DRAFT' check (public_visibility in ('DRAFT','PUBLISHED','HIDDEN')),
  add column verification_submitted_at timestamptz,
  add column verified_at timestamptz,
  add column last_confirmed_at timestamptz,
  add column search_document tsvector generated always as
    (setweight(to_tsvector('simple', coalesce(public_name,'')), 'A') || setweight(to_tsvector('simple', coalesce(headline,'')), 'B') || setweight(to_tsvector('simple', coalesce(biography,'')), 'C')) stored,
  add constraint professional_profiles_public_ready check
    (public_visibility <> 'PUBLISHED' or (slug is not null and public_name is not null and lifecycle_status in ('ACTIVE','ELIGIBLE_FOR_JOBS') and verification_status='VERIFIED')),
  add constraint professional_profiles_verified_timestamp check ((verification_status='VERIFIED') = (verified_at is not null));
alter table public.professional_profiles add constraint professional_profiles_public_id_unique unique(id);
create index professional_profiles_public_search_idx on public.professional_profiles using gin(search_document) where public_visibility='PUBLISHED';
create index professional_profiles_eligibility_idx on public.professional_profiles(public_visibility,verification_status,lifecycle_status,status);

alter table public.professional_location_assignments add column mechanic_id uuid;
update public.professional_location_assignments a set mechanic_id=p.id from public.professional_profiles p where p.profile_id=a.profile_id;
alter table public.professional_location_assignments alter column mechanic_id set not null;
alter table public.professional_location_assignments add constraint professional_location_assignments_mechanic_fk foreign key(mechanic_id) references public.professional_profiles(id) on delete cascade;
create unique index professional_location_assignments_mechanic_location_idx on public.professional_location_assignments(mechanic_id,location_id);

create function private.set_assignment_mechanic_id() returns trigger language plpgsql security definer set search_path='' as $$
begin
  select p.id into new.mechanic_id from public.professional_profiles p where p.profile_id=new.profile_id;
  if new.mechanic_id is null then raise exception 'professional profile is required' using errcode='23503'; end if;
  return new;
end;
$$;
revoke all on function private.set_assignment_mechanic_id() from public,anon,authenticated;
create trigger professional_assignment_mechanic_id before insert or update of profile_id on public.professional_location_assignments for each row execute function private.set_assignment_mechanic_id();

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.professional_services (
  mechanic_id uuid not null references public.professional_profiles(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(mechanic_id,service_id)
);
create index professional_services_search_idx on public.professional_services(service_id,mechanic_id) where status='ACTIVE';
create table public.professional_vehicle_makes (
  mechanic_id uuid not null references public.professional_profiles(id) on delete cascade,
  vehicle_make_id uuid not null references public.vehicle_makes(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(mechanic_id,vehicle_make_id)
);
create index professional_vehicle_makes_search_idx on public.professional_vehicle_makes(vehicle_make_id,mechanic_id) where status='ACTIVE';
create table public.organization_vehicle_makes (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_make_id uuid not null references public.vehicle_makes(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(organization_id,vehicle_make_id)
);
create index organization_vehicle_makes_search_idx on public.organization_vehicle_makes(vehicle_make_id,organization_id) where status='ACTIVE';
create table public.professional_specialties (
  mechanic_id uuid not null references public.professional_profiles(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(mechanic_id,specialty_id)
);
create index professional_specialties_search_idx on public.professional_specialties(specialty_id,mechanic_id) where status='ACTIVE';
create table public.mechanic_service_areas (
  id uuid primary key default gen_random_uuid(),
  mechanic_id uuid not null references public.professional_profiles(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  city text, region text, postal_code text,
  country_code char(2) not null default 'US' check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  radius_miles numeric(6,2) check (radius_miles > 0 and radius_miles <= 500),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((latitude is null)=(longitude is null)),
  check (radius_miles is null or latitude is not null),
  check (city is not null or latitude is not null)
);
create index mechanic_service_areas_filter_idx on public.mechanic_service_areas(country_code,region,city,postal_code,mechanic_id) where status='ACTIVE';

create table public.organization_provenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_type text not null check (source_type in ('OWNER','PUBLIC_REGISTRY','LICENSED_DATA','PARTNER','MANUAL_RESEARCH')),
  source_name text not null check (char_length(source_name) between 1 and 200),
  source_id text check (source_id is null or char_length(source_id) <= 300),
  source_url text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https://')),
  ingestion_method text not null check (ingestion_method in ('OWNER_SUBMITTED','API','IMPORT','MANUAL')),
  retrieved_at timestamptz not null default now(), refresh_due_at timestamptz,
  confirmed_at timestamptz, owner_verified_at timestamptz,
  confidence numeric(4,3) check (confidence between 0 and 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,source_type,source_name,source_id)
);
create index organization_provenance_source_idx on public.organization_provenance(source_type,source_name,source_id);
create table public.business_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  claimant_profile_id uuid not null references public.profiles(id) on delete restrict,
  claim_type text not null check (claim_type in ('OWNER','AUTHORIZED_REPRESENTATIVE','MANAGER')),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','APPROVED','REJECTED','WITHDRAWN')),
  evidence_summary text check (evidence_summary is null or char_length(evidence_summary) <= 2000),
  reviewed_by uuid references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(), reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check ((status in ('APPROVED','REJECTED'))=(reviewed_at is not null))
);
create unique index business_claims_one_open_idx on public.business_claims(organization_id,claimant_profile_id) where status in ('SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED');
create table public.organization_aliases (
  alias_slug text primary key check (alias_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reason text not null check (reason in ('RENAMED','MERGED','CORRECTED')),
  created_at timestamptz not null default now()
);
create table private.organization_duplicate_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_a_id uuid not null references public.organizations(id) on delete cascade,
  organization_b_id uuid not null references public.organizations(id) on delete cascade,
  deterministic_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'OPEN' check (status in ('OPEN','CONFIRMED','DISMISSED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (organization_a_id<>organization_b_id), unique(organization_a_id,organization_b_id)
);
create table private.organization_merge_history (
  id uuid primary key default gen_random_uuid(),
  surviving_organization_id uuid not null references public.organizations(id) on delete restrict,
  merged_organization_id uuid not null references public.organizations(id) on delete restrict,
  merged_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (char_length(reason) between 1 and 1000),
  merged_at timestamptz not null default now(),
  check (surviving_organization_id<>merged_organization_id)
);

create function private.mechanic_is_public(p_mechanic_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.professional_profiles p where p.id=p_mechanic_id and p.status='ACTIVE' and p.public_visibility='PUBLISHED' and p.verification_status='VERIFIED' and p.lifecycle_status in ('ACTIVE','ELIGIBLE_FOR_JOBS'));
$$;
create function private.organization_is_public(p_organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organizations o where o.id=p_organization_id and o.public_visibility='PUBLISHED' and o.status not in ('INACTIVE','ARCHIVED','SUSPENDED','CLOSED','REMOVED'));
$$;
create function private.organization_is_claimable(p_organization_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.organizations o where o.id=p_organization_id and o.public_visibility='PUBLISHED' and o.status in ('DISCOVERED','UNCLAIMED'));
$$;
-- RLS roles need namespace resolution for the three explicitly granted helper
-- functions. No private table or other function privilege is granted.
grant usage on schema private to anon,authenticated;
revoke all on function private.mechanic_is_public(uuid),private.organization_is_public(uuid),private.organization_is_claimable(uuid) from public,anon,authenticated;
grant execute on function private.mechanic_is_public(uuid),private.organization_is_public(uuid) to anon,authenticated;
grant execute on function private.organization_is_claimable(uuid) to authenticated;

-- Replace the broad self-mutation grant: lifecycle and verification are authoritative.
revoke insert,update,delete on public.professional_profiles from authenticated;
grant insert(profile_id,public_name,headline,biography,slug,operation_mode,mobile_capable) on public.professional_profiles to authenticated;
grant update(public_name,headline,biography,slug,operation_mode,mobile_capable) on public.professional_profiles to authenticated;
grant select(id,public_name,headline,biography,slug,lifecycle_status,verification_status,operation_mode,mobile_capable,public_visibility,verified_at,last_confirmed_at,search_document,status,created_at,updated_at) on public.professional_profiles to anon;
grant select(id,name,slug,description,organization_type,status,public_visibility,website_url,public_phone,last_confirmed_at,last_source_refresh_at,owner_verified_at,search_document,created_at,updated_at) on public.organizations to anon;
grant select(id,organization_id,name,slug,location_type,status,address_line_1,address_line_2,city,region,postal_code,country_code,latitude,longitude,public_phone,timezone,public_visibility,created_at,updated_at) on public.locations to anon;
grant select(mechanic_id,location_id,created_at) on public.professional_location_assignments to anon;
grant select on public.specialties,public.professional_services,public.professional_vehicle_makes,public.organization_vehicle_makes,public.professional_specialties,public.mechanic_service_areas,public.organization_aliases to anon,authenticated;
grant select on public.organization_services,public.location_services to anon;
grant select,insert on public.business_claims to authenticated;
grant select on public.organization_provenance to authenticated;
grant all on public.specialties,public.professional_services,public.professional_vehicle_makes,public.organization_vehicle_makes,public.professional_specialties,public.mechanic_service_areas,public.organization_provenance,public.business_claims,public.organization_aliases,private.organization_duplicate_candidates,private.organization_merge_history to service_role;

alter table public.specialties enable row level security;
alter table public.professional_services enable row level security;
alter table public.professional_vehicle_makes enable row level security;
alter table public.organization_vehicle_makes enable row level security;
alter table public.professional_specialties enable row level security;
alter table public.mechanic_service_areas enable row level security;
alter table public.organization_provenance enable row level security;
alter table public.business_claims enable row level security;
alter table public.organization_aliases enable row level security;
alter table private.organization_duplicate_candidates enable row level security;
alter table private.organization_merge_history enable row level security;

create policy professional_profiles_public_read on public.professional_profiles for select to anon using (private.mechanic_is_public(id));
create policy organizations_public_read on public.organizations for select to anon using (private.organization_is_public(id));
create policy locations_public_read on public.locations for select to anon using (public_visibility='PUBLISHED' and status='ACTIVE' and private.organization_is_public(organization_id));
create policy professional_assignments_public_read on public.professional_location_assignments for select to anon using (private.mechanic_is_public(mechanic_id) and exists(select 1 from public.locations l where l.id=location_id and l.public_visibility='PUBLISHED' and l.status='ACTIVE'));
create policy specialties_public_read on public.specialties for select to anon,authenticated using (status='ACTIVE');
create policy professional_services_public_read on public.professional_services for select to anon using (status='ACTIVE' and private.mechanic_is_public(mechanic_id));
create policy professional_services_self_read on public.professional_services for select to authenticated using (exists(select 1 from public.professional_profiles p where p.id=mechanic_id and p.profile_id=(select auth.uid())) or private.is_cn_admin());
create policy professional_vehicle_makes_public_read on public.professional_vehicle_makes for select to anon using (status='ACTIVE' and private.mechanic_is_public(mechanic_id));
create policy professional_vehicle_makes_self_read on public.professional_vehicle_makes for select to authenticated using (exists(select 1 from public.professional_profiles p where p.id=mechanic_id and p.profile_id=(select auth.uid())) or private.is_cn_admin());
create policy organization_vehicle_makes_public_read on public.organization_vehicle_makes for select to anon using (status='ACTIVE' and private.organization_is_public(organization_id));
create policy organization_vehicle_makes_member_read on public.organization_vehicle_makes for select to authenticated using (private.has_active_membership(organization_id,null) or private.is_cn_admin());
create policy professional_specialties_public_read on public.professional_specialties for select to anon using (status='ACTIVE' and private.mechanic_is_public(mechanic_id));
create policy professional_specialties_self_read on public.professional_specialties for select to authenticated using (exists(select 1 from public.professional_profiles p where p.id=mechanic_id and p.profile_id=(select auth.uid())) or private.is_cn_admin());
create policy mechanic_service_areas_public_read on public.mechanic_service_areas for select to anon using (status='ACTIVE' and private.mechanic_is_public(mechanic_id));
create policy mechanic_service_areas_self_read on public.mechanic_service_areas for select to authenticated using (exists(select 1 from public.professional_profiles p where p.id=mechanic_id and p.profile_id=(select auth.uid())) or private.is_cn_admin());
create policy organization_services_public_read on public.organization_services for select to anon using (status='ACTIVE' and private.organization_is_public(organization_id));
create policy location_services_public_read on public.location_services for select to anon using (status='ACTIVE' and exists(select 1 from public.locations l where l.id=location_id and l.public_visibility='PUBLISHED' and private.organization_is_public(l.organization_id)));
create policy organization_aliases_public_read on public.organization_aliases for select to anon,authenticated using (private.organization_is_public(organization_id));
create policy provenance_admin_only on public.organization_provenance for all to authenticated using (private.is_cn_admin()) with check (private.is_cn_admin());
create policy claims_read_own_or_admin on public.business_claims for select to authenticated using (claimant_profile_id=(select auth.uid()) or private.is_cn_admin());
create policy claims_create_public_listing on public.business_claims for insert to authenticated with check (claimant_profile_id=(select auth.uid()) and private.organization_is_claimable(organization_id));

create trigger specialties_updated_at before update on public.specialties for each row execute function private.set_updated_at();
create trigger professional_services_updated_at before update on public.professional_services for each row execute function private.set_updated_at();
create trigger professional_vehicle_makes_updated_at before update on public.professional_vehicle_makes for each row execute function private.set_updated_at();
create trigger organization_vehicle_makes_updated_at before update on public.organization_vehicle_makes for each row execute function private.set_updated_at();
create trigger professional_specialties_updated_at before update on public.professional_specialties for each row execute function private.set_updated_at();
create trigger mechanic_service_areas_updated_at before update on public.mechanic_service_areas for each row execute function private.set_updated_at();
create trigger organization_provenance_updated_at before update on public.organization_provenance for each row execute function private.set_updated_at();
create trigger business_claims_updated_at before update on public.business_claims for each row execute function private.set_updated_at();

-- Search functions are SECURITY INVOKER. They remain constrained by anon grants and RLS.
create function public.search_public_mechanics(
  p_query text default null,p_city text default null,p_region text default null,p_postal_code text default null,
  p_latitude numeric default null,p_longitude numeric default null,p_radius_miles numeric default null,
  p_service_slug text default null,p_vehicle_make_slug text default null,p_specialty_slug text default null,
  p_mobile boolean default null,p_verified boolean default true,p_slug text default null,p_limit integer default 20,p_offset integer default 0
) returns table(id uuid,slug text,public_name text,headline text,biography text,verified boolean,operation_mode text,mobile_capable boolean,services jsonb,vehicle_makes jsonb,specialties jsonb,service_areas jsonb,shops jsonb,total_count bigint)
language plpgsql stable security invoker set search_path='' as $$
begin
  if p_limit<1 or p_limit>50 or p_offset<0 or p_offset>10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  if p_radius_miles is not null and (p_latitude is null or p_longitude is null or p_radius_miles<=0 or p_radius_miles>500) then raise exception 'invalid radius search' using errcode='22023'; end if;
  return query
  with matched as (
    select p.id,p.slug,p.public_name,p.headline,p.biography,p.verification_status='VERIFIED' as verified,p.operation_mode,p.mobile_capable,
      coalesce((select jsonb_agg(jsonb_build_object('slug',s.slug,'name',s.name) order by s.name) from public.professional_services ps join public.services s on s.id=ps.service_id where ps.mechanic_id=p.id and ps.status='ACTIVE'),'[]'::jsonb) services,
      coalesce((select jsonb_agg(jsonb_build_object('slug',v.slug,'name',v.name) order by v.name) from public.professional_vehicle_makes pm join public.vehicle_makes v on v.id=pm.vehicle_make_id where pm.mechanic_id=p.id and pm.status='ACTIVE'),'[]'::jsonb) vehicle_makes,
      coalesce((select jsonb_agg(jsonb_build_object('slug',sp.slug,'name',sp.name) order by sp.name) from public.professional_specialties px join public.specialties sp on sp.id=px.specialty_id where px.mechanic_id=p.id and px.status='ACTIVE'),'[]'::jsonb) specialties,
      coalesce((select jsonb_agg(jsonb_build_object('label',a.label,'city',a.city,'region',a.region,'postalCode',a.postal_code,'countryCode',a.country_code,'radiusMiles',a.radius_miles) order by a.label) from public.mechanic_service_areas a where a.mechanic_id=p.id and a.status='ACTIVE'),'[]'::jsonb) service_areas,
      coalesce((select jsonb_agg(distinct jsonb_build_object('slug',o.slug,'name',o.name,'verified',(o.status='CN_VERIFIED'))) from public.professional_location_assignments pa join public.locations l on l.id=pa.location_id join public.organizations o on o.id=l.organization_id where pa.mechanic_id=p.id and l.public_visibility='PUBLISHED' and o.public_visibility='PUBLISHED'),'[]'::jsonb) shops
    from public.professional_profiles p
    where p.status='ACTIVE' and p.public_visibility='PUBLISHED' and p.lifecycle_status in ('ACTIVE','ELIGIBLE_FOR_JOBS') and p.verification_status='VERIFIED'
      and (p_verified is null or p_verified=true)
      and (p_slug is null or p.slug=p_slug)
      and (p_mobile is null or p.mobile_capable=p_mobile)
      and (p_query is null or btrim(p_query)='' or p.search_document @@ websearch_to_tsquery('simple',p_query)
        or exists(select 1 from public.professional_services ps join public.services s on s.id=ps.service_id where ps.mechanic_id=p.id and ps.status='ACTIVE' and (s.name ilike '%'||p_query||'%' or s.description ilike '%'||p_query||'%')))
      and (p_service_slug is null or exists(select 1 from public.professional_services ps join public.services s on s.id=ps.service_id where ps.mechanic_id=p.id and ps.status='ACTIVE' and s.slug=p_service_slug))
      and (p_vehicle_make_slug is null or exists(select 1 from public.professional_vehicle_makes pm join public.vehicle_makes v on v.id=pm.vehicle_make_id where pm.mechanic_id=p.id and pm.status='ACTIVE' and v.slug=p_vehicle_make_slug))
      and (p_specialty_slug is null or exists(select 1 from public.professional_specialties px join public.specialties sp on sp.id=px.specialty_id where px.mechanic_id=p.id and px.status='ACTIVE' and sp.slug=p_specialty_slug))
      and ((p_city is null and p_region is null and p_postal_code is null) or exists(select 1 from public.mechanic_service_areas a where a.mechanic_id=p.id and a.status='ACTIVE' and (p_city is null or lower(a.city)=lower(p_city)) and (p_region is null or lower(a.region)=lower(p_region)) and (p_postal_code is null or a.postal_code=p_postal_code)))
      and (p_radius_miles is null or exists(select 1 from public.mechanic_service_areas a where a.mechanic_id=p.id and a.status='ACTIVE' and a.latitude is not null and (3959*acos(least(1,cos(radians(p_latitude))*cos(radians(a.latitude))*cos(radians(a.longitude)-radians(p_longitude))+sin(radians(p_latitude))*sin(radians(a.latitude))))) <= least(p_radius_miles,coalesce(a.radius_miles,p_radius_miles))))
  ) select m.*,count(*) over() from matched m order by m.verified desc,m.public_name,m.id limit p_limit offset p_offset;
end;
$$;

create function public.search_public_shops(
  p_query text default null,p_city text default null,p_region text default null,p_postal_code text default null,
  p_service_slug text default null,p_vehicle_make_slug text default null,p_verified boolean default null,p_slug text default null,p_limit integer default 20,p_offset integer default 0
) returns table(id uuid,slug text,name text,description text,organization_type text,verified boolean,website_url text,public_phone text,locations jsonb,services jsonb,vehicle_makes jsonb,mechanics jsonb,total_count bigint)
language plpgsql stable security invoker set search_path='' as $$
begin
  if p_limit<1 or p_limit>50 or p_offset<0 or p_offset>10000 then raise exception 'invalid pagination' using errcode='22023'; end if;
  return query
  with matched as (
    select o.id,o.slug,o.name,o.description,o.organization_type,o.status='CN_VERIFIED' as verified,o.website_url,o.public_phone,
      coalesce((select jsonb_agg(jsonb_build_object('name',l.name,'slug',l.slug,'type',l.location_type,'city',l.city,'region',l.region,'postalCode',l.postal_code,'countryCode',l.country_code) order by l.name) from public.locations l where l.organization_id=o.id and l.public_visibility='PUBLISHED' and l.status='ACTIVE'),'[]'::jsonb) locations,
      coalesce((select jsonb_agg(jsonb_build_object('slug',s.slug,'name',s.name) order by s.name) from public.organization_services os join public.services s on s.id=os.service_id where os.organization_id=o.id and os.status='ACTIVE'),'[]'::jsonb) services,
      coalesce((select jsonb_agg(jsonb_build_object('slug',v.slug,'name',v.name) order by v.name) from public.organization_vehicle_makes om join public.vehicle_makes v on v.id=om.vehicle_make_id where om.organization_id=o.id and om.status='ACTIVE'),'[]'::jsonb) vehicle_makes,
      coalesce((select jsonb_agg(distinct jsonb_build_object('slug',p.slug,'name',p.public_name,'verified',(p.verification_status='VERIFIED'))) from public.locations l join public.professional_location_assignments pa on pa.location_id=l.id join public.professional_profiles p on p.id=pa.mechanic_id where l.organization_id=o.id and private.mechanic_is_public(p.id)),'[]'::jsonb) mechanics
    from public.organizations o
    where o.public_visibility='PUBLISHED' and o.status not in ('INACTIVE','ARCHIVED','SUSPENDED','CLOSED','REMOVED')
      and (p_verified is null or (o.status='CN_VERIFIED')=p_verified)
      and (p_slug is null or o.slug=p_slug)
      and (p_query is null or btrim(p_query)='' or o.search_document @@ websearch_to_tsquery('simple',p_query))
      and ((p_city is null and p_region is null and p_postal_code is null) or exists(select 1 from public.locations l where l.organization_id=o.id and l.public_visibility='PUBLISHED' and l.status='ACTIVE' and (p_city is null or lower(l.city)=lower(p_city)) and (p_region is null or lower(l.region)=lower(p_region)) and (p_postal_code is null or l.postal_code=p_postal_code)))
      and (p_service_slug is null or exists(select 1 from public.organization_services os join public.services s on s.id=os.service_id where os.organization_id=o.id and os.status='ACTIVE' and s.slug=p_service_slug))
      and (p_vehicle_make_slug is null or exists(select 1 from public.organization_vehicle_makes om join public.vehicle_makes v on v.id=om.vehicle_make_id where om.organization_id=o.id and om.status='ACTIVE' and v.slug=p_vehicle_make_slug))
  ) select m.*,count(*) over() from matched m order by m.verified desc,m.name,m.id limit p_limit offset p_offset;
end;
$$;
revoke all on function public.search_public_mechanics(text,text,text,text,numeric,numeric,numeric,text,text,text,boolean,boolean,text,integer,integer),public.search_public_shops(text,text,text,text,text,text,boolean,text,integer,integer) from public,anon,authenticated;
grant execute on function public.search_public_mechanics(text,text,text,text,numeric,numeric,numeric,text,text,text,boolean,boolean,text,integer,integer),public.search_public_shops(text,text,text,text,text,text,boolean,text,integer,integer) to anon,authenticated;
