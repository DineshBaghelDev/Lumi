import { llmCalls, type LumiDb } from "@lumi/db";

export class LlmClientError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

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

export type LiteLlmConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CompleteInput = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

type LiteLlmUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type CompleteResult = {
  content: string;
  model: string;
  rawRequestId: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

type Fetcher = typeof fetch;

export class LiteLlmClient {
  private readonly config: LiteLlmConfig;
  private readonly fetcher: Fetcher;

  constructor(
    config: LiteLlmConfig,
    fetcher: Fetcher = fetch,
  ) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async complete(input: CompleteInput): Promise<CompleteResult> {
    if (!input.messages.some((message) => message.role === "system")) {
      throw new LlmClientError("LiteLLM requests require a system message");
    }

    const started = Date.now();
    const init: RequestInit = {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: input.model ?? this.config.model,
        messages: input.messages,
        temperature: input.temperature ?? 0,
        max_tokens: input.maxTokens,
      }),
    };
    if (input.signal) init.signal = input.signal;

    const response = await this.fetcher(new URL("/v1/chat/completions", this.config.baseUrl), init).catch((error: unknown) => {
      throw new LlmClientError(error instanceof Error ? error.message : "LiteLLM network error", true);
    });

    if (!response.ok) {
      throw new LlmClientError(`LiteLLM ${response.status}`, response.status === 429 || response.status >= 500);
    }

    const body = await response.json() as {
      id?: string;
      model?: string;
      usage?: LiteLlmUsage;
      choices?: { message?: { content?: string } }[];
    };
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new LlmClientError("LiteLLM response missing content");

    return {
      content,
      model: body.model ?? input.model ?? this.config.model,
      rawRequestId: body.id ?? null,
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - started,
    };
  }

  async structured<T>(input: CompleteInput, parse: (value: unknown) => T): Promise<T> {
    const result = await this.complete(input);
    try {
      return parse(JSON.parse(result.content));
    } catch (error) {
      throw new LlmClientError(error instanceof Error ? `Invalid structured LLM output: ${error.message}` : "Invalid structured LLM output");
    }
  }

  async *stream(input: CompleteInput): AsyncIterable<string> {
    const result = await this.complete(input);
    yield result.content;
  }
}
