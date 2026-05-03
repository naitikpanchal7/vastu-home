-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule nightly cleanup at 3am: permanently delete anything
-- soft-deleted more than 15 days ago, for both projects and reports
SELECT cron.schedule(
  'purge-soft-deleted',
  '0 3 * * *',
  $$
    DELETE FROM projects WHERE deleted_at < NOW() - INTERVAL '15 days';
    DELETE FROM reports  WHERE deleted_at < NOW() - INTERVAL '15 days';
  $$
);
