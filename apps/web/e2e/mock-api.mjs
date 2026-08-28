import { createServer } from "node:http";

const port = Number(process.env.LUMI_E2E_MOCK_PORT ?? 3107);
const host = "127.0.0.1";
const courseId = "course-e2e";
const lessonId = "lesson-index-basics";
const assessmentId = "assessment-index-basics";
const projectId = "project-index-tuning";
const failedJobId = "job-question-retry";

const initialState = () => ({
  phase: "empty",
  createdPayload: null,
  idempotencyKey: null,
  retryCount: 0,
  progress: { status: "not_started", currentBlockIndex: 0 },
  notes: [],
  hintCount: 0,
  projectCompleted: false,
  threads: [],
  nextNote: 1,
});

let state = initialState();

const json = (res, status, body) => {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(text),
  });
  res.end(text);
};

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
};

const course = () => ({
  id: courseId,
  title: state.createdPayload?.topic ?? "PostgreSQL indexing",
  topic: state.createdPayload?.topic ?? "PostgreSQL indexing",
  description: "A deterministic V1 course about practical Postgres indexes.",
  difficulty_level: state.createdPayload?.difficultyLevel ?? "beginner",
  estimated_duration_minutes: 90,
  status: state.phase === "generating" ? "generating" : "ready",
});

const jobs = () => {
  if (state.phase === "generating") {
    return [
      { id: "job-research", type: "research", status: "succeeded", progress: 100, stage: "Research", canRetry: false, message: null },
      { id: "job-lesson-2", type: "lesson", status: "running", progress: 55, stage: "Lesson", canRetry: false, message: "Writing the second lesson." },
    ];
  }
  if (state.phase === "failed") {
    return [
      { id: failedJobId, type: "question", status: "failed", progress: 80, stage: "Questions", canRetry: true, message: "Question generation failed for this lesson." },
    ];
  }
  return [
    { id: "job-research", type: "research", status: "succeeded", progress: 100, stage: "Research", canRetry: false, message: null },
    { id: failedJobId, type: "question", status: state.retryCount ? "queued" : "succeeded", progress: state.retryCount ? 0 : 100, stage: "Questions", canRetry: false, message: null },
  ];
};

const roadmap = () => ({
  modules: [{ id: "module-indexes", title: "Index fundamentals", description: "Read plans before tuning queries.", order_index: 1 }],
  lessons: [
    {
      id: lessonId,
      module_id: "module-indexes",
      title: "Read an index plan",
      objectives: ["Explain when an index helps a query"],
      status: "ready",
      order_index: 1,
      is_required: true,
      assessment_id: assessmentId,
      assessment_status: "ready",
    },
    {
      id: "lesson-partial",
      module_id: "module-indexes",
      title: "Composite index order",
      objectives: ["Choose an index column order"],
      status: state.phase === "generating" ? "queued" : "ready",
      order_index: 2,
      is_required: true,
      assessment_id: "assessment-partial",
      assessment_status: state.phase === "generating" ? "queued" : "ready",
    },
  ],
  projects: [{ id: projectId, title: "Tune a slow dashboard query", goal: "Use EXPLAIN to choose one index.", status: "ready" }],
});

const lesson = {
  id: lessonId,
  course_id: courseId,
  title: "Read an index plan",
  status: "ready",
  assessment_id: assessmentId,
  content_json: {
    schemaVersion: 1,
    title: "Read an index plan",
    summary: "Use query plans to decide whether an index is helping.",
    blocks: [
      { id: "plan-basics", type: "heading", level: 2, text: "Plan basics" },
      { id: "index-scan", type: "paragraph", text: "An Index Scan can avoid reading unrelated table rows.", sourceRefs: [{ sourceId: "source-postgres", chunkId: "chunk-index-scan" }] },
      { id: "tradeoffs", type: "callout", tone: "tip", title: "Check selectivity", text: "Small tables and broad filters may not benefit from an index.", sourceRefs: [{ sourceId: "source-postgres", chunkId: "chunk-selectivity" }] },
    ],
  },
};

const assessment = {
  assessment: { id: assessmentId, title: "Index plan check", status: "ready", lessonId, courseId },
  questions: [
    {
      questionId: "q-index-scan",
      kind: "mcq",
      difficulty: 2,
      prompt: "Which plan node shows Postgres using an index?",
      options: [
        { id: "seq", text: "Seq Scan" },
        { id: "idx", text: "Index Scan" },
      ],
    },
    {
      questionId: "q-fill",
      kind: "fill_blank",
      difficulty: 2,
      prompt: "A selective predicate reads fewer table ____.",
    },
  ],
  latestAttempt: null,
};

const projectPayload = () => ({
  project: {
    id: projectId,
    title: "Tune a slow dashboard query",
    goal: "Use EXPLAIN to choose one index.",
    storyline: "The analytics dashboard slows down when filtering by account.",
    status: "ready",
    courseId,
  },
  totalMilestones: 1,
  completedMilestones: state.projectCompleted ? 1 : 0,
  progressStatus: state.projectCompleted ? "completed" : "in_progress",
  currentMilestone: state.projectCompleted ? null : {
    id: "milestone-plan",
    orderIndex: 1,
    title: "Inspect the plan",
    scenario: "The query filters by account_id and created_at.",
    learnerDecisionPrompt: "Which index would you try first?",
    implementationGoal: "Run EXPLAIN and propose one composite index.",
    constraints: ["Do not add duplicate indexes."],
    expectedOutcome: "A smaller scanned row count.",
    lessons: [{ id: lessonId, title: "Read an index plan" }],
    hints: state.hintCount ? [{ level: "nudge", text: "Start with the equality column before the range column." }] : [],
    revealedHints: state.hintCount,
    hintCount: 1,
  },
});

const route = async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${host}:${port}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/health") return json(res, 200, { ok: true });
  if (req.method === "POST" && path === "/__reset") {
    state = initialState();
    return json(res, 200, { ok: true });
  }
  if (req.method === "POST" && path === "/__phase") {
    const body = await readJson(req);
    state.phase = body.phase;
    return json(res, 200, { ok: true });
  }
  if (req.method === "GET" && path === "/__state") return json(res, 200, state);

  if (req.method === "GET" && path === "/courses") {
    return json(res, 200, { courses: state.phase === "empty" ? [] : [course()] });
  }
  if (req.method === "POST" && path === "/courses") {
    state.createdPayload = await readJson(req);
    state.idempotencyKey = req.headers["idempotency-key"] ?? null;
    state.phase = "generating";
    return json(res, 201, { course: course() });
  }
  if (req.method === "GET" && path === `/courses/${courseId}`) {
    return json(res, 200, { course: course(), jobs: jobs(), usage: null });
  }
  if (req.method === "GET" && path === `/courses/${courseId}/curriculum`) return json(res, 200, roadmap());
  if (req.method === "GET" && path === `/courses/${courseId}/progress/resume`) {
    return json(res, 200, { type: "lesson", lessonId, blockIndex: state.progress.currentBlockIndex });
  }
  if (req.method === "GET" && path === `/lessons/${lessonId}`) return json(res, 200, { lesson, assets: [] });
  if (req.method === "PATCH" && path === `/lessons/${lessonId}/progress`) {
    const body = await readJson(req);
    state.progress = { status: body.status, currentBlockIndex: body.currentBlockIndex ?? 0 };
    return json(res, 200, { progress: state.progress });
  }
  if (req.method === "POST" && path === `/lessons/${lessonId}/skip`) {
    state.progress = { status: "skipped", currentBlockIndex: state.progress.currentBlockIndex };
    return json(res, 200, { progress: state.progress });
  }

  if (req.method === "GET" && path === `/courses/${courseId}/lessons/${lessonId}/notes`) return json(res, 200, { notes: state.notes });
  if (req.method === "POST" && path === `/courses/${courseId}/lessons/${lessonId}/notes`) {
    const body = await readJson(req);
    state.notes.push({
      id: `note-${state.nextNote++}`,
      type: body.type,
      blockId: body.blockId ?? null,
      content: body.content ?? null,
      createdAt: new Date(0).toISOString(),
    });
    return json(res, 201, { note: state.notes.at(-1) });
  }

  if (req.method === "GET" && path === `/assessments/${assessmentId}`) return json(res, 200, assessment);
  if (req.method === "POST" && path === `/assessments/${assessmentId}/objective-score`) {
    const body = await readJson(req);
    return json(res, 200, { correct: body.response === "idx" });
  }
  if (req.method === "POST" && path === `/assessments/${assessmentId}/submissions`) {
    return json(res, 200, {
      attempt: { id: "attempt-e2e", score: 1 },
      results: [
        { questionId: "q-index-scan", kind: "mcq", correct: true, earnedPoints: 1, possiblePoints: 1, weakPoints: [], feedback: "Correct: Index Scan uses the index." },
        { questionId: "q-fill", kind: "fill_blank", correct: true, earnedPoints: 1, possiblePoints: 1, weakPoints: [], feedback: "Correct: rows." },
      ],
    });
  }

  if (req.method === "GET" && path === `/projects/${projectId}`) return json(res, 200, projectPayload());
  if (req.method === "POST" && path === `/projects/${projectId}/hints/reveal`) {
    state.hintCount = 1;
    return json(res, 200, { revealedHints: 1, hintCount: 1, hint: projectPayload().currentMilestone?.hints[0] ?? null });
  }
  if (req.method === "POST" && path === `/projects/${projectId}/milestones/milestone-plan/complete`) {
    state.projectCompleted = true;
    return json(res, 200, { progressStatus: "completed" });
  }

  if (req.method === "GET" && path === `/courses/${courseId}/threads`) return json(res, 200, { threads: state.threads });
  if (req.method === "GET" && path === `/courses/${courseId}/threads/thread-e2e/messages`) {
    return json(res, 200, {
      messages: [
        { id: "msg-user", role: "user", content: "What evidence supports using the index?" },
        {
          id: "msg-assistant",
          role: "assistant",
          content: "The lesson source says an Index Scan avoids unrelated rows.",
          citations: [{ chunkId: "chunk-index-scan", sourceId: "source-postgres", sourceTitle: "PostgreSQL docs", sourceUrl: "https://www.postgresql.org/docs/current/indexes.html", heading: "Indexes", excerpt: "Index Scan can avoid unrelated rows." }],
        },
      ],
    });
  }
  if (req.method === "POST" && path === `/courses/${courseId}/chat`) {
    await readJson(req);
    state.threads = [{ id: "thread-e2e", lessonId: null, lastMessage: "The lesson source says an Index Scan avoids unrelated rows." }];
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    res.end('data: {"threadId":"thread-e2e"}\n\ndata: {"content":"The lesson source says an Index Scan avoids unrelated rows."}\n\ndata: [DONE]\n\n');
    return;
  }
  if (req.method === "POST" && path === `/courses/${courseId}/citations`) {
    return json(res, 200, { citations: [] });
  }

  if (req.method === "POST" && path === `/generation-jobs/${failedJobId}/retry`) {
    state.retryCount += 1;
    state.phase = "ready";
    return json(res, 200, { job: jobs().find((job) => job.id === failedJobId) });
  }

  return json(res, 404, { error: `No mock route for ${req.method} ${path}` });
};

createServer((req, res) => {
  void route(req, res).catch((error) => json(res, 500, { error: error.message }));
}).listen(port, host, () => {
  console.log(`Lumi E2E mock API listening on http://${host}:${port}`);
});
