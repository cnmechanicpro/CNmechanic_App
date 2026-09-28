-- Phase 4: service request, controlled matching, job offers and assignment foundation.

alter table public.service_requests drop constraint service_requests_status_check;
alter table public.service_requests drop constraint service_requests_submission_history_check;
alter table public.service_requests drop constraint service_requests_closed_was_submitted_check;
alter table public.service_requests alter column organization_id drop not null;
alter table public.service_requests
  add column service_location_text text check (service_location_text is null or char_length(service_location_text) <= 300),
  add column city text check (city is null or char_length(city) <= 100),
  add column region text check (region is null or char_length(region) <= 100),
  add column postal_code text check (postal_code is null or char_length(postal_code) <= 20),
  add column country_code char(2) not null default 'US' check (country_code ~ '^[A-Z]{2}$'),
  add column latitude numeric(9,6) check (latitude between -90 and 90),
  add column longitude numeric(9,6) check (longitude between -180 and 180),
  add column mobile_service_preference text not null default 'EITHER' check (mobile_service_preference in ('MOBILE','SHOP','EITHER')),
  add column preferred_start_at timestamptz,
  add column preferred_end_at timestamptz,
  add column urgency text not null default 'ROUTINE' check (urgency in ('ROUTINE','SOON','URGENT')),
  add column cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) <= 500),
  add column cancelled_at timestamptz,
  add column matching_started_at timestamptz,
  add column assigned_mechanic_id uuid references public.professional_profiles(id) on delete restrict,
  add column assigned_at timestamptz,
  add column idempotency_key text check (idempotency_key is null or char_length(idempotency_key) between 8 and 100),
  add constraint service_requests_status_check check (status in ('DRAFT','SUBMITTED','MATCHING','OFFERS_SENT','MECHANIC_RESPONDED','PENDING_CUSTOMER_CONFIRMATION','ASSIGNED','ACTIVE','CANCELLED','NO_MATCH','EXPIRED','REJECTED','CLOSED')),
  add constraint service_requests_geo_pair check ((latitude is null)=(longitude is null)),
  add constraint service_requests_window check (preferred_end_at is null or preferred_start_at is null or preferred_end_at > preferred_start_at),
  add constraint service_requests_submission_check check (status='DRAFT' or submitted_at is not null),
  add constraint service_requests_cancel_check check ((status='CANCELLED')=(cancelled_at is not null)),
  add constraint service_requests_assignment_check check ((status not in ('ASSIGNED','ACTIVE')) or (assigned_mechanic_id is not null and assigned_at is not null));
create unique index service_requests_customer_idempotency_idx on public.service_requests(customer_profile_id,idempotency_key) where idempotency_key is not null;
create index service_requests_matching_idx on public.service_requests(status,service_id,created_at) where status in ('SUBMITTED','MATCHING','OFFERS_SENT','MECHANIC_RESPONDED','PENDING_CUSTOMER_CONFIRMATION');
create index service_requests_assigned_mechanic_idx on public.service_requests(assigned_mechanic_id,updated_at desc) where assigned_mechanic_id is not null;

create table public.job_offers (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete restrict,
  mechanic_id uuid not null references public.professional_profiles(id) on delete restrict,
  status text not null default 'OFFERED' check (status in ('OFFERED','VIEWED','ACCEPTED','DECLINED','EXPIRED','WITHDRAWN')),
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  viewed_at timestamptz,
  responded_at timestamptz,
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_request_id,mechanic_id),
  check (expires_at > offered_at),
  check (status not in ('ACCEPTED','DECLINED') or responded_at is not null)
);
create index job_offers_mechanic_status_idx on public.job_offers(mechanic_id,status,expires_at);
create index job_offers_request_status_idx on public.job_offers(service_request_id,status);

create table public.service_request_assignments (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null unique references public.service_requests(id) on delete restrict,
  job_offer_id uuid not null unique references public.job_offers(id) on delete restrict,
  mechanic_id uuid not null references public.professional_profiles(id) on delete restrict,
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED','ACTIVE','CANCELLED','CLOSED')),
  assigned_at timestamptz not null default now(),
  activated_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status<>'ACTIVE' or activated_at is not null),
  check (status not in ('CANCELLED','CLOSED') or ended_at is not null)
);
create unique index service_request_one_live_assignment_idx on public.service_request_assignments(service_request_id) where status in ('ASSIGNED','ACTIVE');
create index service_request_assignments_mechanic_idx on public.service_request_assignments(mechanic_id,status,assigned_at desc);

create table public.service_request_events (
  id bigint generated always as identity primary key,
  service_request_id uuid not null references public.service_requests(id) on delete restrict,
  event_type text not null check (event_type in ('SERVICE_REQUEST_CREATED','SERVICE_REQUEST_SUBMITTED','MATCHING_STARTED','JOB_OFFER_CREATED','JOB_OFFER_VIEWED','JOB_OFFER_ACCEPTED','JOB_OFFER_DECLINED','JOB_OFFER_EXPIRED','JOB_OFFER_WITHDRAWN','MECHANIC_SELECTED','REQUEST_ASSIGNED','REQUEST_ACTIVATED','REQUEST_CANCELLED','REQUEST_EXPIRED','NO_MATCH')),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  mechanic_id uuid references public.professional_profiles(id) on delete set null,
  job_offer_id uuid references public.job_offers(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now()
);
create index service_request_events_request_idx on public.service_request_events(service_request_id,created_at,id);

create or replace function private.validate_service_request() returns trigger language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
  if new.location_id is not null and (new.organization_id is null or not exists(select 1 from public.locations l where l.id=new.location_id and l.organization_id=new.organization_id)) then raise exception 'location does not belong to organization' using errcode='23514'; end if;
  if new.organization_id is not null and not private.organization_offers_service(new.organization_id,new.location_id,new.service_id) then raise exception 'organization does not offer service' using errcode='23514'; end if;
  if tg_op='UPDATE' then
    if new.customer_profile_id<>old.customer_profile_id or new.vehicle_id<>old.vehicle_id or new.service_id<>old.service_id or new.organization_id is distinct from old.organization_id or new.location_id is distinct from old.location_id then raise exception 'service request relationships are immutable' using errcode='23514'; end if;
    if new.status<>old.status then
      allowed := case old.status
        when 'DRAFT' then new.status in ('SUBMITTED','CANCELLED')
        when 'SUBMITTED' then new.status in ('MATCHING','CANCELLED','EXPIRED')
        when 'MATCHING' then new.status in ('OFFERS_SENT','NO_MATCH','CANCELLED','EXPIRED')
        when 'OFFERS_SENT' then new.status in ('MECHANIC_RESPONDED','NO_MATCH','CANCELLED','EXPIRED')
        when 'MECHANIC_RESPONDED' then new.status in ('PENDING_CUSTOMER_CONFIRMATION','OFFERS_SENT','NO_MATCH','CANCELLED','EXPIRED')
        when 'PENDING_CUSTOMER_CONFIRMATION' then new.status in ('ASSIGNED','OFFERS_SENT','CANCELLED','EXPIRED')
        when 'ASSIGNED' then new.status in ('ACTIVE','CANCELLED')
        when 'ACTIVE' then new.status in ('CLOSED','CANCELLED')
        else false end;
      if not allowed then raise exception 'invalid service request transition' using errcode='23514'; end if;
    end if;
  end if;
  if new.status<>'DRAFT' and new.submitted_at is null then new.submitted_at=now(); end if;
  if new.status='MATCHING' and new.matching_started_at is null then new.matching_started_at=now(); end if;
  if new.status='CANCELLED' and new.cancelled_at is null then new.cancelled_at=now(); end if;
  if new.status='CLOSED' and new.closed_at is null then new.closed_at=now(); end if;
  return new;
end;$$;

create function public.create_marketplace_service_request(p_vehicle_id uuid,p_service_id uuid,p_customer_note text default null,p_organization_id uuid default null,p_location_id uuid default null,p_service_location_text text default null,p_city text default null,p_region text default null,p_postal_code text default null,p_country_code text default 'US',p_latitude numeric default null,p_longitude numeric default null,p_mobile_service_preference text default 'EITHER',p_preferred_start_at timestamptz default null,p_preferred_end_at timestamptz default null,p_urgency text default 'ROUTINE',p_submit boolean default true,p_idempotency_key text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare user_id uuid := (select auth.uid()); request_id uuid;
begin
  if user_id is null then raise exception 'authentication required' using errcode='42501'; end if;
  if not exists(select 1 from public.vehicle_ownerships o where o.vehicle_id=p_vehicle_id and o.owner_profile_id=user_id and o.ownership_status='CURRENT') then raise exception 'vehicle access denied' using errcode='42501'; end if;
  if not exists(select 1 from public.services s where s.id=p_service_id and s.status='ACTIVE') then raise exception 'service unavailable' using errcode='23503'; end if;
  if p_idempotency_key is not null then select id into request_id from public.service_requests where customer_profile_id=user_id and idempotency_key=p_idempotency_key; if request_id is not null then return request_id; end if; end if;
  insert into public.service_requests(customer_profile_id,vehicle_id,organization_id,location_id,service_id,status,customer_note,service_location_text,city,region,postal_code,country_code,latitude,longitude,mobile_service_preference,preferred_start_at,preferred_end_at,urgency,submitted_at,idempotency_key)
  values(user_id,p_vehicle_id,p_organization_id,p_location_id,p_service_id,case when p_submit then 'SUBMITTED' else 'DRAFT' end,p_customer_note,p_service_location_text,p_city,p_region,p_postal_code,p_country_code,p_latitude,p_longitude,p_mobile_service_preference,p_preferred_start_at,p_preferred_end_at,p_urgency,case when p_submit then now() end,p_idempotency_key) returning id into request_id;
  insert into public.service_request_events(service_request_id,event_type,actor_profile_id) values(request_id,'SERVICE_REQUEST_CREATED',user_id);
  if p_submit then insert into public.service_request_events(service_request_id,event_type,actor_profile_id) values(request_id,'SERVICE_REQUEST_SUBMITTED',user_id); end if;
  return request_id;
exception when unique_violation then
  if p_idempotency_key is not null then select id into request_id from public.service_requests where customer_profile_id=user_id and idempotency_key=p_idempotency_key; return request_id; end if;
  raise;
end;$$;

create function private.provider_is_job_eligible(p_mechanic_id uuid,p_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.service_requests r
    join public.vehicles v on v.id=r.vehicle_id
    join public.vehicle_models vm on vm.id=v.model_id
    join public.professional_profiles p on p.id=p_mechanic_id
    where r.id=p_request_id and p.status='ACTIVE' and p.verification_status='VERIFIED' and p.lifecycle_status='ELIGIBLE_FOR_JOBS'
      and p.public_visibility='PUBLISHED'
      and exists(select 1 from public.professional_services ps where ps.mechanic_id=p.id and ps.service_id=r.service_id and ps.status='ACTIVE')
      and exists(select 1 from public.professional_vehicle_makes pm where pm.mechanic_id=p.id and pm.vehicle_make_id=vm.make_id and pm.status='ACTIVE')
      and (r.mobile_service_preference<>'MOBILE' or p.mobile_capable)
      and (r.mobile_service_preference<>'SHOP' or exists(select 1 from public.professional_location_assignments pla join public.locations l on l.id=pla.location_id where pla.mechanic_id=p.id and l.status='ACTIVE'))
      and ((r.city is null and r.region is null and r.postal_code is null) or exists(select 1 from public.mechanic_service_areas a where a.mechanic_id=p.id and a.status='ACTIVE' and (r.city is null or lower(a.city)=lower(r.city)) and (r.region is null or lower(a.region)=lower(r.region)) and (r.postal_code is null or a.postal_code=r.postal_code)))
  );
$$;

create function private.find_eligible_providers(p_request_id uuid,p_limit integer default 10) returns table(mechanic_id uuid,relevance integer) language sql stable security definer set search_path='' as $$
  select p.id, 100 + case when r.mobile_service_preference='MOBILE' and p.mobile_capable then 10 else 0 end
  from public.service_requests r join public.professional_profiles p on private.provider_is_job_eligible(p.id,r.id)
  where r.id=p_request_id order by 2 desc,p.id limit least(greatest(p_limit,1),10);
$$;

create function private.create_job_offers(p_request_id uuid,p_mechanic_ids uuid[],p_expires_at timestamptz) returns integer language plpgsql security definer set search_path='' as $$
declare request_row public.service_requests%rowtype; mechanic uuid; created integer:=0;
begin
  if coalesce(array_length(p_mechanic_ids,1),0) not between 1 and 10 then raise exception 'offer batch must contain 1 to 10 mechanics' using errcode='22023'; end if;
  if p_expires_at<=now() or p_expires_at>now()+interval '7 days' then raise exception 'invalid offer expiration' using errcode='22023'; end if;
  select * into request_row from public.service_requests where id=p_request_id for update;
  if request_row.id is null or request_row.status not in ('SUBMITTED','MATCHING','OFFERS_SENT','MECHANIC_RESPONDED') then raise exception 'request is not matchable' using errcode='23514'; end if;
  if request_row.status='SUBMITTED' then update public.service_requests set status='MATCHING' where id=p_request_id; insert into public.service_request_events(service_request_id,event_type) values(p_request_id,'MATCHING_STARTED'); end if;
  foreach mechanic in array p_mechanic_ids loop
    if not private.provider_is_job_eligible(mechanic,p_request_id) then raise exception 'ineligible mechanic' using errcode='42501'; end if;
    insert into public.job_offers(service_request_id,mechanic_id,expires_at) values(p_request_id,mechanic,p_expires_at) on conflict(service_request_id,mechanic_id) do nothing;
    if found then created:=created+1; insert into public.service_request_events(service_request_id,event_type,mechanic_id,job_offer_id) select p_request_id,'JOB_OFFER_CREATED',mechanic,o.id from public.job_offers o where o.service_request_id=p_request_id and o.mechanic_id=mechanic; end if;
  end loop;
  if created>0 then update public.service_requests set status='OFFERS_SENT' where id=p_request_id and status in ('MATCHING','MECHANIC_RESPONDED'); end if;
  return created;
end;$$;

create function public.respond_to_job_offer(p_offer_id uuid,p_accept boolean,p_decline_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare user_id uuid:=(select auth.uid()); offer_row public.job_offers%rowtype; request_row public.service_requests%rowtype;
begin
  select o.* into offer_row from public.job_offers o join public.professional_profiles p on p.id=o.mechanic_id where o.id=p_offer_id and p.profile_id=user_id for update of o;
  if offer_row.id is null then raise exception 'offer access denied' using errcode='42501'; end if;
  select * into request_row from public.service_requests where id=offer_row.service_request_id for update;
  if offer_row.status not in ('OFFERED','VIEWED') or offer_row.expires_at<=now() then raise exception 'offer is no longer available' using errcode='23514'; end if;
  if request_row.status not in ('OFFERS_SENT','MECHANIC_RESPONDED') or exists(select 1 from public.service_request_assignments a where a.service_request_id=request_row.id and a.status in ('ASSIGNED','ACTIVE')) then raise exception 'request is no longer available' using errcode='23514'; end if;
  if p_accept and not private.provider_is_job_eligible(offer_row.mechanic_id,request_row.id) then raise exception 'mechanic is not eligible' using errcode='42501'; end if;
  update public.job_offers set status=case when p_accept then 'ACCEPTED' else 'DECLINED' end,responded_at=now(),decline_reason=case when p_accept then null else p_decline_reason end where id=p_offer_id;
  insert into public.service_request_events(service_request_id,event_type,actor_profile_id,mechanic_id,job_offer_id) values(request_row.id,case when p_accept then 'JOB_OFFER_ACCEPTED' else 'JOB_OFFER_DECLINED' end,user_id,offer_row.mechanic_id,p_offer_id);
  if p_accept then update public.service_requests set status=case when status='OFFERS_SENT' then 'MECHANIC_RESPONDED' else status end where id=request_row.id; update public.service_requests set status='PENDING_CUSTOMER_CONFIRMATION' where id=request_row.id and status='MECHANIC_RESPONDED'; end if;
  return request_row.id;
end;$$;

create function public.confirm_job_offer(p_offer_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare user_id uuid:=(select auth.uid()); offer_row public.job_offers%rowtype; request_row public.service_requests%rowtype; assignment_id uuid;
begin
  select * into offer_row from public.job_offers where id=p_offer_id for update;
  if offer_row.id is null then raise exception 'offer not found' using errcode='P0002'; end if;
  select * into request_row from public.service_requests where id=offer_row.service_request_id for update;
  if request_row.customer_profile_id<>user_id then raise exception 'request access denied' using errcode='42501'; end if;
  if request_row.status<>'PENDING_CUSTOMER_CONFIRMATION' or offer_row.status<>'ACCEPTED' or offer_row.expires_at<=now() then raise exception 'offer cannot be confirmed' using errcode='23514'; end if;
  if not private.provider_is_job_eligible(offer_row.mechanic_id,request_row.id) then raise exception 'mechanic is not eligible' using errcode='42501'; end if;
  insert into public.service_request_assignments(service_request_id,job_offer_id,mechanic_id) values(request_row.id,offer_row.id,offer_row.mechanic_id) returning id into assignment_id;
  update public.service_requests set status='ASSIGNED',assigned_mechanic_id=offer_row.mechanic_id,assigned_at=now() where id=request_row.id;
  update public.job_offers set status='WITHDRAWN' where service_request_id=request_row.id and id<>offer_row.id and status in ('OFFERED','VIEWED');
  insert into public.service_request_events(service_request_id,event_type,actor_profile_id,mechanic_id,job_offer_id) values(request_row.id,'MECHANIC_SELECTED',user_id,offer_row.mechanic_id,offer_row.id),(request_row.id,'REQUEST_ASSIGNED',user_id,offer_row.mechanic_id,offer_row.id);
  return assignment_id;
end;$$;

create function public.cancel_service_request(p_request_id uuid,p_reason text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare user_id uuid:=(select auth.uid()); request_row public.service_requests%rowtype;
begin
  select * into request_row from public.service_requests where id=p_request_id for update;
  if request_row.id is null or request_row.customer_profile_id<>user_id then raise exception 'request access denied' using errcode='42501'; end if;
  if request_row.status in ('ACTIVE','CANCELLED','NO_MATCH','EXPIRED','REJECTED','CLOSED') then raise exception 'request cannot be cancelled' using errcode='23514'; end if;
  update public.service_requests set status='CANCELLED',cancellation_reason=p_reason where id=p_request_id;
  update public.job_offers set status='WITHDRAWN' where service_request_id=p_request_id and status in ('OFFERED','VIEWED');
  update public.service_request_assignments set status='CANCELLED',ended_at=now() where service_request_id=p_request_id and status='ASSIGNED';
  insert into public.service_request_events(service_request_id,event_type,actor_profile_id) values(p_request_id,'REQUEST_CANCELLED',user_id);
  return p_request_id;
end;$$;

create function private.activate_assigned_request(p_request_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.service_requests where id=p_request_id and status='ASSIGNED' for update;
  if not found then raise exception 'request is not assigned' using errcode='23514'; end if;
  update public.service_request_assignments set status='ACTIVE',activated_at=now() where service_request_id=p_request_id and status='ASSIGNED';
  update public.service_requests set status='ACTIVE' where id=p_request_id;
  insert into public.service_request_events(service_request_id,event_type) values(p_request_id,'REQUEST_ACTIVATED');
  return p_request_id;
end;$$;

create function private.is_request_customer(p_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.service_requests r where r.id=p_request_id and r.customer_profile_id=(select auth.uid()));
$$;
create function private.has_request_offer(p_request_id uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.job_offers o join public.professional_profiles p on p.id=o.mechanic_id where o.service_request_id=p_request_id and p.profile_id=(select auth.uid()));
$$;

drop policy service_requests_read_customer_org_or_admin on public.service_requests;
drop policy service_requests_create_owner on public.service_requests;
drop policy service_requests_update_customer_or_admin on public.service_requests;
revoke insert on public.service_requests from authenticated;
revoke update(status,customer_note) on public.service_requests from authenticated;
create policy service_requests_read_authorized on public.service_requests for select to authenticated using (
  customer_profile_id=(select auth.uid())
  or exists(select 1 from public.professional_profiles p where p.id=service_requests.assigned_mechanic_id and p.profile_id=(select auth.uid()))
  or private.has_request_offer(id)
  or private.is_cn_admin()
);

alter table public.job_offers enable row level security;
alter table public.service_request_assignments enable row level security;
alter table public.service_request_events enable row level security;
revoke all on public.job_offers,public.service_request_assignments,public.service_request_events from public,anon,authenticated;
grant select on public.job_offers,public.service_request_assignments to authenticated;
grant all on public.job_offers,public.service_request_assignments,public.service_request_events to service_role;
create policy job_offers_read_authorized on public.job_offers for select to authenticated using (
  exists(select 1 from public.professional_profiles p where p.id=job_offers.mechanic_id and p.profile_id=(select auth.uid()))
  or (job_offers.status='ACCEPTED' and private.is_request_customer(service_request_id))
  or private.is_cn_admin()
);
create policy assignments_read_authorized on public.service_request_assignments for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id=service_request_assignments.service_request_id and r.customer_profile_id=(select auth.uid()))
  or exists(select 1 from public.professional_profiles p where p.id=service_request_assignments.mechanic_id and p.profile_id=(select auth.uid()))
  or private.is_cn_admin()
);

create trigger job_offers_updated_at before update on public.job_offers for each row execute function private.set_updated_at();
create trigger assignments_updated_at before update on public.service_request_assignments for each row execute function private.set_updated_at();

revoke all on function public.create_marketplace_service_request(uuid,uuid,text,uuid,uuid,text,text,text,text,text,numeric,numeric,text,timestamptz,timestamptz,text,boolean,text),public.respond_to_job_offer(uuid,boolean,text),public.confirm_job_offer(uuid),public.cancel_service_request(uuid,text) from public,anon,authenticated;
grant execute on function public.create_marketplace_service_request(uuid,uuid,text,uuid,uuid,text,text,text,text,text,numeric,numeric,text,timestamptz,timestamptz,text,boolean,text),public.respond_to_job_offer(uuid,boolean,text),public.confirm_job_offer(uuid),public.cancel_service_request(uuid,text) to authenticated;
revoke all on function private.provider_is_job_eligible(uuid,uuid),private.find_eligible_providers(uuid,integer),private.create_job_offers(uuid,uuid[],timestamptz),private.activate_assigned_request(uuid) from public,anon,authenticated;
grant execute on function private.find_eligible_providers(uuid,integer),private.create_job_offers(uuid,uuid[],timestamptz),private.activate_assigned_request(uuid) to service_role;
revoke all on function private.is_request_customer(uuid),private.has_request_offer(uuid) from public,anon,authenticated;
grant execute on function private.is_request_customer(uuid),private.has_request_offer(uuid) to authenticated;
grant usage on schema private to service_role;
