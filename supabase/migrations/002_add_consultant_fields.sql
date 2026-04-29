-- Add consultant summary fields to floors table
alter table floors
  add column if not exists consultant_summary text not null default '',
  add column if not exists consultant_actions  text not null default '';
