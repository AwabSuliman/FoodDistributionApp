create or replace function public.unclaim_delivery(target_request_id uuid)
returns public.distribution_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  released public.distribution_requests;
  previous_status public.request_status;
begin
  select status into previous_status
  from public.distribution_requests
  where id = target_request_id
    and (assigned_driver_id = auth.uid() or public.is_admin())
    and status in ('driver_assigned', 'heading_to_pickup')
  for update;

  update public.distribution_requests
  set assigned_driver_id = null, status = 'approved'
  where id = target_request_id
    and (assigned_driver_id = auth.uid() or public.is_admin())
    and status in ('driver_assigned', 'heading_to_pickup')
  returning * into released;

  if released.id is null then
    raise exception 'Only the assigned driver or an admin can unclaim this delivery';
  end if;

  insert into public.delivery_events (request_id, actor_id, event_type, from_status, to_status)
  values (released.id, auth.uid(), 'unclaimed', previous_status, 'approved');

  return released;
end;
$$;

revoke execute on function public.unclaim_delivery(uuid) from anon;
