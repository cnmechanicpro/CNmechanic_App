-- Supabase's pre-existing automatic RLS event trigger runs only on DDL events.
-- It does not need Data API EXECUTE access from application roles.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
