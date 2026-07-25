create function public.bulk_set_request_status(
  target_request_ids uuid[],
  new_status public.request_status
)
returns setof public.distribution_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request public.distribution_requests;
  request_id uuid;
  required_status public.request_status;
begin
  if not public.is_admin() then
    raise exception 'Only admins can update requests in bulk';
  end if;

  if coalesce(cardinality(target_request_ids), 0) < 1
    or cardinality(target_request_ids) > 200 then
    raise exception 'Select between 1 and 200 requests';
  end if;

  if new_status = 'under_review' then
    required_status := 'submitted';
  elsif new_status = 'approved' then
    required_status := 'under_review';
  else
    raise exception 'Unsupported bulk request status';
  end if;

  foreach request_id in array target_request_ids
  loop
    select * into current_request
    from public.distribution_requests
    where id = request_id
    for update;

    if current_request.id is null or current_request.status <> required_status then
      raise exception 'A selected request has already moved to another status';
    end if;

    update public.distribution_requests
    set status = new_status, assigned_driver_id = null
    where id = request_id
    returning * into current_request;

    return next current_request;
  end loop;
end;
$$;

create function public.bulk_assign_deliveries(
  target_request_ids uuid[],
  target_driver_id uuid
)
returns setof public.distribution_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned public.distribution_requests;
  request_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can assign deliveries in bulk';
  end if;

  if coalesce(cardinality(target_request_ids), 0) < 1
    or cardinality(target_request_ids) > 200 then
    raise exception 'Select between 1 and 200 requests';
  end if;

  foreach request_id in array target_request_ids
  loop
    select * into assigned
    from public.assign_delivery(request_id, target_driver_id);
    return next assigned;
  end loop;
end;
$$;

revoke all on function public.bulk_set_request_status(uuid[], public.request_status) from public;
grant execute on function public.bulk_set_request_status(uuid[], public.request_status) to authenticated;
revoke execute on function public.bulk_set_request_status(uuid[], public.request_status) from anon;

revoke all on function public.bulk_assign_deliveries(uuid[], uuid) from public;
grant execute on function public.bulk_assign_deliveries(uuid[], uuid) to authenticated;
revoke execute on function public.bulk_assign_deliveries(uuid[], uuid) from anon;
