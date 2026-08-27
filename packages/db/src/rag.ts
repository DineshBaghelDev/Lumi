import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.ts";

type Db = Pick<NodePgDatabase<typeof schema>, "execute">;

export type RetrievedChunk = {
  chunkId: string;
  sourceId: string;
  heading: string | null;
  content: string;
  similarity: number;
  sourceUrl: string;
  sourceTitle: string | null;
};

/**
 * Course-scoped pgvector top-k retrieval.
 * Optionally biases toward chunks from a specific lesson via concept mappings.
 */
export const retrieveChunks = async (
  db: Db,
  {
    courseId,
    embedding,
    topK = 8,
    lessonId,
  }: {
    courseId: string;
    embedding: number[];
    topK?: number;
    lessonId?: string | null;
  },
): Promise<RetrievedChunk[]> => {
  const embeddingLiteral = `[${embedding.join(",")}]`;

  if (lessonId) {
    const result = await db.execute<RetrievedChunk>(sql`
      with lesson_concepts as (
        select concept_id
        from lessons l
        join modules m on m.id = l.module_id
        join curricula c on c.id = m.curriculum_id
        where l.id = ${lessonId} and c.course_id = ${courseId}
      ),
      lesson_source_ids as (
        select source_id
        from concept_sources
        where course_id = ${courseId}
          and concept_id in (select concept_id from lesson_concepts)
      ),
      scored as (
        select
          sc.id as "chunkId",
          sc.source_id as "sourceId",
          sc.heading,
          sc.content,
          1 - (sc.embedding <=> ${embeddingLiteral}::vector) as similarity,
          s.url as "sourceUrl",
          s.title as "sourceTitle",
          case when sc.source_id in (select source_id from lesson_source_ids) then 1 else 0 end as lesson_bias
        from source_chunks sc
        join sources s on s.id = sc.source_id
        where sc.course_id = ${courseId}
          and sc.embedding is not null
        order by lesson_bias desc, sc.embedding <=> ${embeddingLiteral}::vector
        limit ${topK}
      )
      select "chunkId", "sourceId", heading, content, similarity, "sourceUrl", "sourceTitle"
      from scored
    `);
    return result.rows;
  }

  const result = await db.execute<RetrievedChunk>(sql`
    select
      sc.id as "chunkId",
      sc.source_id as "sourceId",
      sc.heading,
      sc.content,
      1 - (sc.embedding <=> ${embeddingLiteral}::vector) as similarity,
      s.url as "sourceUrl",
      s.title as "sourceTitle"
    from source_chunks sc
    join sources s on s.id = sc.source_id
    where sc.course_id = ${courseId}
      and sc.embedding is not null
    order by sc.embedding <=> ${embeddingLiteral}::vector
    limit ${topK}
  `);
  return result.rows;
};

/**
 * Resolve citation chunk IDs to source metadata for display.
 */
export const resolveCitations = async (
  db: Db,
  {
    chunkIds,
    courseId,
  }: {
    chunkIds: string[];
    courseId: string;
  },
): Promise<
  Array<{
    chunkId: string;
    sourceId: string;
    sourceTitle: string | null;
    sourceUrl: string;
    heading: string | null;
    excerpt: string;
  }>
> => {
  if (chunkIds.length === 0) return [];

  const result = await db.execute<{
    chunkId: string;
    sourceId: string;
    sourceTitle: string | null;
    sourceUrl: string;
    heading: string | null;
    excerpt: string;
  }>(sql`
    select
      sc.id as "chunkId",
      sc.source_id as "sourceId",
      s.title as "sourceTitle",
      s.url as "sourceUrl",
      sc.heading,
      left(sc.content, 300) as excerpt
    from source_chunks sc
    join sources s on s.id = sc.source_id
    where sc.id = any(${`{${chunkIds.join(",")}}`}::uuid[])
      and sc.course_id = ${courseId}
  `);
  return result.rows;
};
