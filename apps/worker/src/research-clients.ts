export class ResearchClientError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

type Fetcher = typeof fetch;

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string | null;
};

export class SearxngClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  constructor(
    baseUrl: string,
    fetcher: Fetcher = fetch,
  ) {
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async search(query: string, { limit, signal }: { limit: number; signal?: AbortSignal }) {
    const url = new URL("/search", this.baseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");

    const init: RequestInit = {};
    if (signal) init.signal = signal;

    const response = await this.fetcher(url, init).catch((error: unknown) => {
      throw new ResearchClientError(error instanceof Error ? error.message : "SearXNG network error", true);
    });
    if (!response.ok) throw new ResearchClientError(`SearXNG ${response.status}`, response.status >= 500);

    const body = await response.json() as { results?: unknown[] };
    if (!Array.isArray(body.results)) throw new ResearchClientError("SearXNG response missing results");

    return body.results.slice(0, limit).flatMap((item): SearchResult[] => {
      if (!item || typeof item !== "object") return [];
      const result = item as Record<string, unknown>;
      return typeof result.url === "string"
        ? [{
          title: typeof result.title === "string" ? result.title : result.url,
          url: result.url,
          snippet: typeof result.content === "string" ? result.content : "",
          source: typeof result.engine === "string" ? result.engine : null,
        }]
        : [];
    });
  }
}

export type CrawledPage = {
  url: string;
  finalUrl: string;
  title: string | null;
  markdown: string;
  mimeType: string;
  byteLength: number;
  links: string[];
  images: { url: string; alt?: string | null; mimeType?: string | null; byteLength?: number | null }[];
};

export class Crawl4aiClient {
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;

  constructor(
    baseUrl: string,
    fetcher: Fetcher = fetch,
  ) {
    this.baseUrl = baseUrl;
    this.fetcher = fetcher;
  }

  async crawl(urls: string[], { signal }: { signal?: AbortSignal } = {}) {
    const pages: CrawledPage[] = [];
    let lastError: unknown;
    for (const url of urls) {
      try {
        pages.push(...await this.crawlBatch([url], signal ? { signal } : {}));
      } catch (error) {
        lastError = error;
      }
    }

    if (pages.length > 0) return pages;
    if (lastError) throw lastError;
    return [];
  }

  private async crawlBatch(urls: string[], { signal }: { signal?: AbortSignal } = {}) {
    const init: RequestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls }),
    };
    if (signal) init.signal = signal;

    const response = await this.fetcher(new URL("/crawl", this.baseUrl), init).catch((error: unknown) => {
      throw new ResearchClientError(error instanceof Error ? error.message : "Crawl4AI network error", true);
    });
    if (!response.ok) throw new ResearchClientError(`Crawl4AI ${response.status}`, response.status >= 500);

    const body = await response.json() as { results?: unknown[]; data?: unknown[] };
    const results = Array.isArray(body.results) ? body.results : body.data;
    if (!Array.isArray(results)) throw new ResearchClientError("Crawl4AI response missing results");

    return results.flatMap(normalizeCrawledPage);
  }
}

const pickString = (value: unknown, keys: string[]) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key];
  }
  return "";
};

const normalizeCrawledPage = (item: unknown): CrawledPage[] => {
  if (!item || typeof item !== "object") return [];
  const page = item as Record<string, unknown>;
  const url = typeof page.url === "string" ? page.url : "";
  const markdown = pickString(page.markdown, ["raw_markdown", "markdown", "fit_markdown"]) || pickString(page.content, []);
  if (!url || !markdown) return [];
  const metadata = page.metadata && typeof page.metadata === "object" ? page.metadata as Record<string, unknown> : {};
  const media = page.media && typeof page.media === "object" ? page.media as Record<string, unknown> : {};
  return [{
    url,
    finalUrl: typeof page.final_url === "string" ? page.final_url : typeof page.finalUrl === "string" ? page.finalUrl : url,
    title: typeof metadata.title === "string" ? metadata.title : typeof page.title === "string" ? page.title : null,
    markdown,
    mimeType: typeof page.mime_type === "string" ? page.mime_type : "text/markdown",
    byteLength: Buffer.byteLength(markdown),
    links: Array.isArray(page.links) ? page.links.filter((link): link is string => typeof link === "string") : [],
    images: (Array.isArray(page.images) ? page.images : Array.isArray(media.images) ? media.images : [])
      .flatMap((image): CrawledPage["images"] => {
        if (typeof image === "string") return [{ url: image }];
        if (!image || typeof image !== "object" || typeof (image as Record<string, unknown>).url !== "string") return [];
        const record = image as Record<string, unknown>;
        return [{
          url: record.url as string,
          alt: typeof record.alt === "string" ? record.alt : null,
          mimeType: typeof record.mime_type === "string" ? record.mime_type : null,
          byteLength: typeof record.byte_length === "number" ? record.byte_length : null,
        }];
      }),
  }];
};

export class TeiClient {
  private readonly config: { baseUrl: string; dimension: number; modelId: string };
  private readonly fetcher: Fetcher;

  constructor(
    config: { baseUrl: string; dimension: number; modelId: string },
    fetcher: Fetcher = fetch,
  ) {
    this.config = config;
    this.fetcher = fetcher;
  }

  async embed(input: string | string[], { signal }: { signal?: AbortSignal } = {}) {
    const init: RequestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ inputs: input }),
    };
    if (signal) init.signal = signal;

    const response = await this.fetcher(new URL("/embed", this.config.baseUrl), init).catch((error: unknown) => {
      throw new ResearchClientError(error instanceof Error ? error.message : "TEI network error", true);
    });
    if (!response.ok) throw new ResearchClientError(`TEI ${response.status}`, response.status >= 500);

    const body = await response.json() as unknown;
    const vectors = (Array.isArray(body) ? body : (body as { embeddings?: unknown }).embeddings) as unknown;
    if (!Array.isArray(vectors)) throw new ResearchClientError("TEI response missing embeddings");

    const rawBatch = Array.isArray(input) ? vectors : Array.isArray(vectors[0]) ? [vectors[0]] : [vectors];
    const normalized = rawBatch.map((vector) => {
      if (!Array.isArray(vector) || vector.length !== this.config.dimension || !vector.every((value) => typeof value === "number")) {
        throw new ResearchClientError(`TEI embedding dimension mismatch; expected ${this.config.dimension}`);
      }
      return vector as number[];
    });
    return Array.isArray(input) ? normalized : normalized[0]!;
  }
}
