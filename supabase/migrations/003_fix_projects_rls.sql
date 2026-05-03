-- Fix: split FOR ALL policy into separate policies so soft-delete (UPDATE setting deleted_at) works
DROP POLICY IF EXISTS "projects: all own, exclude soft-deleted" ON projects;

CREATE POLICY "projects: select own"
  ON projects FOR SELECT USING (
    auth.uid() = consultant_id
    AND deleted_at IS NULL
  );

CREATE POLICY "projects: insert own"
  ON projects FOR INSERT WITH CHECK (auth.uid() = consultant_id);

CREATE POLICY "projects: update own"
  ON projects FOR UPDATE USING (auth.uid() = consultant_id);

CREATE POLICY "projects: delete own"
  ON projects FOR DELETE USING (auth.uid() = consultant_id);
