CREATE UNIQUE INDEX "generation_jobs_research_course_unique" ON "generation_jobs" USING btree ("course_id") WHERE "generation_jobs"."type" = 'research';--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_curriculum_course_unique" ON "generation_jobs" USING btree ("course_id") WHERE "generation_jobs"."type" = 'curriculum';--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_lesson_unique" ON "generation_jobs" USING btree ("lesson_id") WHERE "generation_jobs"."type" = 'lesson';--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_project_unique" ON "generation_jobs" USING btree ("project_id") WHERE "generation_jobs"."type" = 'project';--> statement-breakpoint
CREATE UNIQUE INDEX "generation_jobs_question_unique" ON "generation_jobs" USING btree ("assessment_id") WHERE "generation_jobs"."type" = 'question';--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_target_matches_type" CHECK (
        (
          "generation_jobs"."type" in ('research', 'curriculum')
          and "generation_jobs"."lesson_id" is null
          and "generation_jobs"."project_id" is null
          and "generation_jobs"."assessment_id" is null
        )
        or (
          "generation_jobs"."type" = 'lesson'
          and "generation_jobs"."lesson_id" is not null
          and "generation_jobs"."project_id" is null
          and "generation_jobs"."assessment_id" is null
        )
        or (
          "generation_jobs"."type" = 'project'
          and "generation_jobs"."lesson_id" is null
          and "generation_jobs"."project_id" is not null
          and "generation_jobs"."assessment_id" is null
        )
        or (
          "generation_jobs"."type" = 'question'
          and "generation_jobs"."lesson_id" is null
          and "generation_jobs"."project_id" is null
          and "generation_jobs"."assessment_id" is not null
        )
      );