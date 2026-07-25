drop function public.set_delivery_status(uuid, public.request_status);

create function public.set_delivery_status(
  target_request_id uuid,
  next_status public.request_status,
  status_note text default null
)
returns public.distribution_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request public.distribution_requests;
  changed public.distribution_requests;
begin
  select * into current_request
  from public.distribution_requests
  where id = target_request_id
  for update;

  if current_request.id is null then
    raise exception 'Delivery not found';
  end if;

  if not public.is_admin() and current_request.assigned_driver_id <> auth.uid() then
    raise exception 'Only the assigned driver can update this delivery';
  end if;

  if next_status not in ('heading_to_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'not_delivered') then
    raise exception 'Unsupported delivery status';
  end if;

  if next_status = 'heading_to_pickup' and current_request.status <> 'driver_assigned' then
    raise exception 'Delivery must be assigned before pickup starts';
  end if;

  if next_status = 'picked_up' and current_request.status not in ('driver_assigned', 'heading_to_pickup') then
    raise exception 'Driver must be assigned before confirming pickup';
  end if;

  if next_status = 'out_for_delivery' and current_request.status <> 'picked_up' then
    raise exception 'Delivery must be picked up before starting the route';
  end if;

  if next_status in ('delivered', 'not_delivered') and current_request.status <> 'out_for_delivery' then
    raise exception 'Delivery is not ready to be completed';
  end if;

  if next_status = 'not_delivered' and (status_note is null or length(trim(status_note)) < 5) then
    raise exception 'A delivery failure reason of at least 5 characters is required';
  end if;

  if status_note is not null and length(trim(status_note)) > 500 then
    raise exception 'Delivery notes must be 500 characters or fewer';
  end if;

  update public.distribution_requests
  set status = next_status
  where id = target_request_id
  returning * into changed;

  insert into public.delivery_events (request_id, actor_id, event_type, from_status, to_status, notes)
  values (
    changed.id,
    auth.uid(),
    'status_changed',
    current_request.status,
    changed.status,
    case when next_status = 'not_delivered' then trim(status_note) else null end
  );

  return changed;
end;
$$;

revoke all on function public.set_delivery_status(uuid, public.request_status, text) from public;
grant execute on function public.set_delivery_status(uuid, public.request_status, text) to authenticated;
revoke execute on function public.set_delivery_status(uuid, public.request_status, text) from anon;
