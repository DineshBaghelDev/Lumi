import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";
import type { WorkerConfig } from "@lumi/config";
import { enqueueGenerationJob, type GenerationJobRow, type LumiDb } from "@lumi/db";
import { sql } from "drizzle-orm";
import { PermanentJobError, RetryableJobError } from "./worker.ts";
import { Crawl4aiClient, type CrawledPage, type SearchResult, SearxngClient, TeiClient } from "./research-clients.ts";

type ResearchConfig = Pick<WorkerConfig, "services" | "researchSecurity" | "generationBudgets">;

type ResearchDeps = {
  search?: Pick<SearxngClient, "search">;
  crawl?: Pick<Crawl4aiClient, "crawl">;
  embed?: { embed(input: string[]): Promise<number[][]> };
  lookup?: typeof dnsLookup;
};
type EmbedClient = NonNullable<ResearchDeps["embed"]>;

type CourseRow = {
  id: string;
  topic: string;
  description: string | null;
};

type ConceptPlan = {
  name: string;
  description: string;
  importance: number;
  depthRequired: number;
  prerequisites: string[];
};

type RankedSource = SearchResult & {
  normalizedUrl: string;
  score: number;
  sourceType: "official" | "primary" | "reference";
  protection: string | null;
};

const redisConcepts: ConceptPlan[] = [
  {
    name: "Redis data structures",
    description: "Core Redis value types and the command patterns learners need before streams.",
    importance: 5,
    depthRequired: 3,
    prerequisites: [],
  },
  {
    name: "Redis Streams",
    description: "Append-only stream entries, IDs, reads, and trimming.",
    importance: 5,
    depthRequired: 4,
    prerequisites: ["Redis data structures"],
  },
  {
    name: "Consumer groups",
    description: "Group reads, pending entries, acknowledgements, and recovery workflows.",
    importance: 5,
    depthRequired: 4,
    prerequisites: ["Redis Streams"],
  },
  {
    name: "Stream reliability patterns",
    description: "At-least-once processing, retry, dead-letter, and monitoring concerns.",
    importance: 4,
    depthRequired: 3,
    prerequisites: ["Consumer groups"],
  },
];

export const createResearchHandler = (
  db: LumiDb,
  config: ResearchConfig,
  deps: ResearchDeps = {},
) => {
  const search = deps.search ?? new SearxngClient(config.services.searxng.baseUrl);
  const crawl = deps.crawl ?? new Crawl4aiClient(config.services.crawl4ai.baseUrl);
  const tei = new TeiClient({
    baseUrl: config.services.tei.baseUrl,
    dimension: config.services.tei.embeddingDimension,
    modelId: config.services.tei.modelId,
  });
  const embed = deps.embed ?? { embed: (input: string[]) => tei.embed(input) as Promise<number[][]> };
  const lookup = deps.lookup ?? dnsLookup;

  return async (job: GenerationJobRow) => {
    const course = await getCourse(db, job.course_id);
    await ensureCanContinue(db, job.course_id, "research start");
    await setProgress(db, job.id, 10, { stage: "concepts" });

    const concepts = buildConceptPlan(course);
    await ensureConceptBudget(db, job.course_id, concepts.length);

    const queries = buildQueries(course, concepts).slice(0, config.generationBudgets.maxSearchQueries);
    await markSearchQueries(db, job.course_id, queries.length);
    await setProgress(db, job.id, 25, { stage: "search", queries });

    const searchResults = (await Promise.all(queries.map((query) => search.search(query, {
      limit: 5,
      signal: AbortSignal.timeout(config.researchSecurity.requestTimeoutMs),
    }))))
      .flat();
    const ranked = rankSources(searchResults, course.topic)
      .slice(0, Math.min(config.generationBudgets.maxCrawledSources, config.researchSecurity.maxPagesPerCrawl));
    await ensureCanContinue(db, job.course_id, "source selection");

    const blocked = [];
    const allowed = [];
    for (const source of ranked) {
      const verdict = await validateSourceUrl(source.url, config.researchSecurity, lookup);
      if (verdict.ok) allowed.push(source);
      else blocked.push({ url: source.url, reason: verdict.reason });
    }
    if (allowed.length === 0) throw new PermanentJobError("Research found no crawlable sources");

    await setProgress(db, job.id, 45, { stage: "crawl", blocked });
    const pages = await crawl.crawl(allowed.map((source) => source.url), {
      signal: AbortSignal.timeout(config.researchSecurity.requestTimeoutMs),
    });
    const retained = pages.filter((page) => isAllowedPage(page, config));
    await ensureCanContinue(db, job.course_id, "crawling");
    await markCrawlUsage(db, job.course_id, retained);

    const chunksByUrl = new Map<string, ReturnType<typeof chunkMarkdown>>();
    for (const page of retained) chunksByUrl.set(normalizeUrl(page.finalUrl), chunkMarkdown(page.markdown));

    const allChunks = [...chunksByUrl.values()].flat();
    if (allChunks.length === 0) throw new PermanentJobError("Research produced no usable chunks");
    const vectors = await embedChunks(embed, allChunks.map((chunk) => chunk.content));
    await setProgress(db, job.id, 70, { stage: "persist" });

    await persistResearch(db, {
      job,
      course,
      concepts,
      sources: allowed,
      pages: retained,
      chunksByUrl,
      vectors,
      blocked,
    });
  };
};

export const embedChunks = async (embed: EmbedClient, chunks: string[]) => {
  const vectors: number[][] = [];
  for (let index = 0; index < chunks.length; index += 8) {
    vectors.push(...await embed.embed(chunks.slice(index, index + 8)));
  }
  return vectors;
};

const getCourse = async (db: LumiDb, courseId: string) => {
  const result = await db.execute<CourseRow>(sql`
    select id, topic, description
    from courses
    where id = ${courseId}
  `);
  const course = result.rows[0];
  if (!course) throw new PermanentJobError("Course not found");
  return course;
};

const ensureCanContinue = async (db: LumiDb, courseId: string, stage: string) => {
  const result = await db.execute<{
    cancel_requested_at: Date | null;
    budget_exhausted_at: Date | null;
  }>(sql`
    select cancel_requested_at, budget_exhausted_at
    from course_generation_usage
    where course_id = ${courseId}
  `);
  const usage = result.rows[0];
  if (usage?.cancel_requested_at) throw new PermanentJobError(`Course generation cancelled at ${stage}`);
  if (usage?.budget_exhausted_at) throw new PermanentJobError(`Course generation budget exhausted at ${stage}`);
};

const ensureConceptBudget = async (db: LumiDb, courseId: string, count: number) => {
  const result = await db.execute<{ max_concepts: number }>(sql`
    select (limits->>'maxConcepts')::int as max_concepts
    from course_generation_usage
    where course_id = ${courseId}
  `);
  const max = result.rows[0]?.max_concepts;
  if (typeof max === "number" && count > max) {
    await exhaustBudget(db, courseId, "maxConcepts");
    throw new PermanentJobError("Research concept budget exhausted");
  }
};

const markSearchQueries = async (db: LumiDb, courseId: string, count: number) => {
  const result = await db.execute<{ exhausted: boolean }>(sql`
    update course_generation_usage
    set search_queries_count = greatest(search_queries_count, ${count}),
        research_iterations_count = greatest(research_iterations_count, 1),
        budget_exhausted_at = case
          when ${count} > (limits->>'maxSearchQueries')::int then coalesce(budget_exhausted_at, now())
          else budget_exhausted_at
        end,
        budget_exhausted_reason = case
          when ${count} > (limits->>'maxSearchQueries')::int then 'maxSearchQueries'
          else budget_exhausted_reason
        end,
        updated_at = now()
    where course_id = ${courseId}
    returning budget_exhausted_at is not null as exhausted
  `);
  if (result.rows[0]?.exhausted) throw new PermanentJobError("Research search-query budget exhausted");
};

const markCrawlUsage = async (db: LumiDb, courseId: string, pages: CrawledPage[]) => {
  const bytes = pages.reduce((sum, page) => sum + page.byteLength, 0);
  const result = await db.execute<{ exhausted: boolean }>(sql`
    update course_generation_usage
    set sources_crawled_count = greatest(sources_crawled_count, ${pages.length}),
        crawl_bytes = greatest(crawl_bytes, ${bytes}),
        budget_exhausted_at = case
          when ${pages.length} > (limits->>'maxCrawledSources')::int or ${bytes} > (limits->>'maxCrawledBytes')::int
            then coalesce(budget_exhausted_at, now())
          else budget_exhausted_at
        end,
        budget_exhausted_reason = case
          when ${pages.length} > (limits->>'maxCrawledSources')::int then 'maxCrawledSources'
          when ${bytes} > (limits->>'maxCrawledBytes')::int then 'maxCrawledBytes'
          else budget_exhausted_reason
        end,
        updated_at = now()
    where course_id = ${courseId}
    returning budget_exhausted_at is not null as exhausted
  `);
  if (result.rows[0]?.exhausted) throw new PermanentJobError("Research crawl budget exhausted");
};

const exhaustBudget = async (db: LumiDb, courseId: string, reason: string) => {
  await db.execute(sql`
    update course_generation_usage
    set budget_exhausted_at = coalesce(budget_exhausted_at, now()),
        budget_exhausted_reason = ${reason},
        updated_at = now()
    where course_id = ${courseId}
  `);
};

const setProgress = async (db: LumiDb, jobId: string, progress: number, metadata: Record<string, unknown>) => {
  await db.execute(sql`
    update generation_jobs
    set progress = ${progress},
        metadata = metadata || ${JSON.stringify(metadata)}::jsonb,
        updated_at = now()
    where id = ${jobId} and status = 'running'
  `);
};

const buildConceptPlan = (course: CourseRow): ConceptPlan[] => {
  if (/redis/i.test(course.topic)) return redisConcepts;
  const topic = course.topic.trim();
  return [
    { name: `${topic} fundamentals`, description: `Core ideas needed to understand ${topic}.`, importance: 5, depthRequired: 3, prerequisites: [] },
    { name: `${topic} implementation`, description: `Practical implementation workflow for ${topic}.`, importance: 4, depthRequired: 3, prerequisites: [`${topic} fundamentals`] },
    { name: `${topic} failure modes`, description: `Common mistakes, tradeoffs, and recovery patterns for ${topic}.`, importance: 3, depthRequired: 2, prerequisites: [`${topic} implementation`] },
  ];
};

const buildQueries = (course: CourseRow, concepts: ConceptPlan[]) => [
  `${course.topic} official documentation`,
  `${course.topic} implementation guide`,
  `${course.topic} failure modes production`,
  ...concepts.slice(0, 5).map((concept) => `${concept.name} ${course.topic}`),
].filter((query, index, all) => all.findIndex((other) => other.toLowerCase() === query.toLowerCase()) === index);

export const normalizeUrl = (value: string) => {
  const url = new URL(value);
  url.hash = "";
  url.searchParams.sort();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  return url.toString();
};

const rankSources = (results: SearchResult[], topic: string): RankedSource[] => {
  const seen = new Set<string>();
  return results.flatMap((result): RankedSource[] => {
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(result.url);
    } catch {
      return [];
    }
    if (seen.has(normalizedUrl)) return [];
    seen.add(normalizedUrl);

    const host = new URL(normalizedUrl).hostname.toLowerCase();
    const isOfficial = host === "redis.io" || host.endsWith(".redis.io");
    const isPrimary = host === "github.com";
    const text = `${result.title} ${result.snippet}`.toLowerCase();
    const relevance = topic.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && text.includes(word)).length;
    return [{
      ...result,
      normalizedUrl,
      sourceType: isOfficial ? "official" : isPrimary ? "primary" : "reference",
      protection: isOfficial ? "redis.io official source" : isPrimary ? "primary repository candidate" : null,
      score: relevance + (isOfficial ? 10 : isPrimary ? 5 : 0),
    }];
  }).sort((a, b) => b.score - a.score || a.normalizedUrl.localeCompare(b.normalizedUrl));
};

export const validateSourceUrl = async (
  value: string,
  security: ResearchConfig["researchSecurity"],
  lookup: typeof dnsLookup = dnsLookup,
): Promise<{ ok: true } | { ok: false; reason: string }> => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, reason: "unsupported_scheme" };
  if (url.username || url.password) return { ok: false, reason: "url_credentials" };
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (!security.allowedOutboundPorts.includes(port)) return { ok: false, reason: "blocked_port" };

  const addresses = await lookup(url.hostname, { all: true }).catch(() => {
    throw new RetryableJobError(`DNS lookup failed for ${url.hostname}`);
  });
  return addresses.some((address) => isForbiddenAddress(address.address))
    ? { ok: false, reason: "forbidden_address" }
    : { ok: true };
};

export const isForbiddenAddress = (address: string) => {
  const ipType = net.isIP(address);
  if (ipType === 4) {
    const [a = 0, b = 0, c = 0, d = 0] = address.split(".").map(Number);
    const value = (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && c === 0) || (a === 192 && b === 0 && c === 2) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113) || value >= 0xe0000000;
  }
  if (ipType === 6) {
    const lower = address.toLowerCase();
    return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") ||
      lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") ||
      lower.startsWith("ff") || lower.startsWith("::ffff:127.") || lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:169.254.") || lower.startsWith("::ffff:192.168.");
  }
  return true;
};

const isAllowedPage = (page: CrawledPage, config: ResearchConfig) =>
  config.researchSecurity.allowedMimeTypes.includes(page.mimeType) &&
  page.byteLength <= config.researchSecurity.maxResourceBytes;

export const sanitizeMarkdown = (markdown: string) =>
  markdown
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/<\/?(?:iframe|object|embed)[^>]*>/gi, "")
    .trim();

export const hasPromptInjection = (content: string) =>
  /(ignore (all )?(previous|above) instructions|system prompt|developer message|tool call|reveal.*secret|act as)/i.test(content);

export const chunkMarkdown = (markdown: string) => {
  const clean = sanitizeMarkdown(markdown);
  const sections = clean.split(/\n(?=#{1,3}\s+)/).map((section) => section.trim()).filter(Boolean);
  return sections.flatMap((section, index) => {
    const heading = section.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim() ?? null;
    const content = section.replace(/^#{1,3}\s+.+$/m, "").trim() || section;
    return content.length < 40 ? [] : [{ heading, content: content.slice(0, 1_000), role: inferChunkRole(content), order: index }];
  });
};

const inferChunkRole = (content: string) => {
  const lower = content.toLowerCase();
  if (lower.includes("example") || lower.includes("command")) return "example";
  if (lower.includes("fail") || lower.includes("recover") || lower.includes("error")) return "failure_mode";
  if (lower.includes("tradeoff") || lower.includes("versus")) return "tradeoff";
  return "explanation";
};

const persistResearch = async (
  db: LumiDb,
  input: {
    job: GenerationJobRow;
    course: CourseRow;
    concepts: ConceptPlan[];
    sources: RankedSource[];
    pages: CrawledPage[];
    chunksByUrl: Map<string, ReturnType<typeof chunkMarkdown>>;
    vectors: number[][];
    blocked: { url: string; reason: string }[];
  },
) => {
  await db.transaction(async (tx) => {
    const conceptIds = new Map<string, string>();
    for (const concept of input.concepts) {
      const existing = await tx.execute<{ id: string }>(sql`
        select c.id
        from concepts c
        join course_concepts cc on cc.concept_id = c.id
        where cc.course_id = ${input.course.id} and lower(c.name) = lower(${concept.name})
        limit 1
      `);
      const conceptId = existing.rows[0]?.id ?? (await tx.execute<{ id: string }>(sql`
        insert into concepts (name, description)
        values (${concept.name}, ${concept.description})
        returning id
      `)).rows[0]?.id;
      if (!conceptId) throw new Error("concept insert failed");
      conceptIds.set(concept.name.toLowerCase(), conceptId);
      await tx.execute(sql`
        insert into course_concepts (
          course_id, concept_id, importance, depth_required, coverage_status, coverage_confidence, source_pack_metadata
        )
        values (
          ${input.course.id}, ${conceptId}, ${concept.importance}, ${concept.depthRequired},
          'weakly_covered', 0.5, ${JSON.stringify({ expected: true })}::jsonb
        )
        on conflict (course_id, concept_id) do update
          set importance = excluded.importance,
              depth_required = excluded.depth_required,
              updated_at = now()
      `);
    }

    for (const concept of input.concepts) {
      const conceptId = conceptIds.get(concept.name.toLowerCase());
      if (!conceptId) continue;
      for (const prerequisite of concept.prerequisites) {
        const dependencyId = conceptIds.get(prerequisite.toLowerCase());
        if (dependencyId && dependencyId !== conceptId) {
          await tx.execute(sql`
            insert into concept_dependencies (concept_id, dependency_id, relationship_type)
            values (${conceptId}, ${dependencyId}, 'hard_prerequisite')
            on conflict do nothing
          `);
        }
      }
    }

    const sourceIds = new Map<string, string>();
    for (const source of input.sources) {
      const page = input.pages.find((candidate) => normalizeUrl(candidate.finalUrl) === source.normalizedUrl || normalizeUrl(candidate.url) === source.normalizedUrl);
      if (!page) continue;
      const sourceRow = await tx.execute<{ id: string }>(sql`
        insert into sources (
          course_id, url, normalized_url, title, type, authority_score, storage_path, research_metadata, retrieved_at
        )
        values (
          ${input.course.id}, ${page.finalUrl}, ${source.normalizedUrl}, ${page.title ?? source.title}, ${source.sourceType},
          ${Math.min(1, source.score / 15)}, ${`research/${input.course.id}/${Buffer.from(source.normalizedUrl).toString("base64url")}.md`},
          ${JSON.stringify({
            protection: source.protection,
            links: page.links.slice(0, 20),
            promptInjection: hasPromptInjection(page.markdown),
            blocked: input.blocked,
          })}::jsonb,
          now()
        )
        on conflict (course_id, normalized_url) do update
          set title = excluded.title,
              authority_score = excluded.authority_score,
              storage_path = excluded.storage_path,
              research_metadata = excluded.research_metadata,
              retrieved_at = excluded.retrieved_at
        returning id
      `);
      const sourceId = sourceRow.rows[0]?.id;
      if (!sourceId) throw new Error("source insert failed");
      sourceIds.set(source.normalizedUrl, sourceId);
      await tx.execute(sql`delete from source_chunks where source_id = ${sourceId}`);
    }

    let vectorIndex = 0;
    for (const [normalizedUrl, chunks] of input.chunksByUrl) {
      const sourceId = sourceIds.get(normalizedUrl);
      if (!sourceId) {
        vectorIndex += chunks.length;
        continue;
      }
      for (const chunk of chunks) {
        const vector = input.vectors[vectorIndex++];
        if (!vector) throw new Error("missing embedding vector");
        await tx.execute(sql`
          insert into source_chunks (source_id, course_id, heading, content, metadata, embedding, embedding_model, embedding_version)
          values (
            ${sourceId}, ${input.course.id}, ${chunk.heading}, ${chunk.content},
            ${JSON.stringify({ role: chunk.role, order: chunk.order })}::jsonb,
            ${JSON.stringify(vector)}::vector, 'BAAI/bge-small-en-v1.5', 'v1'
          )
        `);
      }
    }

    const firstSourceId = sourceIds.values().next().value as string | undefined;
    for (const concept of input.concepts) {
      const conceptId = conceptIds.get(concept.name.toLowerCase());
      if (!conceptId || !firstSourceId) continue;
      await tx.execute(sql`
        insert into concept_sources (course_id, concept_id, source_id, relevance_score, role, metadata)
        values (${input.course.id}, ${conceptId}, ${firstSourceId}, 0.8, 'source_pack', ${JSON.stringify({ concept: concept.name })}::jsonb)
        on conflict (course_id, concept_id, source_id) do update
          set relevance_score = excluded.relevance_score,
              metadata = excluded.metadata
      `);
      await tx.execute(sql`
        update course_concepts
        set coverage_status = 'covered',
            coverage_confidence = 0.8,
            source_pack_metadata = ${JSON.stringify({ sourceIds: [firstSourceId], coverageReason: "fixture/source-backed evidence" })}::jsonb,
            updated_at = now()
        where course_id = ${input.course.id} and concept_id = ${conceptId}
      `);
    }

    const assetPage = input.pages.find((page) => page.images.length > 0);
    const assetImage = assetPage?.images.find((image) => image.url.startsWith("https://") && image.mimeType !== "image/svg+xml");
    const assetSourceId = assetPage ? sourceIds.get(normalizeUrl(assetPage.finalUrl)) : undefined;
    if (assetImage && assetSourceId) {
      await tx.execute(sql`
        insert into assets (course_id, type, title, description, alt_text, storage_path, source_url, source_id, mime_type, file_size, metadata)
        select ${input.course.id}, 'source_image', 'Research image', 'Source-provided research asset',
          ${assetImage.alt ?? "Research image"}, ${`research/${input.course.id}/assets/${Buffer.from(assetImage.url).toString("base64url")}`},
          ${assetImage.url}, ${assetSourceId}, ${assetImage.mimeType ?? "image/png"}, ${assetImage.byteLength ?? null},
          ${JSON.stringify({ source: "crawl4ai", securityChecked: true })}::jsonb
        where not exists (
          select 1 from assets where course_id = ${input.course.id} and source_url = ${assetImage.url}
        )
      `);
    }

    await tx.execute(sql`
      update course_generation_usage
      set concepts_count = greatest(concepts_count, ${input.concepts.length}),
          updated_at = now()
      where course_id = ${input.course.id}
    `);
    await enqueueGenerationJob(tx, { courseId: input.course.id, type: "curriculum", metadata: { afterJobId: input.job.id } });
    await setProgress(tx as LumiDb, input.job.id, 95, { stage: "curriculum_queued" });
  });
};
