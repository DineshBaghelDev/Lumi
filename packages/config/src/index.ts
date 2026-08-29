import { z } from "zod";

export type Env = Readonly<Record<string, string | undefined>>;

export const V1_CONFIG_DEFAULTS = {
  realtime: {
    pollingFallbackMs: 5_000,
  },
  services: {
    liteLlmBaseUrl: "http://127.0.0.1:4000",
    liteLlmModel: "groq-gpt-5.5",
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

const providerEnvSchema = z.object({
  CODEX_API_BASE_URL: z.string().url().optional(),
  CODEX_API_KEY: z.string().optional(),
  CODEX_API_MODEL: z.string().optional(),
  MOONSHOT_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
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

const serverSecretsEnvSchema = z.object({
  LITELLM_API_KEY: requiredSecret,
  PROVIDER_ENCRYPTION_KEY: z.string().trim().min(32, "must be at least 32 characters").optional(),
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

const commonServerEnvSchema = serverSecretsEnvSchema
  .extend(sharedServicesEnvSchema.shape)
  .extend(providerEnvSchema.shape)
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
    if (env.RESEARCH_MAX_PAGES_PER_CRAWL > env.GENERATION_MAX_CRAWLED_SOURCES) {
      context.addIssue({
        code: "custom",
        path: ["RESEARCH_MAX_PAGES_PER_CRAWL"],
        message: "must not exceed GENERATION_MAX_CRAWLED_SOURCES",
      });
    }
  });

const apiEnvSchema = commonServerEnvSchema.safeExtend({
  DATABASE_URL: databaseUrl,
});

const workerEnvSchema = commonServerEnvSchema
  .safeExtend({
    WORKER_DATABASE_URL: databaseUrl,
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

const authEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_DATABASE_URL: databaseUrl,
  BETTER_AUTH_URL: httpUrl,
  BETTER_AUTH_SECRET: z.string().min(32, "must contain at least 32 characters"),
  BETTER_AUTH_TRUSTED_ORIGINS: z
    .string()
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(httpUrl).min(1)),
  GOOGLE_CLIENT_ID: requiredSecret,
  GOOGLE_CLIENT_SECRET: requiredSecret,
  AUTH_REQUIRE_EMAIL_VERIFICATION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
}).superRefine((env, context) => {
  if (env.NODE_ENV === "production" && !env.AUTH_REQUIRE_EMAIL_VERIFICATION) {
    context.addIssue({
      code: "custom",
      path: ["AUTH_REQUIRE_EMAIL_VERIFICATION"],
      message: "must be true in production",
    });
  }
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
  services: {
    ...mapSharedServices(env),
    liteLlm: {
      ...mapSharedServices(env).liteLlm,
      apiKey: env.LITELLM_API_KEY,
    },
    providerEncryptionKey: env.PROVIDER_ENCRYPTION_KEY ?? env.LITELLM_API_KEY,
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

export const parseProvidersEnv = (env: Env): ProviderConfig[] => {
  return getAvailableProviders(env);
};

export const parseApiEnv = (env: Env) => {
  const parsed = parseSchema(apiEnvSchema, env, "API");
  return { ...mapCommonServerConfig(parsed), database: { url: parsed.DATABASE_URL } };
};

export const parseWorkerEnv = (env: Env) => {
  const parsed = parseSchema(workerEnvSchema, env, "worker");

  return {
    ...mapCommonServerConfig(parsed),
    database: { url: parsed.WORKER_DATABASE_URL },
    worker: {
      pollingIntervalMs: parsed.WORKER_POLL_INTERVAL_MS,
      heartbeatIntervalMs: parsed.WORKER_HEARTBEAT_INTERVAL_MS,
      staleLockMs: parsed.WORKER_STALE_LOCK_MS,
      concurrency: parsed.WORKER_CONCURRENCY,
      maxLessonJobsPerCourse: parsed.WORKER_MAX_LESSON_JOBS_PER_COURSE,
    },
  };
};

export const parseAuthEnv = (env: Env) => {
  const parsed = parseSchema(authEnvSchema, env, "auth");
  return {
    databaseUrl: parsed.AUTH_DATABASE_URL,
    baseUrl: parsed.BETTER_AUTH_URL,
    secret: parsed.BETTER_AUTH_SECRET,
    trustedOrigins: parsed.BETTER_AUTH_TRUSTED_ORIGINS,
    google: { clientId: parsed.GOOGLE_CLIENT_ID, clientSecret: parsed.GOOGLE_CLIENT_SECRET },
    requireEmailVerification: parsed.AUTH_REQUIRE_EMAIL_VERIFICATION,
    secureCookies: parsed.NODE_ENV === "production",
  };
};

export type SharedServicesConfig = ReturnType<typeof parseSharedServicesEnv>;
export type ApiConfig = ReturnType<typeof parseApiEnv>;
export type WorkerConfig = ReturnType<typeof parseWorkerEnv>;
export type AuthConfig = ReturnType<typeof parseAuthEnv>;

export type ProviderConfig = {
  id: string;
  name: string;
  models: { id: string; name: string; provider: string }[];
};

const availableProviders: ProviderConfig[] = [
  {
    id: "groq",
    name: "Groq",
    models: [{ id: "groq-gpt-5.5", name: "GPT-OSS-120B", provider: "groq" }],
  },
  {
    id: "codex",
    name: "Codex (Local)",
    models: [{ id: "codex-gpt-5.5", name: "GPT-5.5", provider: "codex" }],
  },
  {
    id: "moonshot",
    name: "Moonshot (Kimi)",
    models: [{ id: "moonshot-latest", name: "Moonshot v1-128K", provider: "moonshot" }],
  },
  {
    id: "gemini",
    name: "Google Gemini",
    models: [{ id: "gemini-pro", name: "Gemini 2.5 Pro", provider: "gemini" }],
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    models: [{ id: "claude-sonnet", name: "Claude Sonnet 4", provider: "claude" }],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    models: [{ id: "openrouter-gpt-5.5", name: "GPT-5.5", provider: "openrouter" }],
  },
];

const providerKeyMap: Record<string, string> = {
  groq: "GROQ_API_KEY",
  codex: "CODEX_API_KEY",
  moonshot: "MOONSHOT_API_KEY",
  gemini: "GEMINI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

export const getAvailableProviders = (env: Env): ProviderConfig[] => {
  return availableProviders.filter((provider) => {
    const keyName = providerKeyMap[provider.id];
    return keyName && env[keyName] && env[keyName] !== "your-" + keyName.toLowerCase().replace(/_/g, "-") && env[keyName] !== "api-key";
  });
};

/**
 * Build a set of all known model IDs across every provider (not just available ones).
 * Used to validate user-supplied model strings at the API boundary.
 */
const allModelIds = new Set(availableProviders.flatMap((p) => p.models.map((m) => m.id)));

/**
 * Return true when `modelId` is a known model in any provider config.
 */
export const isValidModelId = (modelId: string): boolean => allModelIds.has(modelId);

/**
 * Map a known model ID to its provider prefix (e.g. "groq-gpt-5.5" → "groq").
 * Returns undefined for unknown model IDs.
 */
export const resolveModelProvider = (modelId: string): string | undefined => {
  for (const provider of availableProviders) {
    if (provider.models.some((m) => m.id === modelId)) return provider.id;
  }
  return undefined;
};
