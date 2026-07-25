begin;

insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('99999999-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'qa-recipient@invalid.test', '{"role":"recipient"}', '{"name":"QA Recipient","role":"recipient"}', now(), now()),
  ('99999999-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'qa-driver-one@invalid.test', '{}', '{"name":"QA Driver One","role":"driver"}', now(), now()),
  ('99999999-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'qa-driver-two@invalid.test', '{}', '{"name":"QA Driver Two","role":"driver"}', now(), now()),
  ('99999999-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'qa-admin@invalid.test', '{"role":"admin"}', '{"name":"QA Admin","role":"recipient"}', now(), now());

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000101","role":"authenticated","app_metadata":{"role":"recipient"}}',
  true
);

insert into public.distribution_requests (
  id,
  owner_id,
  season_id,
  recipient_name,
  phone,
  email,
  address,
  household_size,
  box_weight_lbs,
  instructions
)
values (
  '99999999-0000-0000-0000-000000000201',
  '99999999-0000-0000-0000-000000000101',
  (select id from public.seasons where is_active limit 1),
  'QA Recipient',
  '555-0199',
  'qa-recipient@invalid.test',
  '100 QA Test Lane',
  4,
  28,
  'Temporary RLS verification request'
);

do $$
declare
  visible_notifications integer;
  visible_requests integer;
  visible_applications integer;
begin
  select count(*) into visible_requests from public.distribution_requests;
  select count(*) into visible_applications from public.driver_applications;
  select count(*) into visible_notifications from public.notifications;
  if visible_requests <> 1 then raise exception 'recipient cannot read own request'; end if;
  if visible_applications <> 0 then raise exception 'recipient can read driver applications'; end if;
  if visible_notifications < 1 then raise exception 'recipient cannot read own notifications'; end if;
end;
$$;

do $$
declare
  outbox_read_was_blocked boolean := false;
begin
  begin
    perform count(*) from public.email_outbox;
  exception when others then
    outbox_read_was_blocked := true;
  end;

  if not outbox_read_was_blocked then
    raise exception 'recipient can read the private email outbox';
  end if;
end;
$$;

select public.update_request_details(
  '99999999-0000-0000-0000-000000000201',
  'QA Recipient Updated',
  '555-0198',
  'qa-recipient-updated@invalid.test',
  '101 QA Test Lane',
  5,
  999,
  'Updated by the request owner'
);

do $$
declare
  updated_address text;
  updated_box_weight integer;
begin
  select address, box_weight_lbs into updated_address, updated_box_weight
  from public.distribution_requests
  where id = '99999999-0000-0000-0000-000000000201';

  if updated_address <> '101 QA Test Lane' then raise exception 'recipient request edit was not saved'; end if;
  if updated_box_weight <> 35 then raise exception 'recipient changed the calculated box weight'; end if;
end;
$$;

do $$
declare
  driver_application_was_blocked boolean := false;
begin
  begin
    insert into public.driver_applications (user_id, name, phone, email)
    values (
      '99999999-0000-0000-0000-000000000101',
      'QA Recipient',
      '555-0199',
      'qa-recipient-driver@invalid.test'
    );
  exception when others then
    driver_application_was_blocked := true;
  end;

  if not driver_application_was_blocked then
    raise exception 'recipient created a driver application';
  end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{"role":"driver"}}',
  true
);

do $$
declare
  claim_was_blocked boolean := false;
  request_edit_was_blocked boolean := false;
  visible_notifications integer;
  visible_requests integer;
begin
  select count(*) into visible_requests from public.distribution_requests;
  select count(*) into visible_notifications from public.notifications;
  if visible_requests <> 0 then raise exception 'unapproved driver can read requests'; end if;
  if visible_notifications <> 0 then raise exception 'driver can read another user notifications'; end if;

  begin
    perform public.claim_delivery('99999999-0000-0000-0000-000000000201');
  exception when others then
    claim_was_blocked := true;
  end;

  if not claim_was_blocked then raise exception 'unapproved driver can claim requests'; end if;

  begin
    perform public.update_request_details(
      '99999999-0000-0000-0000-000000000201',
      'Driver Edit',
      '555-0000',
      'driver-edit@invalid.test',
      'Driver Edit Lane',
      1,
      7,
      'Driver should not be able to edit'
    );
  exception when others then
    request_edit_was_blocked := true;
  end;

  if not request_edit_was_blocked then raise exception 'driver edited a recipient request'; end if;
end;
$$;

do $$
declare
  recipient_request_was_blocked boolean := false;
begin
  begin
    insert into public.distribution_requests (
      owner_id,
      season_id,
      recipient_name,
      phone,
      email,
      address,
      household_size,
      box_weight_lbs,
      instructions
    )
    values (
      '99999999-0000-0000-0000-000000000102',
      (select id from public.seasons where is_active limit 1),
      'QA Driver One',
      '555-0102',
      'qa-driver-request@invalid.test',
      '102 QA Test Lane',
      2,
      14,
      'Role enforcement verification'
    );
  exception when others then
    recipient_request_was_blocked := true;
  end;

  if not recipient_request_was_blocked then
    raise exception 'driver created a recipient request';
  end if;
end;
$$;

insert into public.driver_applications (user_id, name, phone, email)
values ('99999999-0000-0000-0000-000000000102', 'QA Driver One', '555-0102', 'qa-driver-one@invalid.test');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000103","role":"authenticated","app_metadata":{"role":"driver"}}',
  true
);

insert into public.driver_applications (user_id, name, phone, email)
values ('99999999-0000-0000-0000-000000000103', 'QA Driver Two', '555-0103', 'qa-driver-two@invalid.test');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000104","role":"authenticated","app_metadata":{"role":"admin"}}',
  true
);

select public.set_request_intake(false);

do $$
declare
  intake_is_open boolean;
begin
  select accepting_requests into intake_is_open from public.seasons where is_active;
  if intake_is_open then raise exception 'admin could not close request intake'; end if;
end;
$$;

select public.set_request_intake(true);

select public.bulk_approve_driver_applications(
  array[
    '99999999-0000-0000-0000-000000000102',
    '99999999-0000-0000-0000-000000000103'
  ]::uuid[]
);

select public.bulk_set_request_status(
  array['99999999-0000-0000-0000-000000000201']::uuid[],
  'under_review'
);
select public.bulk_set_request_status(
  array['99999999-0000-0000-0000-000000000201']::uuid[],
  'approved'
);

do $$
declare
  queued_emails bigint;
  visible_notifications integer;
  visible_requests integer;
  visible_applications integer;
begin
  select count(*) into visible_requests from public.distribution_requests;
  select count(*) into visible_applications from public.driver_applications;
  select count(*) into visible_notifications from public.notifications;
  select pending into queued_emails from public.email_delivery_summary();
  if visible_requests <> 1 then raise exception 'admin cannot read requests'; end if;
  if visible_applications <> 2 then raise exception 'admin cannot read driver applications'; end if;
  if visible_notifications < 1 then raise exception 'admin cannot read own notifications'; end if;
  if queued_emails < 1 then raise exception 'request email was not queued'; end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{"role":"driver"}}',
  true
);

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000104","role":"authenticated","app_metadata":{"role":"admin"}}',
  true
);
select public.bulk_assign_deliveries(
  array['99999999-0000-0000-0000-000000000201']::uuid[],
  '99999999-0000-0000-0000-000000000102'
);
select public.unclaim_delivery('99999999-0000-0000-0000-000000000201');

do $$
declare
  assigned_driver uuid;
  current_status public.request_status;
begin
  select assigned_driver_id, status into assigned_driver, current_status
  from public.distribution_requests
  where id = '99999999-0000-0000-0000-000000000201';

  if assigned_driver is not null then raise exception 'admin unclaim left a driver assigned'; end if;
  if current_status <> 'approved' then raise exception 'admin unclaim did not return request to approved'; end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{"role":"driver"}}',
  true
);
select public.claim_delivery('99999999-0000-0000-0000-000000000201');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000103","role":"authenticated","app_metadata":{"role":"driver"}}',
  true
);

do $$
declare
  second_claim_was_blocked boolean := false;
begin
  begin
    perform public.claim_delivery('99999999-0000-0000-0000-000000000201');
  exception when others then
    second_claim_was_blocked := true;
  end;

  if not second_claim_was_blocked then raise exception 'second driver claimed assigned request'; end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{"role":"driver"}}',
  true
);
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'heading_to_pickup');
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'picked_up');
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'out_for_delivery');

do $$
declare
  missing_reason_was_blocked boolean := false;
begin
  begin
    perform public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'not_delivered');
  exception when others then
    missing_reason_was_blocked := true;
  end;

  if not missing_reason_was_blocked then raise exception 'failed delivery accepted without a reason'; end if;
end;
$$;

select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'delivered');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000101","role":"authenticated","app_metadata":{"role":"recipient"}}',
  true
);

do $$
declare
  final_status public.request_status;
  lifecycle_events integer;
begin
  select status into final_status
  from public.distribution_requests
  where id = '99999999-0000-0000-0000-000000000201';
  if final_status <> 'delivered' then raise exception 'recipient cannot read delivered status'; end if;

  select count(*) into lifecycle_events
  from public.delivery_events
  where request_id = '99999999-0000-0000-0000-000000000201'
    and event_type in ('request_submitted', 'request_edited', 'request_status_changed');
  if lifecycle_events <> 4 then raise exception 'request lifecycle audit is incomplete'; end if;
end;
$$;

reset role;
rollback;

select 'RLS integration checks passed' as result;
