CREATE TABLE "course_creation_requests" (
	"user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"course_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_creation_requests_user_id_idempotency_key_pk" PRIMARY KEY("user_id","idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "course_generation_usage" (
	"course_id" uuid PRIMARY KEY NOT NULL,
	"limits" jsonb NOT NULL,
	"llm_calls_count" integer DEFAULT 0 NOT NULL,
	"llm_cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"research_iterations_count" integer DEFAULT 0 NOT NULL,
	"search_queries_count" integer DEFAULT 0 NOT NULL,
	"sources_crawled_count" integer DEFAULT 0 NOT NULL,
	"crawl_bytes" integer DEFAULT 0 NOT NULL,
	"concepts_count" integer DEFAULT 0 NOT NULL,
	"lessons_count" integer DEFAULT 0 NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"budget_exhausted_at" timestamp with time zone,
	"budget_exhausted_reason" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_creation_requests" ADD CONSTRAINT "course_creation_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_creation_requests" ADD CONSTRAINT "course_creation_requests_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_generation_usage" ADD CONSTRAINT "course_generation_usage_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;