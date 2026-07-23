revoke execute on function public.activate_season(text, date, date) from anon;
revoke execute on function public.assign_delivery(uuid, uuid) from anon;
revoke execute on function public.claim_delivery(uuid) from anon;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.is_approved_driver(uuid) from anon;
revoke execute on function public.set_delivery_status(uuid, public.request_status) from anon;
revoke execute on function public.unclaim_delivery(uuid) from anon;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

create index delivery_events_actor_idx on public.delivery_events (actor_id);
create index driver_applications_reviewed_by_idx on public.driver_applications (reviewed_by);

drop policy "admins manage seasons" on public.seasons;

create policy "admins insert seasons"
on public.seasons for insert to authenticated
with check ((select public.is_admin()));

create policy "admins update seasons"
on public.seasons for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

create policy "admins delete seasons"
on public.seasons for delete to authenticated
using ((select public.is_admin()));

drop policy "users read their driver application" on public.driver_applications;
drop policy "users create their driver application" on public.driver_applications;
drop policy "users resubmit a denied driver application" on public.driver_applications;
drop policy "admins update driver applications" on public.driver_applications;

create policy "users and admins read driver applications"
on public.driver_applications for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "users create their driver application"
on public.driver_applications for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending');

create policy "users and admins update driver applications"
on public.driver_applications for update to authenticated
using (
  (select public.is_admin())
  or (user_id = (select auth.uid()) and status = 'denied')
)
with check (
  (select public.is_admin())
  or (
    user_id = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  )
);

drop policy "recipients read their requests" on public.distribution_requests;
drop policy "approved drivers read available and assigned requests" on public.distribution_requests;
drop policy "admins read all requests" on public.distribution_requests;
drop policy "recipients create their requests" on public.distribution_requests;

create policy "authorized users read requests"
on public.distribution_requests for select to authenticated
using (
  owner_id = (select auth.uid())
  or (select public.is_admin())
  or (
    (select public.is_approved_driver((select auth.uid())))
    and (
      status in ('approved', 'not_delivered')
      or assigned_driver_id = (select auth.uid())
    )
  )
);

create policy "recipients create their requests"
on public.distribution_requests for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and status = 'submitted'
  and assigned_driver_id is null
);

drop policy "admins update requests" on public.distribution_requests;

create policy "admins update requests"
on public.distribution_requests for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy "request participants read delivery events" on public.delivery_events;

create policy "request participants read delivery events"
on public.delivery_events for select to authenticated
using (
  (select public.is_admin())
  or actor_id = (select auth.uid())
  or exists (
    select 1
    from public.distribution_requests request
    where request.id = delivery_events.request_id
      and (
        request.owner_id = (select auth.uid())
        or request.assigned_driver_id = (select auth.uid())
      )
  )
);
