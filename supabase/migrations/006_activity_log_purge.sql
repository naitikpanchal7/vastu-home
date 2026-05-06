-- Nightly job: purge activity_logs older than 90 days.
-- Runs at 3am alongside the existing soft-delete purge job.
SELECT cron.schedule(
  'purge-activity-logs',
  '0 3 * * *',
  $$
    DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);
