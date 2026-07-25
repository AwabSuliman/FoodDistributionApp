alter table public.seasons
add column accepting_requests boolean not null default true;

create function public.set_request_intake(accepting_requests boolean)
returns public.seasons
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed public.seasons;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage request intake';
  end if;

  update public.seasons
  set accepting_requests = set_request_intake.accepting_requests
  where is_active
  returning * into changed;

  if changed.id is null then
    raise exception 'There is no active distribution season';
  end if;

  return changed;
end;
$$;

revoke all on function public.set_request_intake(boolean) from public;
grant execute on function public.set_request_intake(boolean) to authenticated;
revoke execute on function public.set_request_intake(boolean) from anon;
