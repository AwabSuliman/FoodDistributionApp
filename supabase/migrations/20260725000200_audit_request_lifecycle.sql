create function public.audit_distribution_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.delivery_events (
      request_id,
      actor_id,
      event_type,
      to_status
    )
    values (
      new.id,
      new.owner_id,
      'request_submitted',
      new.status
    );

    return new;
  end if;

  if (
    (old.status = 'submitted' and new.status = 'under_review')
    or (old.status = 'under_review' and new.status in ('approved', 'denied'))
  ) then
    insert into public.delivery_events (
      request_id,
      actor_id,
      event_type,
      from_status,
      to_status
    )
    values (
      new.id,
      auth.uid(),
      'request_status_changed',
      old.status,
      new.status
    );
  end if;

  if row(
    old.recipient_name,
    old.phone,
    old.email,
    old.address,
    old.household_size,
    old.box_weight_lbs,
    old.instructions
  ) is distinct from row(
    new.recipient_name,
    new.phone,
    new.email,
    new.address,
    new.household_size,
    new.box_weight_lbs,
    new.instructions
  ) then
    insert into public.delivery_events (
      request_id,
      actor_id,
      event_type,
      notes
    )
    values (
      new.id,
      auth.uid(),
      'request_edited',
      case when public.is_admin() then 'admin' else 'recipient' end
    );
  end if;

  return new;
end;
$$;

revoke all on function public.audit_distribution_request() from public, anon, authenticated;

create trigger distribution_requests_audit
after insert or update on public.distribution_requests
for each row execute function public.audit_distribution_request();
