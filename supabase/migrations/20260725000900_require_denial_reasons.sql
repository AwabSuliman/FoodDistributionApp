alter table public.distribution_requests
  add column decision_note text;

alter table public.driver_applications
  add column decision_note text;

update public.distribution_requests
set decision_note = 'Not approved by the admin team.'
where status = 'denied';

update public.driver_applications
set decision_note = 'Not approved by the admin team.'
where status = 'denied';

alter table public.distribution_requests
  add constraint distribution_requests_decision_note_length
  check (decision_note is null or char_length(trim(decision_note)) between 5 and 400),
  add constraint distribution_requests_denial_requires_note
  check (
    (status = 'denied' and decision_note is not null)
    or (status <> 'denied' and decision_note is null)
  );

alter table public.driver_applications
  add constraint driver_applications_decision_note_length
  check (decision_note is null or char_length(trim(decision_note)) between 5 and 400),
  add constraint driver_applications_denial_requires_note
  check (
    (status = 'denied' and decision_note is not null)
    or (status <> 'denied' and decision_note is null)
  );

create or replace function public.deny_request(
  target_request_id uuid,
  denial_reason text
)
returns public.distribution_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  denied_request public.distribution_requests;
begin
  if not public.is_admin() then
    raise exception 'Only admins can deny requests';
  end if;

  if denial_reason is null
    or char_length(trim(denial_reason)) < 5
    or char_length(trim(denial_reason)) > 400 then
    raise exception 'A denial reason between 5 and 400 characters is required';
  end if;

  select * into denied_request
  from public.distribution_requests
  where id = target_request_id
  for update;

  if denied_request.id is null or denied_request.status <> 'under_review' then
    raise exception 'This request is no longer awaiting a decision';
  end if;

  update public.distribution_requests
  set
    assigned_driver_id = null,
    decision_note = trim(denial_reason),
    status = 'denied'
  where id = target_request_id
  returning * into denied_request;

  return denied_request;
end;
$$;

create or replace function public.deny_driver_application(
  target_user_id uuid,
  denial_reason text
)
returns public.driver_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  denied_application public.driver_applications;
begin
  if not public.is_admin() then
    raise exception 'Only admins can deny driver applications';
  end if;

  if denial_reason is null
    or char_length(trim(denial_reason)) < 5
    or char_length(trim(denial_reason)) > 400 then
    raise exception 'A denial reason between 5 and 400 characters is required';
  end if;

  select * into denied_application
  from public.driver_applications
  where user_id = target_user_id
  for update;

  if denied_application.id is null or denied_application.status <> 'pending' then
    raise exception 'This driver application has already been reviewed';
  end if;

  update public.driver_applications
  set
    decision_note = trim(denial_reason),
    reviewed_at = now(),
    reviewed_by = auth.uid(),
    status = 'denied'
  where user_id = target_user_id
  returning * into denied_application;

  return denied_application;
end;
$$;

create or replace function public.audit_distribution_request()
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
      to_status,
      notes
    )
    values (
      new.id,
      auth.uid(),
      'request_status_changed',
      old.status,
      new.status,
      case when new.status = 'denied' then new.decision_note else null end
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

create or replace function public.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_request text := 'MWI-' || new.request_number;
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, kind, title, message, request_id)
    values (
      new.owner_id,
      'request',
      'Request received',
      display_request || ' was submitted for mosque review.',
      new.id
    );

    insert into public.notifications (user_id, kind, title, message, request_id)
    select
      staff.id,
      'request',
      'New food request',
      display_request || ' is ready for review.',
      new.id
    from auth.users staff
    where staff.raw_app_meta_data ->> 'role' = 'admin';

    return new;
  end if;

  if old.status is distinct from new.status then
    if new.status = 'approved' then
      insert into public.notifications (user_id, kind, title, message, request_id)
      values (
        new.owner_id,
        'request',
        'Request approved',
        display_request || ' was approved and is waiting for a driver.',
        new.id
      );

      insert into public.notifications (user_id, kind, title, message, request_id)
      select
        driver.user_id,
        'delivery',
        'Delivery available',
        display_request || ' is ready to be claimed.',
        new.id
      from public.driver_applications driver
      where driver.status = 'approved';
    elsif new.status = 'denied' then
      insert into public.notifications (user_id, kind, title, message, request_id)
      values (
        new.owner_id,
        'request',
        'Request not approved',
        display_request || ' was not approved. Reason: ' || new.decision_note,
        new.id
      );
    elsif new.status = 'out_for_delivery' then
      insert into public.notifications (user_id, kind, title, message, request_id)
      values (
        new.owner_id,
        'delivery',
        'Driver is on the way',
        display_request || ' is out for delivery.',
        new.id
      );
    elsif new.status = 'delivered' then
      insert into public.notifications (user_id, kind, title, message, request_id)
      values (
        new.owner_id,
        'delivery',
        'Delivery completed',
        display_request || ' was marked delivered.',
        new.id
      );
    elsif new.status = 'not_delivered' then
      insert into public.notifications (user_id, kind, title, message, request_id)
      values (
        new.owner_id,
        'delivery',
        'Another delivery attempt is needed',
        display_request || ' could not be delivered and returned to the driver queue.',
        new.id
      );

      insert into public.notifications (user_id, kind, title, message, request_id)
      select
        driver.user_id,
        'delivery',
        'Repeat delivery available',
        display_request || ' needs another delivery attempt.',
        new.id
      from public.driver_applications driver
      where driver.status = 'approved';
    end if;
  end if;

  if new.assigned_driver_id is distinct from old.assigned_driver_id
    and new.assigned_driver_id is not null
    and new.assigned_driver_id is distinct from auth.uid()
  then
    insert into public.notifications (user_id, kind, title, message, request_id)
    values (
      new.assigned_driver_id,
      'delivery',
      'Delivery assigned to you',
      display_request || ' was assigned to your route.',
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_driver_application_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
    or (old.status = 'denied' and new.status = 'pending')
  then
    insert into public.notifications (user_id, kind, title, message)
    select
      staff.id,
      'driver',
      'New driver application',
      new.name || ' is waiting for approval.'
    from auth.users staff
    where staff.raw_app_meta_data ->> 'role' = 'admin';
  end if;

  if tg_op = 'UPDATE'
    and old.status = 'pending'
    and new.status in ('approved', 'denied')
  then
    insert into public.notifications (user_id, kind, title, message)
    values (
      new.user_id,
      'driver',
      case when new.status = 'approved' then 'Driver application approved' else 'Driver application not approved' end,
      case
        when new.status = 'approved' then 'You can now view and claim available deliveries.'
        else 'Your application was not approved. Reason: ' || new.decision_note
      end
    );
  end if;

  return new;
end;
$$;

revoke all on function public.deny_request(uuid, text) from public, anon;
revoke all on function public.deny_driver_application(uuid, text) from public, anon;
grant execute on function public.deny_request(uuid, text) to authenticated;
grant execute on function public.deny_driver_application(uuid, text) to authenticated;
