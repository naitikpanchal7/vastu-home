-- ============================================================
-- vastu@home — User Suspension Support
-- ============================================================

alter table profiles add column if not exists suspended_at timestamptz;
alter table profiles add column if not exists suspension_reason text;
