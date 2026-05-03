-- Drop every policy on projects regardless of name, then recreate cleanly
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'projects' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON projects', pol.policyname);
  END LOOP;
END;
$$;

-- SELECT: only non-deleted rows visible
CREATE POLICY "projects: select own"
  ON projects FOR SELECT USING (
    auth.uid() = consultant_id
    AND deleted_at IS NULL
  );

-- INSERT
CREATE POLICY "projects: insert own"
  ON projects FOR INSERT WITH CHECK (auth.uid() = consultant_id);

-- UPDATE: explicit WITH CHECK so soft-delete (setting deleted_at) is allowed
CREATE POLICY "projects: update own"
  ON projects FOR UPDATE
  USING (auth.uid() = consultant_id)
  WITH CHECK (auth.uid() = consultant_id);

-- DELETE (hard delete)
CREATE POLICY "projects: delete own"
  ON projects FOR DELETE USING (auth.uid() = consultant_id);
