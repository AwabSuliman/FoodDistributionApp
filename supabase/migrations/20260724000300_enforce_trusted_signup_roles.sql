create or replace function public.set_signup_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_role text;
begin
  if new.raw_app_meta_data ->> 'role' = 'admin' then
    return new;
  end if;

  signup_role := case
    when new.raw_user_meta_data ->> 'role' = 'driver' then 'driver'
    else 'recipient'
  end;

  new.raw_app_meta_data :=
    coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', signup_role);

  return new;
end;
$$;

revoke all on function public.set_signup_role() from public, anon, authenticated;

drop trigger if exists set_signup_role on auth.users;
create trigger set_signup_role
before insert on auth.users
for each row execute function public.set_signup_role();

update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'role',
    case
      when raw_user_meta_data ->> 'role' = 'driver' then 'driver'
      else 'recipient'
    end
  )
where coalesce(raw_app_meta_data ->> 'role', '') not in ('admin', 'driver', 'recipient');

drop policy "users create their driver application" on public.driver_applications;
drop policy "users and admins update driver applications" on public.driver_applications;

create policy "drivers create their application"
on public.driver_applications for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'driver'
);

create policy "drivers resubmit and admins review applications"
on public.driver_applications for update to authenticated
using (
  (select public.is_admin())
  or (
    user_id = (select auth.uid())
    and status = 'denied'
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'driver'
  )
)
with check (
  (select public.is_admin())
  or (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'driver'
  )
);

drop policy "recipients create their requests" on public.distribution_requests;

create policy "recipients create their requests"
on public.distribution_requests for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'submitted'
  and assigned_driver_id is null
  and (
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'recipient'
    or (select public.is_admin())
  )
);
