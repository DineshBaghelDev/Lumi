-- T10 — RLS roles and policies
-- Enable row-level security on every application table and enforce
-- least-privilege access through role-scoped policies.

-- ─── Roles ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'lumi_migrator') THEN
    CREATE ROLE lumi_migrator WITH LOGIN SUPERUSER;
  END IF;
END
$$;

-- The migrator superuser owns public schema objects; restrict everyone else.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- ─── Grants ──────────────────────────────────────────────────────────
-- Auth role owns Better-Auth tables only.
GRANT USAGE ON SCHEMA public TO lumi_auth;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lumi_auth;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lumi_auth;

-- API role: full DML on application tables; cannot touch auth tables.
GRANT USAGE ON SCHEMA public TO lumi_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lumi_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lumi_api;
-- Explicitly deny auth tables to the API role.
REVOKE SELECT, INSERT, UPDATE, DELETE ON auth_user, auth_session, auth_account, auth_verification FROM lumi_api;

-- Worker role: BYPASSRLS (set at role creation), full DML.
GRANT USAGE ON SCHEMA public TO lumi_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO lumi_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO lumi_worker;
REVOKE SELECT, INSERT, UPDATE, DELETE ON auth_user, auth_session, auth_account, auth_verification FROM lumi_worker;

-- ─── Helper: set session variable ────────────────────────────────────
-- The API sets lumi.user_id per-request via beginRequestTransaction.
-- Policies reference current_setting('lumi.user_id').

-- ─── RLS on application tables ───────────────────────────────────────
-- Users can see their own row.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY users_own_row ON users
  FOR ALL
  USING (id = current_setting('lumi.user_id')::uuid);

-- Courses: visible if enrolled (any role, active status).
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
CREATE POLICY courses_enrolled ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = courses.id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Enrollments: visible for courses the user is enrolled in.
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments FORCE ROW LEVEL SECURITY;
CREATE POLICY enrollments_own_or_course ON enrollments
  FOR ALL
  USING (
    user_id = current_setting('lumi.user_id')::uuid
    OR EXISTS (
      SELECT 1 FROM enrollments e2
      WHERE e2.course_id = enrollments.course_id
        AND e2.user_id = current_setting('lumi.user_id')::uuid
        AND e2.status = 'active'
    )
  );

-- Course generation usage: follows course enrollment.
ALTER TABLE course_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_generation_usage FORCE ROW LEVEL SECURITY;
CREATE POLICY cgu_course_enrolled ON course_generation_usage
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = course_generation_usage.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Course creation requests: own rows.
ALTER TABLE course_creation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_creation_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY ccr_own ON course_creation_requests
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- Concepts: global read, no row-level restriction.
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts FORCE ROW LEVEL SECURITY;
CREATE POLICY concepts_read ON concepts
  FOR SELECT
  USING (true);

-- Concept dependencies: global read.
ALTER TABLE concept_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_dependencies FORCE ROW LEVEL SECURITY;
CREATE POLICY concept_deps_read ON concept_dependencies
  FOR SELECT
  USING (true);

-- Course concepts: follows course enrollment.
ALTER TABLE course_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_concepts FORCE ROW LEVEL SECURITY;
CREATE POLICY cc_course_enrolled ON course_concepts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = course_concepts.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Sources: follows course enrollment.
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources FORCE ROW LEVEL SECURITY;
CREATE POLICY sources_course_enrolled ON sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = sources.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Source chunks: follows course enrollment.
ALTER TABLE source_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY sc_course_enrolled ON source_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = source_chunks.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Concept sources: follows course enrollment.
ALTER TABLE concept_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_sources FORCE ROW LEVEL SECURITY;
CREATE POLICY cs_course_enrolled ON concept_sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = concept_sources.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Curricula: follows course enrollment.
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE curricula FORCE ROW LEVEL SECURITY;
CREATE POLICY curricula_course_enrolled ON curricula
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = curricula.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Modules: via curriculum -> course enrollment.
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules FORCE ROW LEVEL SECURITY;
CREATE POLICY modules_via_curriculum ON modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM curricula c
      JOIN enrollments e ON e.course_id = c.course_id
      WHERE c.id = modules.curriculum_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Lessons: via module -> curriculum -> course enrollment.
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons FORCE ROW LEVEL SECURITY;
CREATE POLICY lessons_via_module ON lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN curricula c ON c.id = m.curriculum_id
      JOIN enrollments e ON e.course_id = c.course_id
      WHERE m.id = lessons.module_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Assessments: via lesson -> module -> curriculum -> course enrollment.
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments FORCE ROW LEVEL SECURITY;
CREATE POLICY assessments_via_lesson ON assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN curricula c ON c.id = m.curriculum_id
      JOIN enrollments e ON e.course_id = c.course_id
      WHERE l.id = assessments.lesson_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Questions: global read.
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions FORCE ROW LEVEL SECURITY;
CREATE POLICY questions_read ON questions
  FOR SELECT
  USING (true);

-- Question concepts: global read.
ALTER TABLE question_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_concepts FORCE ROW LEVEL SECURITY;
CREATE POLICY qc_read ON question_concepts
  FOR SELECT
  USING (true);

-- Assessment questions: via assessment -> lesson -> enrollment.
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions FORCE ROW LEVEL SECURITY;
CREATE POLICY aq_via_assessment ON assessment_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN lessons l ON l.id = a.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN curricula c ON c.id = m.curriculum_id
      JOIN enrollments e ON e.course_id = c.course_id
      WHERE a.id = assessment_questions.assessment_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Assessment attempts: own attempts.
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY aa_own ON assessment_attempts
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- Projects: via course enrollment.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY projects_course_enrolled ON projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = projects.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Project milestones: via project -> course enrollment.
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones FORCE ROW LEVEL SECURITY;
CREATE POLICY pm_via_project ON project_milestones
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN enrollments e ON e.course_id = p.course_id
      WHERE p.id = project_milestones.project_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Assets: via course enrollment.
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;
CREATE POLICY assets_course_enrolled ON assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = assets.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Generation jobs: via course enrollment.
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY gj_course_enrolled ON generation_jobs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.course_id = generation_jobs.course_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Lesson progress: own progress.
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress FORCE ROW LEVEL SECURITY;
CREATE POLICY lp_own ON lesson_progress
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- Concept progress: own progress.
ALTER TABLE concept_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_progress FORCE ROW LEVEL SECURITY;
CREATE POLICY cp_own ON concept_progress
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- Project progress: own progress.
ALTER TABLE project_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_progress FORCE ROW LEVEL SECURITY;
CREATE POLICY pp_own ON project_progress
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- User notes: own notes.
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY un_own ON user_notes
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- LLM calls: visible via job -> course enrollment.
ALTER TABLE llm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_calls FORCE ROW LEVEL SECURITY;
CREATE POLICY llm_calls_via_job ON llm_calls
  FOR SELECT
  USING (
    job_id IS NULL
    OR EXISTS (
      SELECT 1 FROM generation_jobs gj
      JOIN enrollments e ON e.course_id = gj.course_id
      WHERE gj.id = llm_calls.job_id
        AND e.user_id = current_setting('lumi.user_id')::uuid
        AND e.status = 'active'
    )
  );

-- Chat threads: own threads.
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads FORCE ROW LEVEL SECURITY;
CREATE POLICY ct_own ON chat_threads
  FOR ALL
  USING (user_id = current_setting('lumi.user_id')::uuid);

-- Chat messages: via thread ownership.
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;
CREATE POLICY cm_via_thread ON chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads ct
      WHERE ct.id = chat_messages.thread_id
        AND ct.user_id = current_setting('lumi.user_id')::uuid
    )
  );
