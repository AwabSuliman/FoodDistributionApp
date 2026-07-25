do $$
declare
  publication_table text;
begin
  foreach publication_table in array array[
    'delivery_events',
    'distribution_requests',
    'driver_applications',
    'seasons'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = publication_table
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        publication_table
      );
    end if;
  end loop;
end;
$$;
