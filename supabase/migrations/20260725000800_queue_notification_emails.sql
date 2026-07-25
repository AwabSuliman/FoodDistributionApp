create table public.email_outbox (
  id bigint generated always as identity primary key,
  notification_id bigint not null unique references public.notifications(id) on delete cascade,
  recipient_email text not null check (char_length(trim(recipient_email)) between 3 and 254),
  subject text not null check (char_length(trim(subject)) between 1 and 200),
  text_body text not null check (char_length(trim(text_body)) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index email_outbox_ready_idx
  on public.email_outbox (next_attempt_at, created_at)
  where status = 'pending';

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;

create trigger email_outbox_set_updated_at
before update on public.email_outbox
for each row execute function public.set_updated_at();

create or replace function public.enqueue_notification_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  destination_email text;
begin
  if new.title not in (
    'Request received',
    'Request approved',
    'Request not approved',
    'Driver is on the way',
    'Delivery completed',
    'Another delivery attempt is needed',
    'Delivery assigned to you',
    'Driver application approved',
    'Driver application not approved'
  ) then
    return new;
  end if;

  select email into destination_email
  from auth.users
  where id = new.user_id;

  if destination_email is null or length(trim(destination_email)) = 0 then
    return new;
  end if;

  insert into public.email_outbox (
    notification_id,
    recipient_email,
    subject,
    text_body
  )
  values (
    new.id,
    trim(destination_email),
    'Zakatul Fitr: ' || new.title,
    new.message
  )
  on conflict (notification_id) do nothing;

  return new;
end;
$$;

create trigger notifications_queue_email
after insert on public.notifications
for each row execute function public.enqueue_notification_email();

create or replace function public.claim_email_outbox(batch_size integer default 20)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if batch_size < 1 or batch_size > 50 then
    raise exception 'Batch size must be between 1 and 50';
  end if;

  return query
  with ready as (
    select queued.id
    from public.email_outbox queued
    where queued.attempts < 5
      and (
        (queued.status = 'pending' and queued.next_attempt_at <= now())
        or (
          queued.status = 'processing'
          and queued.locked_at < now() - interval '10 minutes'
        )
      )
    order by queued.created_at
    for update skip locked
    limit batch_size
  )
  update public.email_outbox queued
  set
    last_error = null,
    locked_at = now(),
    status = 'processing'
  from ready
  where queued.id = ready.id
  returning queued.*;
end;
$$;

create or replace function public.complete_email_outbox(
  target_outbox_id bigint,
  resend_message_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.email_outbox
  set
    last_error = null,
    locked_at = null,
    provider_message_id = left(resend_message_id, 200),
    sent_at = now(),
    status = 'sent'
  where id = target_outbox_id
    and status = 'processing';
end;
$$;

create or replace function public.fail_email_outbox(
  target_outbox_id bigint,
  failure_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.email_outbox
  set
    attempts = attempts + 1,
    last_error = left(failure_message, 500),
    locked_at = null,
    next_attempt_at = now() + make_interval(mins => least(60, power(2, attempts + 1)::integer)),
    status = case when attempts + 1 >= 5 then 'failed' else 'pending' end
  where id = target_outbox_id
    and status = 'processing';
end;
$$;

create or replace function public.email_delivery_summary()
returns table (pending bigint, sent bigint, failed bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can view email delivery status';
  end if;

  return query
  select
    count(*) filter (where status in ('pending', 'processing')) as pending,
    count(*) filter (where status = 'sent') as sent,
    count(*) filter (where status = 'failed') as failed
  from public.email_outbox;
end;
$$;

revoke all on function public.enqueue_notification_email() from public, anon, authenticated;
revoke all on function public.claim_email_outbox(integer) from public, anon, authenticated;
revoke all on function public.complete_email_outbox(bigint, text) from public, anon, authenticated;
revoke all on function public.fail_email_outbox(bigint, text) from public, anon, authenticated;
revoke all on function public.email_delivery_summary() from public, anon;

grant select, update on public.email_outbox to service_role;
grant execute on function public.claim_email_outbox(integer) to service_role;
grant execute on function public.complete_email_outbox(bigint, text) to service_role;
grant execute on function public.fail_email_outbox(bigint, text) to service_role;
grant execute on function public.email_delivery_summary() to authenticated;
