create function public.update_request_details(
  target_request_id uuid,
  new_recipient_name text,
  new_phone text,
  new_email text,
  new_address text,
  new_household_size integer,
  requested_box_weight_lbs integer,
  new_instructions text
)
returns public.distribution_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request public.distribution_requests;
  changed public.distribution_requests;
  admin_edit boolean := public.is_admin();
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to update a request';
  end if;

  select * into current_request
  from public.distribution_requests
  where id = target_request_id
  for update;

  if current_request.id is null then
    raise exception 'Request not found';
  end if;

  if not admin_edit and (
    current_request.owner_id <> auth.uid()
    or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'recipient', false) is false
  ) then
    raise exception 'Only the recipient or an admin can update this request';
  end if;

  if current_request.status not in ('submitted', 'under_review') then
    raise exception 'Only submitted requests can be edited';
  end if;

  if length(trim(new_recipient_name)) = 0
    or length(trim(new_phone)) = 0
    or length(trim(new_email)) = 0
    or length(trim(new_address)) = 0
    or length(trim(new_instructions)) = 0 then
    raise exception 'Request details cannot be empty';
  end if;

  if new_household_size < 1 then
    raise exception 'Household size must be at least 1';
  end if;

  if admin_edit and requested_box_weight_lbs < 1 then
    raise exception 'Box weight must be at least 1';
  end if;

  update public.distribution_requests
  set
    recipient_name = trim(new_recipient_name),
    phone = trim(new_phone),
    email = trim(new_email),
    address = trim(new_address),
    household_size = new_household_size,
    box_weight_lbs = case
      when admin_edit then requested_box_weight_lbs
      else new_household_size * 7
    end,
    instructions = trim(new_instructions)
  where id = target_request_id
  returning * into changed;

  return changed;
end;
$$;

revoke all on function public.update_request_details(uuid, text, text, text, text, integer, integer, text) from public;
grant execute on function public.update_request_details(uuid, text, text, text, text, integer, integer, text) to authenticated;
revoke execute on function public.update_request_details(uuid, text, text, text, text, integer, integer, text) from anon;
