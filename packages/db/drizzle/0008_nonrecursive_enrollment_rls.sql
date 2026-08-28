DROP POLICY IF EXISTS courses_enrolled ON courses;
CREATE POLICY courses_enrolled ON courses
  FOR ALL
  USING (
    owner_user_id = current_setting('lumi.user_id')::uuid
    OR EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = courses.id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS enrollments_own_or_course ON enrollments;
CREATE POLICY enrollments_own_or_course ON enrollments
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);
