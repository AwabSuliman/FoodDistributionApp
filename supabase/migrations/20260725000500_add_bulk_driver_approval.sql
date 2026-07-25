create function public.bulk_approve_driver_applications(target_user_ids uuid[])
returns setof public.driver_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  application public.driver_applications;
  target_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve driver applications';
  end if;

  if coalesce(cardinality(target_user_ids), 0) < 1
    or cardinality(target_user_ids) > 200 then
    raise exception 'Select between 1 and 200 driver applications';
  end if;

  foreach target_user_id in array target_user_ids
  loop
    select * into application
    from public.driver_applications
    where user_id = target_user_id
    for update;

    if application.id is null or application.status <> 'pending' then
      raise exception 'A selected driver application has already been reviewed';
    end if;

    update public.driver_applications
    set
      status = 'approved',
      reviewed_by = auth.uid(),
      reviewed_at = now()
    where user_id = target_user_id
    returning * into application;

    return next application;
  end loop;
end;
$$;

revoke all on function public.bulk_approve_driver_applications(uuid[]) from public;
grant execute on function public.bulk_approve_driver_applications(uuid[]) to authenticated;
revoke execute on function public.bulk_approve_driver_applications(uuid[]) from anon;
