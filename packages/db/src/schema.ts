import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const courseStatus = pgEnum("course_status", [
  "generating",
  "ready",
  "ready_with_gaps",
  "failed",
  "cancelled",
  "archived",
]);
export const enrollmentRole = pgEnum("enrollment_role", ["owner", "learner"]);
export const enrollmentStatus = pgEnum("enrollment_status", ["active", "completed", "archived"]);
export const conceptDependencyType = pgEnum("concept_dependency_type", [
  "hard_prerequisite",
  "recommended_before",
  "related",
]);
export const conceptCoverageStatus = pgEnum("concept_coverage_status", [
  "covered",
  "weakly_covered",
  "explicitly_unresolved",
]);
export const assetType = pgEnum("asset_type", [
  "image",
  "diagram",
  "generated_image",
  "source_image",
]);
export const contentStatus = pgEnum("content_status", ["pending", "generating", "ready", "failed"]);
export const questionType = pgEnum("question_type", ["objective", "free_response"]);
export const assessmentAttemptStatus = pgEnum("assessment_attempt_status", [
  "in_progress",
  "submitted",
  "graded",
]);
export const generationJobType = pgEnum("generation_job_type", [
  "research",
  "curriculum",
  "lesson",
  "project",
  "question",
]);
export const generationJobStatus = pgEnum("generation_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);
export const lessonProgressStatus = pgEnum("lesson_progress_status", [
  "not_started",
  "in_progress",
  "completed",
  "skipped",
]);
export const conceptProgressStatus = pgEnum("concept_progress_status", [
  "unknown",
  "strong",
  "review",
  "needs_guidance",
]);
export const projectProgressStatus = pgEnum("project_progress_status", [
  "not_started",
  "in_progress",
  "completed",
]);
export const userNoteType = pgEnum("user_note_type", ["note", "bookmark"]);
export const chatMessageRole = pgEnum("chat_message_role", ["user", "assistant", "system"]);

export const users = pgTable("users", {
  id: id(),
  authUserId: text("auth_user_id").notNull().unique(),
  email: text("email"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const courses = pgTable(
  "courses",
  {
    id: id(),
    title: text("title").notNull(),
    description: text("description"),
    topic: text("topic").notNull(),
    targetAudience: text("target_audience"),
    difficultyLevel: text("difficulty_level"),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    status: courseStatus("status").notNull().default("generating"),
    generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("courses_status_idx").on(table.status),
    check("courses_estimated_duration_positive", sql`${table.estimatedDurationMinutes} is null or ${table.estimatedDurationMinutes} > 0`),
  ],
);

export const enrollments = pgTable(
  "enrollments",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    role: enrollmentRole("role").notNull(),
    status: enrollmentStatus("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.courseId] }),
    index("enrollments_course_role_idx").on(table.courseId, table.role),
  ],
);

export const courseGenerationUsage = pgTable("course_generation_usage", {
  courseId: uuid("course_id").primaryKey().references(() => courses.id, { onDelete: "cascade" }),
  limits: jsonb("limits").notNull(),
  llmCallsCount: integer("llm_calls_count").notNull().default(0),
  llmCostUsd: numeric("llm_cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
  researchIterationsCount: integer("research_iterations_count").notNull().default(0),
  searchQueriesCount: integer("search_queries_count").notNull().default(0),
  sourcesCrawledCount: integer("sources_crawled_count").notNull().default(0),
  crawlBytes: integer("crawl_bytes").notNull().default(0),
  conceptsCount: integer("concepts_count").notNull().default(0),
  lessonsCount: integer("lessons_count").notNull().default(0),
  cancelRequestedAt: timestamp("cancel_requested_at", { withTimezone: true }),
  budgetExhaustedAt: timestamp("budget_exhausted_at", { withTimezone: true }),
  budgetExhaustedReason: text("budget_exhausted_reason"),
  updatedAt: updatedAt(),
});

export const courseCreationRequests = pgTable(
  "course_creation_requests",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.idempotencyKey] }),
  ],
);

export const concepts = pgTable("concepts", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: createdAt(),
});

export const conceptDependencies = pgTable(
  "concept_dependencies",
  {
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    dependencyId: uuid("dependency_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    relationshipType: conceptDependencyType("relationship_type").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.conceptId, table.dependencyId, table.relationshipType] }),
    check("concept_dependencies_not_self", sql`${table.conceptId} <> ${table.dependencyId}`),
  ],
);

export const courseConcepts = pgTable(
  "course_concepts",
  {
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    importance: integer("importance").notNull(),
    depthRequired: integer("depth_required").notNull(),
    coverageStatus: conceptCoverageStatus("coverage_status").notNull().default("weakly_covered"),
    coverageConfidence: real("coverage_confidence"),
    sourcePackMetadata: jsonb("source_pack_metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.conceptId] }),
    check("course_concepts_importance_range", sql`${table.importance} between 1 and 5`),
    check("course_concepts_depth_range", sql`${table.depthRequired} between 1 and 5`),
    check("course_concepts_confidence_range", sql`${table.coverageConfidence} is null or ${table.coverageConfidence} between 0 and 1`),
  ],
);

export const sources = pgTable(
  "sources",
  {
    id: id(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    normalizedUrl: text("normalized_url").notNull(),
    title: text("title"),
    type: text("type").notNull(),
    authorityScore: real("authority_score"),
    version: text("version"),
    storagePath: text("storage_path"),
    researchMetadata: jsonb("research_metadata").notNull().default(sql`'{}'::jsonb`),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }),
  },
  (table) => [
    unique("sources_course_normalized_url_unique").on(table.courseId, table.normalizedUrl),
    index("sources_course_idx").on(table.courseId),
  ],
);

export const sourceChunks = pgTable(
  "source_chunks",
  {
    id: id(),
    sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    heading: text("heading"),
    content: text("content").notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    embedding: vector("embedding", { dimensions: 384 }),
    embeddingModel: text("embedding_model").notNull(),
    embeddingVersion: text("embedding_version").notNull(),
  },
  (table) => [
    index("source_chunks_course_idx").on(table.courseId),
    index("source_chunks_source_idx").on(table.sourceId),
    index("source_chunks_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const conceptSources = pgTable(
  "concept_sources",
  {
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
    relevanceScore: real("relevance_score"),
    role: text("role").notNull(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    primaryKey({ columns: [table.courseId, table.conceptId, table.sourceId] }),
    check("concept_sources_relevance_range", sql`${table.relevanceScore} is null or ${table.relevanceScore} between 0 and 1`),
  ],
);

export const curricula = pgTable("curricula", {
  id: id(),
  courseId: uuid("course_id").notNull().unique().references(() => courses.id, { onDelete: "cascade" }),
  generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const modules = pgTable(
  "modules",
  {
    id: id(),
    curriculumId: uuid("curriculum_id").notNull().references(() => curricula.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    unique("modules_curriculum_order_unique").on(table.curriculumId, table.orderIndex),
  ],
);

export const lessons = pgTable(
  "lessons",
  {
    id: id(),
    moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    objectives: jsonb("objectives").notNull().default(sql`'[]'::jsonb`),
    requiredPrerequisites: jsonb("required_prerequisites").notNull().default(sql`'[]'::jsonb`),
    orderIndex: integer("order_index").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    status: contentStatus("status").notNull().default("pending"),
    contentJson: jsonb("content_json"),
    schemaVersion: integer("schema_version").notNull(),
    sourcePackMetadata: jsonb("source_pack_metadata").notNull().default(sql`'{}'::jsonb`),
    generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique("lessons_module_order_unique").on(table.moduleId, table.orderIndex),
    check("lessons_schema_version_positive", sql`${table.schemaVersion} > 0`),
  ],
);

export const assessments = pgTable("assessments", {
  id: id(),
  lessonId: uuid("lesson_id").notNull().unique().references(() => lessons.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: contentStatus("status").notNull().default("pending"),
  generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const questions = pgTable("questions", {
  id: id(),
  primaryConceptId: uuid("primary_concept_id").notNull().references(() => concepts.id),
  type: questionType("type").notNull(),
  difficulty: integer("difficulty").notNull(),
  content: jsonb("content").notNull(),
  answerKey: jsonb("answer_key").notNull(),
  rubric: jsonb("rubric").notNull().default(sql`'{}'::jsonb`),
  generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
});

export const questionConcepts = pgTable(
  "question_concepts",
  {
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.questionId, table.conceptId] })],
);

export const assessmentQuestions = pgTable(
  "assessment_questions",
  {
    assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.assessmentId, table.questionId] }),
    unique("assessment_questions_order_unique").on(table.assessmentId, table.orderIndex),
  ],
);

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: id(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: assessmentAttemptStatus("status").notNull().default("in_progress"),
  answers: jsonb("answers").notNull().default(sql`'{}'::jsonb`),
  results: jsonb("results").notNull().default(sql`'{}'::jsonb`),
  score: real("score"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  gradedAt: timestamp("graded_at", { withTimezone: true }),
});

export const projects = pgTable("projects", {
  id: id(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  curriculumId: uuid("curriculum_id").notNull().references(() => curricula.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  storyline: text("storyline"),
  status: contentStatus("status").notNull().default("pending"),
  generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const projectMilestones = pgTable(
  "project_milestones",
  {
    id: id(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    title: text("title").notNull(),
    scenario: text("scenario").notNull(),
    prompt: text("prompt").notNull(),
    implementationGoal: text("implementation_goal").notNull(),
    constraints: jsonb("constraints").notNull().default(sql`'[]'::jsonb`),
    hints: jsonb("hints").notNull().default(sql`'[]'::jsonb`),
    expectedOutcome: text("expected_outcome").notNull(),
    relevantLessonIds: jsonb("relevant_lesson_ids").notNull().default(sql`'[]'::jsonb`),
    relevantConceptIds: jsonb("relevant_concept_ids").notNull().default(sql`'[]'::jsonb`),
    generationMetadata: jsonb("generation_metadata").notNull().default(sql`'{}'::jsonb`),
  },
  (table) => [
    unique("project_milestones_order_unique").on(table.projectId, table.orderIndex),
  ],
);

export const assets = pgTable("assets", {
  id: id(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
  type: assetType("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  altText: text("alt_text"),
  storagePath: text("storage_path").notNull(),
  sourceUrl: text("source_url"),
  sourceId: uuid("source_id").references(() => sources.id, { onDelete: "set null" }),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
});

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: id(),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    type: generationJobType("type").notNull(),
    status: generationJobStatus("status").notNull().default("queued"),
    progress: integer("progress").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    error: text("error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    assessmentId: uuid("assessment_id").references(() => assessments.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("generation_jobs_claim_idx").on(table.status, table.availableAt, table.createdAt),
    index("generation_jobs_course_status_idx").on(table.courseId, table.status),
    index("generation_jobs_lesson_idx").on(table.lessonId),
    index("generation_jobs_project_idx").on(table.projectId),
    index("generation_jobs_assessment_idx").on(table.assessmentId),
    uniqueIndex("generation_jobs_research_course_unique").on(table.courseId).where(sql`${table.type} = 'research'`),
    uniqueIndex("generation_jobs_curriculum_course_unique").on(table.courseId).where(sql`${table.type} = 'curriculum'`),
    uniqueIndex("generation_jobs_lesson_unique").on(table.lessonId).where(sql`${table.type} = 'lesson'`),
    uniqueIndex("generation_jobs_project_unique").on(table.projectId).where(sql`${table.type} = 'project'`),
    uniqueIndex("generation_jobs_question_unique").on(table.assessmentId).where(sql`${table.type} = 'question'`),
    check("generation_jobs_progress_range", sql`${table.progress} between 0 and 100`),
    check("generation_jobs_attempts_nonnegative", sql`${table.attempts} >= 0`),
    check(
      "generation_jobs_target_matches_type",
      sql`
        (
          ${table.type} in ('research', 'curriculum')
          and ${table.lessonId} is null
          and ${table.projectId} is null
          and ${table.assessmentId} is null
        )
        or (
          ${table.type} = 'lesson'
          and ${table.lessonId} is not null
          and ${table.projectId} is null
          and ${table.assessmentId} is null
        )
        or (
          ${table.type} = 'project'
          and ${table.lessonId} is null
          and ${table.projectId} is not null
          and ${table.assessmentId} is null
        )
        or (
          ${table.type} = 'question'
          and ${table.lessonId} is null
          and ${table.projectId} is null
          and ${table.assessmentId} is not null
        )
      `,
    ),
  ],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    status: lessonProgressStatus("status").notNull().default("not_started"),
    currentBlockIndex: integer("current_block_index").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.lessonId] }),
    check("lesson_progress_block_nonnegative", sql`${table.currentBlockIndex} >= 0`),
  ],
);

export const conceptProgress = pgTable(
  "concept_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    conceptId: uuid("concept_id").notNull().references(() => concepts.id, { onDelete: "cascade" }),
    status: conceptProgressStatus("status").notNull().default("unknown"),
    lastIssue: text("last_issue"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.conceptId] })],
);

export const projectProgress = pgTable(
  "project_progress",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    currentMilestoneId: uuid("current_milestone_id").references(() => projectMilestones.id, { onDelete: "set null" }),
    status: projectProgressStatus("status").notNull().default("not_started"),
    hintsRevealedCount: integer("hints_revealed_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.projectId] }),
    check("project_progress_hints_nonnegative", sql`${table.hintsRevealedCount} >= 0`),
  ],
);

export const userNotes = pgTable(
  "user_notes",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
    blockId: text("block_id"),
    type: userNoteType("type").notNull(),
    content: text("content"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("user_notes_user_course_idx").on(table.userId, table.courseId),
    index("user_notes_lesson_block_idx").on(table.lessonId, table.blockId),
  ],
);

export const llmCalls = pgTable(
  "llm_calls",
  {
    id: id(),
    jobId: uuid("job_id").references(() => generationJobs.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    promptVersion: text("prompt_version").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    rawRequestId: text("raw_request_id"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("llm_calls_job_idx").on(table.jobId),
    check("llm_calls_input_tokens_nonnegative", sql`${table.inputTokens} >= 0`),
    check("llm_calls_output_tokens_nonnegative", sql`${table.outputTokens} >= 0`),
    check("llm_calls_latency_nonnegative", sql`${table.latencyMs} >= 0`),
  ],
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("chat_threads_user_course_idx").on(table.userId, table.courseId),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: id(),
    threadId: uuid("thread_id").notNull().references(() => chatThreads.id, { onDelete: "cascade" }),
    role: chatMessageRole("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").notNull().default(sql`'[]'::jsonb`),
    model: text("model"),
    llmCallId: uuid("llm_call_id").references(() => llmCalls.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [
    index("chat_messages_thread_created_idx").on(table.threadId, table.createdAt),
    index("chat_messages_llm_call_idx").on(table.llmCallId),
  ],
);
