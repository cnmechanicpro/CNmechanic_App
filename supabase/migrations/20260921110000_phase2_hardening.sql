-- Phase 2 hardening: a location may advertise only an organization-enabled service.
create function private.validate_location_service() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.locations l join public.organization_services os on os.organization_id=l.organization_id where l.id=new.location_id and os.service_id=new.service_id and os.status='ACTIVE') then
    raise exception 'location service must be enabled by its organization' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_location_service() from public, anon, authenticated;
create trigger location_services_validate before insert or update on public.location_services for each row execute function private.validate_location_service();

create function private.prevent_orphaned_location_services() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'DELETE' or new.status <> 'ACTIVE') and exists (
    select 1 from public.locations l join public.location_services ls on ls.location_id = l.id
    where l.organization_id = old.organization_id and ls.service_id = old.service_id and ls.status = 'ACTIVE'
  ) then
    raise exception 'organization service has active location dependencies' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function private.prevent_orphaned_location_services() from public, anon, authenticated;
create trigger organization_services_dependency_guard before update or delete on public.organization_services for each row execute function private.prevent_orphaned_location_services();

-- Submission time is historical: it remains set after a submitted request closes or is cancelled.
alter table public.service_requests drop constraint service_requests_check;
alter table public.service_requests add constraint service_requests_submission_history_check
  check (status <> 'SUBMITTED' or submitted_at is not null);
alter table public.service_requests add constraint service_requests_closed_was_submitted_check
  check (status <> 'CLOSED' or submitted_at is not null);
