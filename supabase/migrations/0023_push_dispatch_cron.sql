-- Schedule push-dispatch every 15 minutes via pg_cron + pg_net.
-- The Edge Function auth secret is read from Vault (not stored in this file).
--
-- One-time after deploy (SQL editor), using the SAME value as Edge secret PUSH_DISPATCH_SECRET:
--   select vault.create_secret('your-long-random-string', 'push_dispatch_secret');
--
-- Re-run safely: job is unscheduled then recreated; project_url vault entry is created if missing.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- Public project API URL for Edge Function invokes (not a credential).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret(
      'https://lmvlipcnbehayebnyumq.supabase.co',
      'project_url',
      'Supabase project API URL for scheduled Edge Function calls'
    );
  end if;
end $$;

-- Drop previous schedule if present (name is unique).
do $$
declare
  jid bigint;
begin
  select jobid into jid from cron.job where jobname = 'push-dispatch-every-15m';
  if jid is not null then
    perform cron.unschedule(jid);
  end if;
end $$;

select
  cron.schedule(
    'push-dispatch-every-15m',
    '*/15 * * * *',
    $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
             || '/functions/v1/push-dispatch',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')
      ),
      body := '{"mode":"cron"}'::jsonb,
      timeout_milliseconds := 60000
    );
    $$
  );
