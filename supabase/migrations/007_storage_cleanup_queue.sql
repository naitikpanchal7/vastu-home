-- Storage files for soft-deleted projects/reports are not removed immediately —
-- they sit in this queue until the 15-day grace period expires, matching when
-- the DB rows are hard-deleted by the purge-soft-deleted cron job.
CREATE TABLE storage_cleanup_queue (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket        text        NOT NULL,
  path          text        NOT NULL,
  delete_after  timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only server-side code (service role) touches this table — no RLS needed.

CREATE INDEX storage_cleanup_queue_delete_after_idx ON storage_cleanup_queue(delete_after);
