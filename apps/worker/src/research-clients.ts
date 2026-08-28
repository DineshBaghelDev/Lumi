import { lookup as dnsLookup } from "node:dns/promises";
import net from "node:net";
import type { WorkerConfig } from "@lumi/config";

export class ResearchClientError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}

type Fetcher = typeof fetch;
type ResearchSecurity = WorkerConfig["researchSecurity"];
type LookupFn = typeof dnsLookup;

export type SourceUrlVerdict =
  | { ok: true; normalizedUrl: string; resolvedAddresses: string[] }
  | { ok: false; reason: string };

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
  resolvedAddresses: string[];
  redirectCount: number | null;
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

  async crawl(
    urls: string[],
    { signal, security, lookup = dnsLookup }: { signal?: AbortSignal; security?: ResearchSecurity; lookup?: LookupFn } = {},
  ) {
    const pages: CrawledPage[] = [];
    let lastError: unknown;
    for (const url of urls) {
      try {
        const options = security
          ? { ...(signal ? { signal } : {}), security, lookup }
          : signal ? { signal } : {};
        pages.push(...await this.crawlBatch([url], options));
      } catch (error) {
        lastError = error;
      }
    }

    if (pages.length > 0) return pages;
    if (lastError) throw lastError;
    return [];
  }

  private async crawlBatch(
    urls: string[],
    { signal, security, lookup = dnsLookup }: { signal?: AbortSignal; security?: ResearchSecurity; lookup?: LookupFn } = {},
  ) {
    if (security) {
      for (const target of urls) {
        const verdict = await validateSourceUrl(target, security, lookup);
        if (!verdict.ok) throw new ResearchClientError(`Blocked crawl target: ${verdict.reason}`);
      }
    }

    const init: RequestInit = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        urls,
        max_redirects: security?.maxRedirects,
        timeout_ms: security?.requestTimeoutMs,
        max_depth: security?.maxCrawlDepth,
        max_pages: security?.maxPagesPerCrawl,
        max_discovered_resources: security?.maxDiscoveredResources,
        max_resource_bytes: security?.maxResourceBytes,
      }),
    };
    if (signal) init.signal = signal;

    const response = await this.fetcher(new URL("/crawl", this.baseUrl), init).catch((error: unknown) => {
      throw new ResearchClientError(error instanceof Error ? error.message : "Crawl4AI network error", true);
    });
    if (!response.ok) throw new ResearchClientError(`Crawl4AI ${response.status}`, response.status >= 500);

    const body = await response.json() as { results?: unknown[]; data?: unknown[] };
    const results = Array.isArray(body.results) ? body.results : body.data;
    if (!Array.isArray(results)) throw new ResearchClientError("Crawl4AI response missing results");

    const pages = results.flatMap(normalizeCrawledPage);
    if (!security) return pages;

    for (const page of pages) {
      await assertSafeCrawledPage(page, security, lookup);
    }
    return pages;
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

const pickStringArray = (value: unknown, keys: string[]) => {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (Array.isArray(record[key])) return (record[key] as unknown[]).filter((item): item is string => typeof item === "string");
  }
  return [];
};

const pickNumber = (value: unknown, keys: string[]) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "number" && Number.isFinite(record[key])) return record[key] as number;
  }
  return null;
};

const normalizeCrawledPage = (item: unknown): CrawledPage[] => {
  if (!item || typeof item !== "object") return [];
  const page = item as Record<string, unknown>;
  const url = typeof page.url === "string" ? page.url : "";
  const markdown = pickString(page.markdown, ["raw_markdown", "markdown", "fit_markdown"]) || pickString(page.content, []);
  if (!url || !markdown) return [];
  const metadata = page.metadata && typeof page.metadata === "object" ? page.metadata as Record<string, unknown> : {};
  const media = page.media && typeof page.media === "object" ? page.media as Record<string, unknown> : {};
  const redirectChain = pickStringArray(page, ["redirect_chain", "redirectChain", "redirects"]);
  const resolvedAddresses = [
    ...pickStringArray(page, ["resolved_ips", "resolvedIps", "ip_addresses", "ipAddresses"]),
    ...pickStringArray(metadata, ["resolved_ips", "resolvedIps", "ip_addresses", "ipAddresses"]),
  ];
  return [{
    url,
    finalUrl: typeof page.final_url === "string" ? page.final_url : typeof page.finalUrl === "string" ? page.finalUrl : url,
    title: typeof metadata.title === "string" ? metadata.title : typeof page.title === "string" ? page.title : null,
    markdown,
    mimeType: typeof page.mime_type === "string" ? page.mime_type : "text/markdown",
    byteLength: Buffer.byteLength(markdown),
    links: Array.isArray(page.links) ? page.links.filter((link): link is string => typeof link === "string") : [],
    resolvedAddresses: [...new Set(resolvedAddresses)],
    redirectCount: pickNumber(page, ["redirect_count", "redirectCount"]) ??
      (redirectChain.length > 1 ? redirectChain.length - 1 : redirectChain.length === 1 ? 0 : null),
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

const assertSafeCrawledPage = async (page: CrawledPage, security: ResearchSecurity, lookup: LookupFn) => {
  const original = await validateSourceUrl(page.url, security, lookup);
  if (!original.ok) throw new ResearchClientError(`Blocked crawl response URL: ${original.reason}`);

  const final = await validateSourceUrl(page.finalUrl, security, lookup);
  if (!final.ok) throw new ResearchClientError(`Blocked crawl final URL: ${final.reason}`);

  if (page.redirectCount !== null && page.redirectCount > security.maxRedirects) {
    throw new ResearchClientError(`Blocked crawl redirect chain: ${page.redirectCount}`);
  }

  if (!security.allowedMimeTypes.includes(page.mimeType)) {
    throw new ResearchClientError(`Blocked crawl MIME type: ${page.mimeType}`);
  }

  if (page.byteLength > security.maxResourceBytes) {
    throw new ResearchClientError(`Blocked crawl size: ${page.byteLength}`);
  }

  if (page.resolvedAddresses.length > 0 && page.resolvedAddresses.some((address) => isForbiddenAddress(address))) {
    throw new ResearchClientError("Blocked crawl resolved address: forbidden_address");
  }
};

export const normalizeUrl = (value: string) => {
  const url = new URL(value);
  url.hash = "";
  url.searchParams.sort();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) url.port = "";
  return url.toString();
};

export const validateSourceUrl = async (
  value: string,
  security: ResearchSecurity,
  lookup: LookupFn = dnsLookup,
): Promise<SourceUrlVerdict> => {
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
    throw new ResearchClientError(`DNS lookup failed for ${url.hostname}`, true);
  });
  const resolvedAddresses = [...new Set(addresses.map((address) => address.address))];
  if (resolvedAddresses.length === 0) return { ok: false, reason: "unresolved_host" };

  return resolvedAddresses.some((address) => isForbiddenAddress(address))
    ? { ok: false, reason: "forbidden_address" }
    : { ok: true, normalizedUrl: normalizeUrl(url.toString()), resolvedAddresses };
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
