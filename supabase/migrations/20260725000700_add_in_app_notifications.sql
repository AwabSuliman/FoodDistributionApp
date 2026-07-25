create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('request', 'delivery', 'driver')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  message text not null check (char_length(trim(message)) between 1 and 500),
  request_id uuid references public.distribution_requests(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;

create policy "users read their notifications"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.mark_notification_read(target_notification_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = target_notification_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and read_at is null;
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
        display_request || ' was not approved. Contact the mosque with any questions.',
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
        else 'Contact the mosque if you have questions about your application.'
      end
    );
  end if;

  return new;
end;
$$;

create trigger distribution_requests_send_notifications
after insert or update on public.distribution_requests
for each row execute function public.notify_request_change();

create trigger driver_applications_send_notifications
after insert or update on public.driver_applications
for each row execute function public.notify_driver_application_change();

revoke all on function public.mark_notification_read(bigint) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.notify_request_change() from public, anon, authenticated;
revoke all on function public.notify_driver_application_change() from public, anon, authenticated;
grant execute on function public.mark_notification_read(bigint) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;
