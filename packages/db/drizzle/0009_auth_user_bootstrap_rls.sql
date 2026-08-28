DROP POLICY IF EXISTS users_own_row ON users;
CREATE POLICY users_own_row ON users
  FOR ALL
  USING (
    id = nullif(current_setting('lumi.user_id', true), '')::uuid
    OR auth_user_id = current_setting('lumi.auth_user_id', true)
  )
  WITH CHECK (
    id = nullif(current_setting('lumi.user_id', true), '')::uuid
    OR auth_user_id = current_setting('lumi.auth_user_id', true)
  );

DROP POLICY IF EXISTS courses_enrolled ON courses;
CREATE POLICY courses_enrolled ON courses
  FOR ALL
  USING (
    owner_user_id = nullif(current_setting('lumi.user_id', true), '')::uuid
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = courses.id
        AND e.user_id = nullif(current_setting('lumi.user_id', true), '')::uuid
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS enrollments_own_or_course ON enrollments;
CREATE POLICY enrollments_own_or_course ON enrollments
  FOR ALL
  USING (user_id = nullif(current_setting('lumi.user_id', true), '')::uuid);
