CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."assessment_attempt_status" AS ENUM('in_progress', 'submitted', 'graded');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('image', 'diagram', 'generated_image', 'source_image');--> statement-breakpoint
CREATE TYPE "public"."concept_coverage_status" AS ENUM('covered', 'weakly_covered', 'explicitly_unresolved');--> statement-breakpoint
CREATE TYPE "public"."concept_dependency_type" AS ENUM('hard_prerequisite', 'recommended_before', 'related');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('pending', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."course_status" AS ENUM('generating', 'ready', 'ready_with_gaps', 'failed', 'cancelled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrollment_role" AS ENUM('owner', 'learner');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."generation_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."generation_job_type" AS ENUM('research', 'curriculum', 'lesson', 'project', 'question');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('objective', 'free_response');--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "assessment_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"results" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"score" real,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"assessment_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	CONSTRAINT "assessment_questions_assessment_id_question_id_pk" PRIMARY KEY("assessment_id","question_id"),
	CONSTRAINT "assessment_questions_order_unique" UNIQUE("assessment_id","order_index")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" "content_status" DEFAULT 'pending' NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_lesson_id_unique" UNIQUE("lesson_id")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"lesson_id" uuid,
	"type" "asset_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"alt_text" text,
	"storage_path" text NOT NULL,
	"source_url" text,
	"source_id" uuid,
	"mime_type" text NOT NULL,
	"file_size" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concept_dependencies" (
	"concept_id" uuid NOT NULL,
	"dependency_id" uuid NOT NULL,
	"relationship_type" "concept_dependency_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "concept_dependencies_concept_id_dependency_id_relationship_type_pk" PRIMARY KEY("concept_id","dependency_id","relationship_type"),
	CONSTRAINT "concept_dependencies_not_self" CHECK ("concept_dependencies"."concept_id" <> "concept_dependencies"."dependency_id")
);
--> statement-breakpoint
CREATE TABLE "concept_sources" (
	"course_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"relevance_score" real,
	"role" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "concept_sources_course_id_concept_id_source_id_pk" PRIMARY KEY("course_id","concept_id","source_id"),
	CONSTRAINT "concept_sources_relevance_range" CHECK ("concept_sources"."relevance_score" is null or "concept_sources"."relevance_score" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_concepts" (
	"course_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	"importance" integer NOT NULL,
	"depth_required" integer NOT NULL,
	"coverage_status" "concept_coverage_status" DEFAULT 'weakly_covered' NOT NULL,
	"coverage_confidence" real,
	"source_pack_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_concepts_course_id_concept_id_pk" PRIMARY KEY("course_id","concept_id"),
	CONSTRAINT "course_concepts_importance_range" CHECK ("course_concepts"."importance" between 1 and 5),
	CONSTRAINT "course_concepts_depth_range" CHECK ("course_concepts"."depth_required" between 1 and 5),
	CONSTRAINT "course_concepts_confidence_range" CHECK ("course_concepts"."coverage_confidence" is null or "course_concepts"."coverage_confidence" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"topic" text NOT NULL,
	"target_audience" text,
	"difficulty_level" text,
	"estimated_duration_minutes" integer,
	"status" "course_status" DEFAULT 'generating' NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_estimated_duration_positive" CHECK ("courses"."estimated_duration_minutes" is null or "courses"."estimated_duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "curricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curricula_course_id_unique" UNIQUE("course_id")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"role" "enrollment_role" NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "enrollments_user_id_course_id_pk" PRIMARY KEY("user_id","course_id")
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"type" "generation_job_type" NOT NULL,
	"status" "generation_job_status" DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error" text,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lesson_id" uuid,
	"project_id" uuid,
	"assessment_id" uuid,
	CONSTRAINT "generation_jobs_progress_range" CHECK ("generation_jobs"."progress" between 0 and 100),
	CONSTRAINT "generation_jobs_attempts_nonnegative" CHECK ("generation_jobs"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_index" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"status" "content_status" DEFAULT 'pending' NOT NULL,
	"content_json" jsonb,
	"schema_version" integer NOT NULL,
	"source_pack_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_module_order_unique" UNIQUE("module_id","order_index"),
	CONSTRAINT "lessons_schema_version_positive" CHECK ("lessons"."schema_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	CONSTRAINT "modules_curriculum_order_unique" UNIQUE("curriculum_id","order_index")
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"order_index" integer NOT NULL,
	"title" text NOT NULL,
	"scenario" text NOT NULL,
	"prompt" text NOT NULL,
	"implementation_goal" text NOT NULL,
	"constraints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_outcome" text NOT NULL,
	"relevant_lesson_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"relevant_concept_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "project_milestones_order_unique" UNIQUE("project_id","order_index")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"title" text NOT NULL,
	"goal" text NOT NULL,
	"storyline" text,
	"status" "content_status" DEFAULT 'pending' NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_concepts" (
	"question_id" uuid NOT NULL,
	"concept_id" uuid NOT NULL,
	CONSTRAINT "question_concepts_question_id_concept_id_pk" PRIMARY KEY("question_id","concept_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"primary_concept_id" uuid NOT NULL,
	"type" "question_type" NOT NULL,
	"difficulty" integer NOT NULL,
	"content" jsonb NOT NULL,
	"answer_key" jsonb NOT NULL,
	"rubric" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generation_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"heading" text,
	"content" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(384),
	"embedding_model" text NOT NULL,
	"embedding_version" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"url" text NOT NULL,
	"normalized_url" text NOT NULL,
	"title" text,
	"type" text NOT NULL,
	"authority_score" real,
	"version" text,
	"storage_path" text,
	"research_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"retrieved_at" timestamp with time zone,
	CONSTRAINT "sources_course_normalized_url_unique" UNIQUE("course_id","normalized_url")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_user_id_unique" UNIQUE("auth_user_id")
);
--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_dependencies" ADD CONSTRAINT "concept_dependencies_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_dependencies" ADD CONSTRAINT "concept_dependencies_dependency_id_concepts_id_fk" FOREIGN KEY ("dependency_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_sources" ADD CONSTRAINT "concept_sources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_sources" ADD CONSTRAINT "concept_sources_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "concept_sources" ADD CONSTRAINT "concept_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_concepts" ADD CONSTRAINT "course_concepts_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_concepts" ADD CONSTRAINT "course_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_concepts" ADD CONSTRAINT "question_concepts_concept_id_concepts_id_fk" FOREIGN KEY ("concept_id") REFERENCES "public"."concepts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_primary_concept_id_concepts_id_fk" FOREIGN KEY ("primary_concept_id") REFERENCES "public"."concepts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_chunks" ADD CONSTRAINT "source_chunks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enrollments_course_role_idx" ON "enrollments" USING btree ("course_id","role");--> statement-breakpoint
CREATE INDEX "generation_jobs_claim_idx" ON "generation_jobs" USING btree ("status","available_at","created_at");--> statement-breakpoint
CREATE INDEX "generation_jobs_course_status_idx" ON "generation_jobs" USING btree ("course_id","status");--> statement-breakpoint
CREATE INDEX "generation_jobs_lesson_idx" ON "generation_jobs" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_project_idx" ON "generation_jobs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "generation_jobs_assessment_idx" ON "generation_jobs" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "source_chunks_course_idx" ON "source_chunks" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "source_chunks_source_idx" ON "source_chunks" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_chunks_embedding_hnsw_idx" ON "source_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "sources_course_idx" ON "sources" USING btree ("course_id");
