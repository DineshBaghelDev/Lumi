import { llmCalls, type LumiDb } from "@lumi/db";

export type LlmCallLog = {
  jobId?: string | null;
  model: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  costUsd?: string | null;
  rawRequestId?: string | null;
  metadata?: Record<string, unknown>;
};

export const recordLlmCall = async (db: LumiDb, log: LlmCallLog) => {
  const [row] = await db
    .insert(llmCalls)
    .values({
      jobId: log.jobId ?? null,
      model: log.model,
      promptVersion: log.promptVersion,
      inputTokens: log.inputTokens,
      outputTokens: log.outputTokens,
      latencyMs: log.latencyMs,
      costUsd: log.costUsd ?? null,
      rawRequestId: log.rawRequestId ?? null,
      metadata: log.metadata ?? {},
    })
    .returning({ id: llmCalls.id });

  if (!row) {
    throw new Error("LLM call logging failed");
  }

  return row;
};
