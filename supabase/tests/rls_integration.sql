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
  visible_requests integer;
  visible_applications integer;
begin
  select count(*) into visible_requests from public.distribution_requests;
  select count(*) into visible_applications from public.driver_applications;
  if visible_requests <> 1 then raise exception 'recipient cannot read own request'; end if;
  if visible_applications <> 0 then raise exception 'recipient can read driver applications'; end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{}}',
  true
);

do $$
declare
  claim_was_blocked boolean := false;
  visible_requests integer;
begin
  select count(*) into visible_requests from public.distribution_requests;
  if visible_requests <> 0 then raise exception 'unapproved driver can read requests'; end if;

  begin
    perform public.claim_delivery('99999999-0000-0000-0000-000000000201');
  exception when others then
    claim_was_blocked := true;
  end;

  if not claim_was_blocked then raise exception 'unapproved driver can claim requests'; end if;
end;
$$;

insert into public.driver_applications (user_id, name, phone, email)
values ('99999999-0000-0000-0000-000000000102', 'QA Driver One', '555-0102', 'qa-driver-one@invalid.test');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000103","role":"authenticated","app_metadata":{}}',
  true
);

insert into public.driver_applications (user_id, name, phone, email)
values ('99999999-0000-0000-0000-000000000103', 'QA Driver Two', '555-0103', 'qa-driver-two@invalid.test');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000104","role":"authenticated","app_metadata":{"role":"admin"}}',
  true
);

update public.driver_applications
set status = 'approved', reviewed_by = '99999999-0000-0000-0000-000000000104', reviewed_at = now();

update public.distribution_requests set status = 'under_review'
where id = '99999999-0000-0000-0000-000000000201';
update public.distribution_requests set status = 'approved'
where id = '99999999-0000-0000-0000-000000000201';

do $$
declare
  visible_requests integer;
  visible_applications integer;
begin
  select count(*) into visible_requests from public.distribution_requests;
  select count(*) into visible_applications from public.driver_applications;
  if visible_requests <> 1 then raise exception 'admin cannot read requests'; end if;
  if visible_applications <> 2 then raise exception 'admin cannot read driver applications'; end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{}}',
  true
);
select public.claim_delivery('99999999-0000-0000-0000-000000000201');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000103","role":"authenticated","app_metadata":{}}',
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
  '{"sub":"99999999-0000-0000-0000-000000000102","role":"authenticated","app_metadata":{}}',
  true
);
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'heading_to_pickup');
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'picked_up');
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'out_for_delivery');
select public.set_delivery_status('99999999-0000-0000-0000-000000000201', 'delivered');

select set_config(
  'request.jwt.claims',
  '{"sub":"99999999-0000-0000-0000-000000000101","role":"authenticated","app_metadata":{"role":"recipient"}}',
  true
);

do $$
declare
  final_status public.request_status;
begin
  select status into final_status
  from public.distribution_requests
  where id = '99999999-0000-0000-0000-000000000201';
  if final_status <> 'delivered' then raise exception 'recipient cannot read delivered status'; end if;
end;
$$;

reset role;
rollback;

select 'RLS integration checks passed' as result;
