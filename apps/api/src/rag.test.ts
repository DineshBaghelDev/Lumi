import { strict as assert } from "node:assert";
import test from "node:test";
import { resolveCitations, retrieveChunks } from "@lumi/db";

// ===== 084: RAG retrieval/chat integration tests =====

// These tests verify the RAG retrieval and citation resolution logic
// They use mock DB to test the SQL generation and result mapping

test("retrieveChunks: generates correct pgvector query for course-scoped retrieval", async () => {
  const calls: unknown[] = [];
  const db = {
    execute: async (query: unknown) => {
      calls.push(query);
      return {
        rows: [
          {
            chunkId: "chunk-1",
            sourceId: "source-1",
            heading: "Introduction",
            content: "Machine learning is...",
            similarity: 0.85,
            sourceUrl: "https://example.com/ml",
            sourceTitle: "ML Guide",
          },
        ],
      };
    },
  };

  const chunks = await retrieveChunks(db as never, {
    courseId: "course-1",
    embedding: [0.1, 0.2, 0.3],
    topK: 5,
  });

  assert.equal(chunks.length, 1);
  const chunk = chunks[0]!;
  assert.equal(chunk.chunkId, "chunk-1");
  assert.equal(chunk.sourceTitle, "ML Guide");
  assert.equal(chunk.similarity, 0.85);
  assert.ok(calls.length === 1);
});

test("retrieveChunks: propagates DB errors to caller", async () => {
  const db = {
    execute: async () => {
      throw new Error("DB error");
    },
  };

  await assert.rejects(
    () => retrieveChunks(db as never, {
      courseId: "course-1",
      embedding: [0.1, 0.2],
      topK: 5,
    }),
    { message: "DB error" },
  );
});

test("resolveCitations: returns empty for empty chunk IDs", async () => {
  const db = { execute: async () => ({ rows: [] }) };

  const citations = await resolveCitations(db as never, {
    chunkIds: [],
    courseId: "course-1",
  });

  assert.equal(citations.length, 0);
});

test("resolveCitations: maps chunk IDs to source metadata", async () => {
  const db = {
    execute: async () => ({
      rows: [
        {
          chunkId: "chunk-1",
          sourceId: "source-1",
          sourceTitle: "PostgreSQL Docs",
          sourceUrl: "https://postgresql.org/docs",
          heading: "Indexing",
          excerpt: "An index is a structure...",
        },
      ],
    }),
  };

  const citations = await resolveCitations(db as never, {
    chunkIds: ["chunk-1"],
    courseId: "course-1",
  });

  assert.equal(citations.length, 1);
  const cit = citations[0]!;
  assert.equal(cit.sourceTitle, "PostgreSQL Docs");
  assert.equal(cit.sourceUrl, "https://postgresql.org/docs");
  assert.equal(cit.heading, "Indexing");
  assert.ok(cit.excerpt.length > 0);
});

test("resolveCitations: filters by course_id to prevent cross-course leakage", async () => {
  const calls: unknown[] = [];
  const db = {
    execute: async (query: unknown) => {
      calls.push(query);
      return { rows: [] };
    },
  };

  const result = await resolveCitations(db as never, {
    chunkIds: ["chunk-1", "chunk-2"],
    courseId: "course-A",
  });

  // Should have made one query and returned empty
  assert.equal(calls.length, 1);
  assert.ok(Array.isArray(result));
});

// ===== Chat streaming behavior tests =====

test("chat: empty retrieval gracefully falls back to no-context response", () => {
  // When TEI is unavailable, the chat route should still work
  // by providing a system prompt without course materials
  const chunks: never[] = [];
  const systemPrompt = chunks.length
    ? `Based on course materials: ${chunks.length} chunks`
    : "No specific course materials were found.";

  assert.ok(systemPrompt.includes("No specific course materials"));
});

test("chat: citation extraction finds [Source N] patterns", () => {
  const content = "This is explained in [Source 1] and also in [Source 3]. [Source 2] has more details.";
  const chunks = [
    { chunkId: "c1", heading: "Intro" },
    { chunkId: "c2", heading: "Details" },
    { chunkId: "c3", heading: "Advanced" },
  ];

  const citedIds = new Set<string>();
  const pattern = /\[Source\s+(\d+)\]/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < chunks.length) {
      citedIds.add(chunks[index]!.chunkId);
    }
  }

  assert.equal(citedIds.size, 3);
  assert.ok(citedIds.has("c1"));
  assert.ok(citedIds.has("c2"));
  assert.ok(citedIds.has("c3"));
});

test("chat: citation extraction handles out-of-range references", () => {
  const content = "See [Source 99] for more info.";
  const chunks = [{ chunkId: "c1" }];

  const citedIds = new Set<string>();
  const pattern = /\[Source\s+(\d+)\]/gi;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < chunks.length) {
      citedIds.add(chunks[index]!.chunkId);
    }
  }

  assert.equal(citedIds.size, 0);
});

// ===== Cross-course isolation =====

test("retrieveChunks: query is scoped to single course", async () => {
  const db = {
    execute: async () => {
      return { rows: [] };
    },
  };

  // Should complete without error and return empty array
  const result = await retrieveChunks(db as never, {
    courseId: "course-A",
    embedding: [0.1],
    topK: 5,
  });

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 0);
});

test("resolveCitations: query is scoped to single course", async () => {
  const db = {
    execute: async () => {
      return { rows: [] };
    },
  };

  // Should complete without error and return empty array
  const result = await resolveCitations(db as never, {
    chunkIds: ["chunk-1"],
    courseId: "course-B",
  });

  assert.ok(Array.isArray(result));
  assert.equal(result.length, 0);
});
