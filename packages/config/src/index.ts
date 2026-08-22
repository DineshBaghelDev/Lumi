import { z } from "zod";

export type Env = Readonly<Record<string, string | undefined>>;

export const V1_CONFIG_DEFAULTS = {
  realtime: {
    pollingFallbackMs: 5_000,
  },
  services: {
    liteLlmBaseUrl: "http://127.0.0.1:4000",
    liteLlmModel: "gpt-5.5",
    searxngBaseUrl: "http://127.0.0.1:8080",
    crawl4aiBaseUrl: "http://127.0.0.1:11235",
    teiBaseUrl: "http://127.0.0.1:8081",
    teiModelId: "BAAI/bge-small-en-v1.5",
    teiEmbeddingDimension: 384,
  },
  worker: {
    pollingIntervalMs: 1_000,
    heartbeatIntervalMs: 30_000,
    staleLockMs: 300_000,
    concurrency: 5,
    maxLessonJobsPerCourse: 3,
  },
  generationBudgets: {
    maxLlmCalls: 80,
    maxLlmCostUsd: 10,
    maxResearchIterations: 3,
    maxSearchQueries: 20,
    maxCrawledSources: 40,
    maxCrawledBytes: 50_000_000,
    maxConcepts: 60,
    maxLessons: 20,
    maxActiveCoursesPerUser: 2,
    courseCreationRateLimitMax: 3,
    courseCreationRateLimitWindowMs: 3_600_000,
  },
  researchSecurity: {
    maxResourceBytes: 5_000_000,
    maxRedirects: 3,
    allowedOutboundPorts: [80, 443],
    allowedMimeTypes: [
      "text/html",
      "text/plain",
      "text/markdown",
      "application/pdf",
      "application/xhtml+xml",
    ],
    requestTimeoutMs: 20_000,
    maxCrawlDepth: 2,
    maxPagesPerCrawl: 20,
    maxDiscoveredResources: 100,
  },
} as const;

export const V1_CONFIG_LIMITS = {
  worker: {
    pollingIntervalMs: { min: 100, max: 60_000 },
    heartbeatIntervalMs: { min: 1_000, max: 300_000 },
    staleLockMs: { min: 10_000, max: 3_600_000 },
    concurrency: { min: 1, max: 32 },
    maxLessonJobsPerCourse: { min: 1, max: 3 },
  },
  generationBudgets: {
    maxLlmCalls: { min: 1, max: 5_000 },
    maxLlmCostUsd: { min: 0.01, max: 1_000 },
    maxResearchIterations: { min: 1, max: 20 },
    maxSearchQueries: { min: 1, max: 1_000 },
    maxCrawledSources: { min: 1, max: 1_000 },
    maxCrawledBytes: { min: 1, max: 1_000_000_000 },
    maxConcepts: { min: 1, max: 1_000 },
    maxLessons: { min: 1, max: 200 },
    maxActiveCoursesPerUser: { min: 1, max: 20 },
    courseCreationRateLimitMax: { min: 1, max: 1_000 },
    courseCreationRateLimitWindowMs: { min: 1_000, max: 86_400_000 },
  },
  researchSecurity: {
    maxResourceBytes: { min: 1, max: 100_000_000 },
    maxRedirects: { min: 0, max: 10 },
    requestTimeoutMs: { min: 1_000, max: 120_000 },
    maxCrawlDepth: { min: 0, max: 10 },
    maxPagesPerCrawl: { min: 1, max: 1_000 },
    maxDiscoveredResources: { min: 1, max: 10_000 },
  },
} as const;

type NumericGuardrail = Readonly<{ min: number; max: number }>;

const boundedInteger = (guardrail: NumericGuardrail, defaultValue: number) =>
  z
    .string()
    .trim()
    .min(1, "must not be empty")
    .pipe(z.coerce.number<string>().finite().int().min(guardrail.min).max(guardrail.max))
    .default(defaultValue);

const boundedNumber = (guardrail: NumericGuardrail, defaultValue: number) =>
  z
    .string()
    .trim()
    .min(1, "must not be empty")
    .pipe(z.coerce.number<string>().finite().min(guardrail.min).max(guardrail.max))
    .default(defaultValue);

const requiredSecret = z.string().trim().min(1, "must not be empty");
const httpUrl = z
  .string()
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "must be an HTTP(S) URL",
  });
const databaseUrl = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    { message: "must be a postgres:// or postgresql:// URL" },
  );
const mimeType = z.string().regex(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i, {
  message: "must be a MIME type such as text/html",
});

const sharedServicesEnvSchema = z.object({
  LITELLM_BASE_URL: httpUrl.default(V1_CONFIG_DEFAULTS.services.liteLlmBaseUrl),
  LITELLM_MODEL: z.string().trim().min(1).default(V1_CONFIG_DEFAULTS.services.liteLlmModel),
  SEARXNG_BASE_URL: httpUrl.default(V1_CONFIG_DEFAULTS.services.searxngBaseUrl),
  CRAWL4AI_BASE_URL: httpUrl.default(V1_CONFIG_DEFAULTS.services.crawl4aiBaseUrl),
  TEI_BASE_URL: httpUrl.default(V1_CONFIG_DEFAULTS.services.teiBaseUrl),
  TEI_MODEL_ID: z
    .literal(V1_CONFIG_DEFAULTS.services.teiModelId)
    .default(V1_CONFIG_DEFAULTS.services.teiModelId),
  TEI_EMBEDDING_DIMENSION: z
    .string()
    .trim()
    .min(1, "must not be empty")
    .pipe(z.coerce.number<string>().pipe(z.literal(V1_CONFIG_DEFAULTS.services.teiEmbeddingDimension)))
    .default(V1_CONFIG_DEFAULTS.services.teiEmbeddingDimension),
});

const insforgeServerEnvSchema = z.object({
  INSFORGE_PROJECT_URL: httpUrl,
  INSFORGE_ANON_KEY: requiredSecret,
  INSFORGE_API_KEY: requiredSecret,
  INSFORGE_DB_STRING: databaseUrl,
  LITELLM_API_KEY: requiredSecret,
});

const generationBudgetEnvSchema = z.object({
  GENERATION_MAX_LLM_CALLS: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxLlmCalls,
    V1_CONFIG_DEFAULTS.generationBudgets.maxLlmCalls,
  ),
  GENERATION_MAX_LLM_COST_USD: boundedNumber(
    V1_CONFIG_LIMITS.generationBudgets.maxLlmCostUsd,
    V1_CONFIG_DEFAULTS.generationBudgets.maxLlmCostUsd,
  ),
  GENERATION_MAX_RESEARCH_ITERATIONS: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxResearchIterations,
    V1_CONFIG_DEFAULTS.generationBudgets.maxResearchIterations,
  ),
  GENERATION_MAX_SEARCH_QUERIES: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxSearchQueries,
    V1_CONFIG_DEFAULTS.generationBudgets.maxSearchQueries,
  ),
  GENERATION_MAX_CRAWLED_SOURCES: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxCrawledSources,
    V1_CONFIG_DEFAULTS.generationBudgets.maxCrawledSources,
  ),
  GENERATION_MAX_CRAWLED_BYTES: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxCrawledBytes,
    V1_CONFIG_DEFAULTS.generationBudgets.maxCrawledBytes,
  ),
  GENERATION_MAX_CONCEPTS: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxConcepts,
    V1_CONFIG_DEFAULTS.generationBudgets.maxConcepts,
  ),
  GENERATION_MAX_LESSONS: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxLessons,
    V1_CONFIG_DEFAULTS.generationBudgets.maxLessons,
  ),
  GENERATION_MAX_ACTIVE_COURSES_PER_USER: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.maxActiveCoursesPerUser,
    V1_CONFIG_DEFAULTS.generationBudgets.maxActiveCoursesPerUser,
  ),
  COURSE_CREATION_RATE_LIMIT_MAX: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.courseCreationRateLimitMax,
    V1_CONFIG_DEFAULTS.generationBudgets.courseCreationRateLimitMax,
  ),
  COURSE_CREATION_RATE_LIMIT_WINDOW_MS: boundedInteger(
    V1_CONFIG_LIMITS.generationBudgets.courseCreationRateLimitWindowMs,
    V1_CONFIG_DEFAULTS.generationBudgets.courseCreationRateLimitWindowMs,
  ),
});

const allowedOutboundPortsSchema = z
  .string()
  .default(V1_CONFIG_DEFAULTS.researchSecurity.allowedOutboundPorts.join(","))
  .transform((value) => value.split(",").map((item) => Number(item.trim())))
  .pipe(z.array(z.number().int().min(1).max(65_535)).min(1).max(32));

const allowedMimeTypesSchema = z
  .string()
  .default(V1_CONFIG_DEFAULTS.researchSecurity.allowedMimeTypes.join(","))
  .transform((value) => value.split(",").map((item) => item.trim()))
  .pipe(z.array(mimeType).min(1).max(32));

const researchSecurityEnvSchema = z.object({
  RESEARCH_MAX_RESOURCE_BYTES: boundedInteger(
    V1_CONFIG_LIMITS.researchSecurity.maxResourceBytes,
    V1_CONFIG_DEFAULTS.researchSecurity.maxResourceBytes,
  ),
  RESEARCH_MAX_REDIRECTS: boundedInteger(
    V1_CONFIG_LIMITS.researchSecurity.maxRedirects,
    V1_CONFIG_DEFAULTS.researchSecurity.maxRedirects,
  ),
  RESEARCH_ALLOWED_OUTBOUND_PORTS: allowedOutboundPortsSchema,
  RESEARCH_ALLOWED_MIME_TYPES: allowedMimeTypesSchema,
  RESEARCH_REQUEST_TIMEOUT_MS: boundedInteger(
    V1_CONFIG_LIMITS.researchSecurity.requestTimeoutMs,
    V1_CONFIG_DEFAULTS.researchSecurity.requestTimeoutMs,
  ),
  RESEARCH_MAX_CRAWL_DEPTH: boundedInteger(
    V1_CONFIG_LIMITS.researchSecurity.maxCrawlDepth,
    V1_CONFIG_DEFAULTS.researchSecurity.maxCrawlDepth,
  ),
  RESEARCH_MAX_PAGES_PER_CRAWL: boundedInteger(
    V1_CONFIG_LIMITS.researchSecurity.maxPagesPerCrawl,
    V1_CONFIG_DEFAULTS.researchSecurity.maxPagesPerCrawl,
  ),
  RESEARCH_MAX_DISCOVERED_RESOURCES: boundedInteger(
    V1_CONFIG_LIMITS.researchSecurity.maxDiscoveredResources,
    V1_CONFIG_DEFAULTS.researchSecurity.maxDiscoveredResources,
  ),
});

const commonServerEnvSchema = insforgeServerEnvSchema
  .extend(sharedServicesEnvSchema.shape)
  .extend(generationBudgetEnvSchema.shape)
  .extend(researchSecurityEnvSchema.shape)
  .superRefine((env, context) => {
    if (env.RESEARCH_MAX_RESOURCE_BYTES > env.GENERATION_MAX_CRAWLED_BYTES) {
      context.addIssue({
        code: "custom",
        path: ["RESEARCH_MAX_RESOURCE_BYTES"],
        message: "must not exceed GENERATION_MAX_CRAWLED_BYTES",
      });
    }
  });

const workerEnvSchema = commonServerEnvSchema
  .safeExtend({
    WORKER_POLL_INTERVAL_MS: boundedInteger(
      V1_CONFIG_LIMITS.worker.pollingIntervalMs,
      V1_CONFIG_DEFAULTS.worker.pollingIntervalMs,
    ),
    WORKER_HEARTBEAT_INTERVAL_MS: boundedInteger(
      V1_CONFIG_LIMITS.worker.heartbeatIntervalMs,
      V1_CONFIG_DEFAULTS.worker.heartbeatIntervalMs,
    ),
    WORKER_STALE_LOCK_MS: boundedInteger(
      V1_CONFIG_LIMITS.worker.staleLockMs,
      V1_CONFIG_DEFAULTS.worker.staleLockMs,
    ),
    WORKER_CONCURRENCY: boundedInteger(
      V1_CONFIG_LIMITS.worker.concurrency,
      V1_CONFIG_DEFAULTS.worker.concurrency,
    ),
    WORKER_MAX_LESSON_JOBS_PER_COURSE: boundedInteger(
      V1_CONFIG_LIMITS.worker.maxLessonJobsPerCourse,
      V1_CONFIG_DEFAULTS.worker.maxLessonJobsPerCourse,
    ),
  })
  .superRefine((env, context) => {
    if (env.WORKER_STALE_LOCK_MS < env.WORKER_HEARTBEAT_INTERVAL_MS * 2) {
      context.addIssue({
        code: "custom",
        path: ["WORKER_STALE_LOCK_MS"],
        message: "must be at least twice WORKER_HEARTBEAT_INTERVAL_MS",
      });
    }
  });

const webPublicEnvSchema = z.object({
  NEXT_PUBLIC_INSFORGE_URL: httpUrl,
  NEXT_PUBLIC_INSFORGE_ANON_KEY: requiredSecret,
  NEXT_PUBLIC_API_BASE_URL: httpUrl,
});

export class ConfigValidationError extends Error {
  constructor(scope: string, issues: readonly z.core.$ZodIssue[]) {
    const details = issues.map((issue) => {
      const field = issue.path.length === 0 ? "environment" : issue.path.join(".");
      return `- ${field}: ${issue.message}`;
    });

    super(`Invalid ${scope} environment:\n${details.join("\n")}`);
    this.name = "ConfigValidationError";
  }
}

const parseSchema = <Output>(schema: z.ZodType<Output>, env: Env, scope: string): Output => {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new ConfigValidationError(scope, result.error.issues);
  }

  return result.data;
};

type SharedServicesEnv = z.output<typeof sharedServicesEnvSchema>;

const mapSharedServices = (env: SharedServicesEnv) => ({
  liteLlm: {
    baseUrl: env.LITELLM_BASE_URL,
    model: env.LITELLM_MODEL,
  },
  searxng: { baseUrl: env.SEARXNG_BASE_URL },
  crawl4ai: { baseUrl: env.CRAWL4AI_BASE_URL },
  tei: {
    baseUrl: env.TEI_BASE_URL,
    modelId: env.TEI_MODEL_ID,
    embeddingDimension: env.TEI_EMBEDDING_DIMENSION,
  },
});

type CommonServerEnv = z.output<typeof commonServerEnvSchema>;

const mapCommonServerConfig = (env: CommonServerEnv) => ({
  insforge: {
    projectUrl: env.INSFORGE_PROJECT_URL,
    anonKey: env.INSFORGE_ANON_KEY,
    apiKey: env.INSFORGE_API_KEY,
    databaseUrl: env.INSFORGE_DB_STRING,
  },
  auth: {
    baseUrl: env.INSFORGE_PROJECT_URL,
    anonKey: env.INSFORGE_ANON_KEY,
  },
  storage: {
    baseUrl: env.INSFORGE_PROJECT_URL,
    anonKey: env.INSFORGE_ANON_KEY,
  },
  realtime: {
    baseUrl: env.INSFORGE_PROJECT_URL,
    anonKey: env.INSFORGE_ANON_KEY,
    pollingFallbackMs: V1_CONFIG_DEFAULTS.realtime.pollingFallbackMs,
  },
  services: {
    ...mapSharedServices(env),
    liteLlm: {
      ...mapSharedServices(env).liteLlm,
      apiKey: env.LITELLM_API_KEY,
    },
  },
  generationBudgets: {
    maxLlmCalls: env.GENERATION_MAX_LLM_CALLS,
    maxLlmCostUsd: env.GENERATION_MAX_LLM_COST_USD,
    maxResearchIterations: env.GENERATION_MAX_RESEARCH_ITERATIONS,
    maxSearchQueries: env.GENERATION_MAX_SEARCH_QUERIES,
    maxCrawledSources: env.GENERATION_MAX_CRAWLED_SOURCES,
    maxCrawledBytes: env.GENERATION_MAX_CRAWLED_BYTES,
    maxConcepts: env.GENERATION_MAX_CONCEPTS,
    maxLessons: env.GENERATION_MAX_LESSONS,
    maxActiveCoursesPerUser: env.GENERATION_MAX_ACTIVE_COURSES_PER_USER,
    courseCreationRateLimitMax: env.COURSE_CREATION_RATE_LIMIT_MAX,
    courseCreationRateLimitWindowMs: env.COURSE_CREATION_RATE_LIMIT_WINDOW_MS,
  },
  researchSecurity: {
    maxResourceBytes: env.RESEARCH_MAX_RESOURCE_BYTES,
    maxRedirects: env.RESEARCH_MAX_REDIRECTS,
    allowedOutboundPorts: env.RESEARCH_ALLOWED_OUTBOUND_PORTS,
    allowedMimeTypes: env.RESEARCH_ALLOWED_MIME_TYPES,
    requestTimeoutMs: env.RESEARCH_REQUEST_TIMEOUT_MS,
    maxCrawlDepth: env.RESEARCH_MAX_CRAWL_DEPTH,
    maxPagesPerCrawl: env.RESEARCH_MAX_PAGES_PER_CRAWL,
    maxDiscoveredResources: env.RESEARCH_MAX_DISCOVERED_RESOURCES,
  },
});

export const parseSharedServicesEnv = (env: Env) =>
  mapSharedServices(parseSchema(sharedServicesEnvSchema, env, "shared services"));

export const parseApiEnv = (env: Env) =>
  mapCommonServerConfig(parseSchema(commonServerEnvSchema, env, "API"));

export const parseWorkerEnv = (env: Env) => {
  const parsed = parseSchema(workerEnvSchema, env, "worker");

  return {
    ...mapCommonServerConfig(parsed),
    worker: {
      pollingIntervalMs: parsed.WORKER_POLL_INTERVAL_MS,
      heartbeatIntervalMs: parsed.WORKER_HEARTBEAT_INTERVAL_MS,
      staleLockMs: parsed.WORKER_STALE_LOCK_MS,
      concurrency: parsed.WORKER_CONCURRENCY,
      maxLessonJobsPerCourse: parsed.WORKER_MAX_LESSON_JOBS_PER_COURSE,
    },
  };
};

export const parseWebPublicEnv = (env: Env) => {
  const parsed = parseSchema(webPublicEnvSchema, env, "web public");

  return {
    apiBaseUrl: parsed.NEXT_PUBLIC_API_BASE_URL,
    insforge: {
      projectUrl: parsed.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    },
    auth: {
      baseUrl: parsed.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    },
    storage: {
      baseUrl: parsed.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY,
    },
    realtime: {
      baseUrl: parsed.NEXT_PUBLIC_INSFORGE_URL,
      anonKey: parsed.NEXT_PUBLIC_INSFORGE_ANON_KEY,
      pollingFallbackMs: V1_CONFIG_DEFAULTS.realtime.pollingFallbackMs,
    },
  };
};

export type SharedServicesConfig = ReturnType<typeof parseSharedServicesEnv>;
export type ApiConfig = ReturnType<typeof parseApiEnv>;
export type WorkerConfig = ReturnType<typeof parseWorkerEnv>;
export type WebPublicConfig = ReturnType<typeof parseWebPublicEnv>;
